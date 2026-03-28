'use strict';
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto  = require('crypto');

const { analyzeWorkData }                             = require('./ai.service');
const { supabase }                                    = require('./supabase');
const {
    getRecentEmails, getTodayMeetings, getWeekSchedule,
    getTeamsMessages, getRecentOfficeFiles, getToDoTasks, getOneNotePages,
} = require('./graph.service');
const { processAgentMessage, executeAgentAction, generateMorningScript } = require('./agent.service');

// ─── App Init ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,  // API — pas de HTML servi
    crossOriginEmbedderPolicy: false,
}));

// CORS : restreint aux origines connues
const ALLOWED_ORIGINS = [
    'https://onework.app',
    'https://oneworkk-production.up.railway.app',
    'http://localhost:3000',
    'http://localhost:5173',
];
app.use(cors({
    origin: (origin, callback) => {
        // Electron et Railway n'envoient pas d'origin — on les accepte
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origine non autorisée: ${origin}`));
    },
    methods:     ['GET', 'POST'],
    credentials: false,
}));

// Body size limit — évite les abus de payload
app.use(express.json({ limit: '512kb' }));

// ─── Request ID + Logging ─────────────────────────────────────────────────────
app.use((req, _res, next) => {
    req.id      = crypto.randomBytes(6).toString('hex');
    req.startMs = Date.now();
    console.log(`[${req.id}] → ${req.method} ${req.path}`);
    next();
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
    windowMs:         60 * 1000,   // 1 minute
    max:              120,          // 120 req/min par IP
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { success: false, error: 'Trop de requêtes. Réessayez dans une minute.' },
});

const analysisLimiter = rateLimit({
    windowMs:         5 * 60 * 1000,  // 5 minutes
    max:              10,               // 10 analyses/5min par IP
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { success: false, error: 'Limite d\'analyses atteinte. Attendez 5 minutes.' },
});

const chatLimiter = rateLimit({
    windowMs:         60 * 1000,
    max:              30,
    standardHeaders:  true,
    legacyHeaders:    false,
    message:          { success: false, error: 'Trop de messages. Attendez une minute.' },
});

app.use(globalLimiter);

// ─── Validation helpers ───────────────────────────────────────────────────────
function requireToken(req, res) {
    if (!req.body?.accessToken || typeof req.body.accessToken !== 'string') {
        res.status(401).json({ success: false, error: 'Token Microsoft manquant ou invalide.' });
        return false;
    }
    if (req.body.accessToken.length < 20) {
        res.status(401).json({ success: false, error: 'Token trop court — invalide.' });
        return false;
    }
    return true;
}

function sanitizeString(val, maxLen = 200) {
    if (typeof val !== 'string') return '';
    return val.slice(0, maxLen).trim();
}

// ─── Logging réponse ──────────────────────────────────────────────────────────
function logResponse(req, statusCode) {
    const ms = Date.now() - req.startMs;
    console.log(`[${req.id}] ← ${statusCode} (${ms}ms)`);
}

// ─── GET /download ────────────────────────────────────────────────────────────
// Redirige vers le fichier .exe hébergé (configurable via env DOWNLOAD_URL)
app.get('/download', (_req, res) => {
    const url = process.env.DOWNLOAD_URL;
    if (!url) {
        return res.status(503).json({ error: 'Téléchargement temporairement indisponible.' });
    }
    res.redirect(302, url);
});

// ─── GET /update/latest.yml ──────────────────────────────────────────────────
// Sert les métadonnées de mise à jour pour electron-updater.
// Variables d'env requises : LATEST_VERSION, DOWNLOAD_URL, LATEST_SHA512, LATEST_SIZE
app.get('/update/latest.yml', (_req, res) => {
    const version  = process.env.LATEST_VERSION;
    const url      = process.env.DOWNLOAD_URL;
    const sha512   = process.env.LATEST_SHA512;
    const size     = process.env.LATEST_SIZE;

    if (!version || !url || !sha512 || !size) {
        return res.status(503).send('# Update feed not configured');
    }

    const yaml = [
        `version: ${version}`,
        `files:`,
        `  - url: ${url}`,
        `    sha512: ${sha512}`,
        `    size: ${size}`,
        `path: ${url}`,
        `sha512: ${sha512}`,
        `releaseDate: '${new Date().toISOString()}'`,
    ].join('\n');

    res.setHeader('Content-Type', 'application/x-yaml');
    res.send(yaml);
});

// ─── GET /api/status ──────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
    res.json({
        status:    'ok',
        service:   'OneWork Backend',
        version:   '2.0.0',
        timestamp: new Date().toISOString(),
    });
});

// ─── POST /api/analyze ────────────────────────────────────────────────────────
app.post('/api/analyze', analysisLimiter, async (req, res) => {
    if (!requireToken(req, res)) return;

    const {
        accessToken,
        email       = '',
        name        = 'Utilisateur',
        currentTime = '',
        currentDay  = '',
        timeOfDay   = '',
        habits      = null,
    } = req.body;

    const safeEmail   = sanitizeString(email,    150);
    const safeName    = sanitizeString(name,      100);
    const safeTime    = sanitizeString(currentTime, 10);
    const safeDay     = sanitizeString(currentDay,  60);
    const safeTimeDay = sanitizeString(timeOfDay,   20);
    const safeHabits  = habits ? sanitizeString(String(habits), 300) : null;

    console.log(`[${req.id}] Analyse M365 pour "${safeName}" (${safeDay} ${safeTime})`);

    try {
        // Upsert utilisateur Supabase (non-bloquant pour la réponse)
        const upsertUser = (async () => {
            if (!safeEmail) return null;
            try {
                const { data } = await supabase
                    .from('users')
                    .upsert({ email: safeEmail, name: safeName }, { onConflict: 'email' })
                    .select('id')
                    .single();
                return data;
            } catch (e) {
                console.warn(`[${req.id}] Supabase upsert user:`, e.message);
                return null;
            }
        })();

        // Fetch parallèle de toutes les données M365
        const [emails, todayMeetings, weekSchedule, teamsMessages, officeFiles, todoTasks, oneNotePages] =
            await Promise.all([
                getRecentEmails(accessToken, safeEmail),
                getTodayMeetings(accessToken),
                getWeekSchedule(accessToken),
                getTeamsMessages(accessToken),
                getRecentOfficeFiles(accessToken),
                getToDoTasks(accessToken),
                getOneNotePages(accessToken),
            ]);

        console.log(
            `[${req.id}] M365 récupéré — emails:${emails.length} réunions:${todayMeetings.length} ` +
            `teams:${teamsMessages.length} tâches:${todoTasks.length} fichiers:${officeFiles.length}`
        );

        const context  = { userName: safeName, currentTime: safeTime, currentDay: safeDay, timeOfDay: safeTimeDay, habits: safeHabits };
        const analysis = await analyzeWorkData(emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages, context);

        // Script matinal + save Supabase en parallèle (non-bloquants)
        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const [morningScript, user] = await Promise.all([
            generateMorningScript({
                name:     safeName || 'vous',
                date:     dateStr,
                emails:   emails.slice(0, 5).map(e => ({ sender: e.sender, subject: e.subject, isUrgent: e.isUrgent })),
                meetings: todayMeetings.map(m => ({ title: m.title, time: m.time || m.start })),
                tasks:    todoTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority })),
            }).catch(e => { console.warn(`[${req.id}] MorningScript:`, e.message); return null; }),
            upsertUser,
        ]);

        // Save brief en base (fire-and-forget)
        if (user?.id) {
            supabase.from('daily_briefs').insert([{
                user_id:        user.id,
                urgent_alerts:  analysis.urgentAlerts  || [],
                priority_emails: analysis.directEmails || [],
                ai_suggestions: analysis.aiSuggestions || [],
            }]).then(({ error }) => {
                if (error) console.warn(`[${req.id}] Supabase brief:`, error.message);
            });
        }

        logResponse(req, 200);
        res.json({
            success:      true,
            data:         analysis,
            morningScript,
            rawCounts: {
                emails:       emails.length,
                directEmails: emails.filter(e => !e.isCc).length,
                ccEmails:     emails.filter(e => e.isCc).length,
                meetings:     todayMeetings.length,
                teams:        teamsMessages.length,
                tasks:        todoTasks.length,
                files:        officeFiles.length,
            },
            // IDs pour les actions de l'agent
            rawData: {
                emails:   emails.slice(0, 12).map(e => ({ id: e.id, sender: e.sender, senderEmail: e.senderEmail, subject: e.subject, isRead: e.isRead })),
                meetings: todayMeetings.map(m => ({ id: m.id, title: m.title, start: m.start })),
                tasks:    todoTasks.slice(0, 12).map(t => ({ id: t.id, title: t.title, list: t.list })),
            },
        });

    } catch (err) {
        logResponse(req, 500);
        console.error(`[${req.id}] /api/analyze:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/chat ───────────────────────────────────────────────────────────
app.post('/api/chat', chatLimiter, async (req, res) => {
    if (!requireToken(req, res)) return;

    const { accessToken, message, conversationHistory, context, executeAction } = req.body;

    // Cas 1 : Exécution d'une action confirmée
    if (executeAction) {
        const { type } = executeAction;
        if (!type) return res.status(400).json({ success: false, error: 'Action sans type.' });

        console.log(`[${req.id}] Execute action: ${type}`);
        try {
            const result = await executeAgentAction(executeAction, accessToken);
            logResponse(req, 200);
            return res.json({ success: true, executed: true, result });
        } catch (err) {
            logResponse(req, 500);
            console.error(`[${req.id}] executeAction:`, err.message);
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Cas 2 : Message conversationnel
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ success: false, error: 'Message vide.' });
    }

    const safeMessage = sanitizeString(message, 1000);

    // Valide et limite l'historique
    const history = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter(m => m.role && typeof m.content === 'string')
            .slice(-14)
        : [];

    console.log(`[${req.id}] Chat: "${safeMessage.slice(0, 60)}…"`);

    try {
        const agentResponse = await processAgentMessage(safeMessage, history, context);
        logResponse(req, 200);
        res.json({ success: true, ...agentResponse });
    } catch (err) {
        logResponse(req, 500);
        console.error(`[${req.id}] /api/chat:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/morning-brief ──────────────────────────────────────────────────
app.post('/api/morning-brief', async (req, res) => {
    if (!requireToken(req, res)) return;

    const { accessToken, email = '', name = 'vous' } = req.body;

    try {
        const [emails, todayMeetings, todoTasks] = await Promise.all([
            getRecentEmails(accessToken, sanitizeString(email, 150)),
            getTodayMeetings(accessToken),
            getToDoTasks(accessToken),
        ]);

        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const script  = await generateMorningScript({
            name:     sanitizeString(name, 60) || 'vous',
            date:     dateStr,
            emails:   emails.slice(0, 5).map(e => ({ sender: e.sender, subject: e.subject, isUrgent: e.isUrgent })),
            meetings: todayMeetings.map(m => ({ title: m.title, time: m.time || m.start })),
            tasks:    todoTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority })),
        });

        logResponse(req, 200);
        res.json({ success: true, script });
    } catch (err) {
        logResponse(req, 500);
        console.error(`[${req.id}] /api/morning-brief:`, err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── POST /api/tts ────────────────────────────────────────────────────────────
app.post('/api/tts', async (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Champ "text" requis.' });
    }
    if (text.length > 4096) {
        return res.status(400).json({ error: 'Texte trop long (max 4096 caractères).' });
    }
    if (!process.env.OPENAI_API_KEY) {
        console.error('[TTS] OPENAI_API_KEY manquante');
        return res.status(503).json({ error: 'Service TTS non configuré.' });
    }

    console.log(`[${req.id}] TTS: ${text.length} chars`);

    try {
        const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1-hd',
                voice: 'nova',
                input: text,
                speed: 0.95,
            }),
        });

        if (!ttsRes.ok) {
            const errText = await ttsRes.text().catch(() => '');
            console.error(`[${req.id}] TTS OpenAI ${ttsRes.status}:`, errText.slice(0, 200));
            return res.status(502).json({ error: `TTS: ${ttsRes.status}` });
        }

        const buffer = Buffer.from(await ttsRes.arrayBuffer());
        console.log(`[${req.id}] TTS ok: ${buffer.length} bytes`);

        res.setHeader('Content-Type',   'audio/mpeg');
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control',  'private, max-age=3600');
        res.send(buffer);

    } catch (err) {
        logResponse(req, 500);
        console.error(`[${req.id}] /api/tts:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─── Error Handler Global ────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error(`[${req.id || 'unknown'}] Erreur non gérée:`, err.message);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur.' });
});

// 404
app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route introuvable.' });
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
    console.log(`🚀 OneWork Backend v2 · port ${PORT}`);
    console.log(`   Rate limits: 120/min global · 10/5min analyze · 30/min chat`);
});

function gracefulShutdown(signal) {
    console.log(`\n[Server] ${signal} reçu — arrêt propre...`);
    server.close(() => {
        console.log('[Server] Connexions fermées. Bye.');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
