'use strict';
require('dotenv').config();

const { callLLM, parseJSON, MODELS } = require('./llm.service');

// ─── System Prompt Agent ──────────────────────────────────────────────────────
// OneWork365 est un agent conversationnel précis, rapide, qui agit comme un vrai
// Chief of Staff. Il comprend l'intent, répond court, et exécute avec soin.
const AGENT_SYSTEM = `Tu es OneWork365, le Chief of Staff IA intégré à l'application OneWork365.

PERSONNALITÉ : Direct, précis, professionnel. Jamais robotique. Toujours utile.
LANGUE : Français uniquement.
FORMAT : JSON strictement valide — aucun markdown, aucun texte avant/après.

═══ CAPACITÉS ═══
LECTURE    : emails, réunions, tâches, messages Teams, fichiers, notes, agenda
RÉDACTION  : emails, réponses, brouillons, résumés
ACTIONS    : envoyer email, répondre email, créer tâche, marquer email lu
ANALYSE    : résumer un projet, identifier urgences, croiser les données M365

═══ RÈGLES ABSOLUES ═══
1. JSON valide UNIQUEMENT — jamais de texte hors JSON
2. "response" : max 3 phrases — direct et actionnable
3. Actions irréversibles (envoyer, supprimer) → needsConfirmation: true OBLIGATOIRE
4. Utilise les vraies données M365 fournies (noms exacts, sujets réels, heures réelles)
5. Si l'information n'est pas dans le contexte M365 → dis-le clairement
6. Ne jamais inventer d'emails, de réunions ou de tâches
7. EMAILS : utilise TOUJOURS l'adresse exacte fournie dans le contexte. Si l'utilisateur dit "moi" ou "myself", utilise l'adresse USER_EMAIL du contexte. Ne jamais générer une adresse fictive comme "moi@..." ou "exemple@..."

═══ FORMAT DE RÉPONSE ═══
Cas standard :
{
  "intent": "read|compose|action|analyze",
  "response": "Réponse naturelle courte",
  "needsConfirmation": false,
  "confirmText": null,
  "action": null
}

Cas action avec confirmation :
{
  "intent": "action",
  "response": "Je vais [action]. Voulez-vous confirmer ?",
  "needsConfirmation": true,
  "confirmText": "Résumé en 1 ligne de ce qui sera fait",
  "action": {
    "type": "sendEmail|replyEmail|createTask|markEmailRead|forwardEmail",
    "params": {
      "to": "email@exemple.com",
      "subject": "Sujet",
      "body": "Corps du message",
      "messageId": "ID si reply/markRead",
      "title": "Titre si tâche",
      "notes": "Notes si tâche"
    }
  }
}`;

// ─── Gestion de l'historique ──────────────────────────────────────────────────
// Limiter l'historique pour rester dans la fenêtre de contexte
const MAX_HISTORY_TURNS = 12;  // 6 échanges user/assistant

function trimHistory(history) {
    if (!Array.isArray(history)) return [];
    // Garde les N derniers messages (pairs user/assistant)
    return history.slice(-MAX_HISTORY_TURNS);
}

// ─── Formatage du contexte M365 ───────────────────────────────────────────────
function formatM365Context(m365Context) {
    if (!m365Context) return '';

    const lines = ['CONTEXTE M365 ACTUEL (données réelles) :'];

    if (m365Context.userEmail) {
        lines.push(`\nUSER_EMAIL (adresse réelle de l'utilisateur) : ${m365Context.userEmail}`)
        lines.push('→ Utilise cette adresse quand l\'utilisateur dit "moi", "myself", "mon adresse", etc.');
    }

    const emails = (m365Context.directEmails || []).slice(0, 10);
    if (emails.length) {
        lines.push(`\nEMAILS DIRECTS (${emails.length}) :`);
        emails.forEach(e => lines.push(`  • [${e.isRead ? 'lu' : 'NON LU'}] ${e.sender} → "${e.subject}" : ${e.summary || ''}`));
    }

    const meetings = (m365Context.todayMeetings || []).slice(0, 8);
    if (meetings.length) {
        lines.push(`\nRÉUNIONS AUJOURD'HUI (${meetings.length}) :`);
        meetings.forEach(m => lines.push(`  • ${m.time} — ${m.title}${m.context ? ` (${m.context})` : ''}`));
    }

    const tasks = (m365Context.topTasks || []).slice(0, 8);
    if (tasks.length) {
        lines.push(`\nTÂCHES PRIORITAIRES (${tasks.length}) :`);
        tasks.forEach(t => lines.push(`  • [${t.priority}] ${t.title}${t.due ? ` — échéance: ${t.due}` : ''}`));
    }

    const projects = (m365Context.projectOverview || []).slice(0, 5);
    if (projects.length) {
        lines.push(`\nPROJETS ACTIFS (${projects.length}) :`);
        projects.forEach(p => lines.push(`  • ${p.name} [${p.status}] — ${p.nextAction}`));
    }

    const alerts = (m365Context.urgentAlerts || []).slice(0, 5);
    if (alerts.length) {
        lines.push(`\nALERTES URGENTES (${alerts.length}) :`);
        alerts.forEach(a => lines.push(`  ⚡ ${a.sender || a.type} : ${a.text}`));
    }

    // IDs pour les actions (email reply, markRead, etc.)
    if (m365Context.rawData) {
        const rawEmails = (m365Context.rawData.emails || []).slice(0, 10);
        if (rawEmails.length) {
            lines.push(`\nIDs EMAILS (pour actions) :`);
            rawEmails.forEach(e => lines.push(`  • ${e.sender} "${e.subject}" → id: ${e.id}`));
        }
    }

    // Screen-time local (tracker PowerShell)
    const st = m365Context.screenTime;
    if (st) {
        lines.push(`\nSCREEN-TIME AUJOURD'HUI (données locales, tracking auto) :`);
        lines.push(`  Score productivité : ${st.score ?? '?'}/100`);
        if (st.totals) {
            const sorted = Object.entries(st.totals)
                .sort(([,a],[,b]) => b - a)
                .slice(0, 8);
            sorted.forEach(([app, mins]) => {
                const h = Math.floor(mins / 60);
                const m = mins % 60;
                const dur = h > 0 ? `${h}h${m.toString().padStart(2,'0')}` : `${m}min`;
                lines.push(`  • ${app} : ${dur}`);
            });
        }
        if (st.apps && Object.keys(st.apps).length) {
            const cats = {};
            Object.values(st.apps).forEach(a => {
                if (!cats[a.category]) cats[a.category] = 0;
                cats[a.category] += a.minutes || 0;
            });
            const catStr = Object.entries(cats).sort(([,a],[,b]) => b-a)
                .map(([c, m]) => `${c}: ${m}min`).join(', ');
            lines.push(`  Catégories : ${catStr}`);
        }
    }

    return lines.join('\n');
}

// ─── Validation des paramètres d'action ───────────────────────────────────────
function validateAction(action) {
    if (!action || !action.type) return { valid: false, error: 'Action sans type' };
    const { type, params = {} } = action;

    const validTypes = ['sendEmail', 'replyEmail', 'createTask', 'markEmailRead', 'forwardEmail'];
    if (!validTypes.includes(type)) return { valid: false, error: `Type d'action inconnu: ${type}` };

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    switch (type) {
        case 'sendEmail':
        case 'forwardEmail':
            if (!params.to)               return { valid: false, error: 'Destinataire manquant (to)' };
            if (!EMAIL_RE.test(params.to)) return { valid: false, error: `Adresse email invalide : "${params.to}". Veuillez préciser l'adresse exacte.` };
            if (!params.subject)          return { valid: false, error: 'Sujet manquant (subject)' };
            if (!params.body)             return { valid: false, error: 'Corps manquant (body)' };
            break;
        case 'replyEmail':
            if (!params.messageId) return { valid: false, error: 'ID du message manquant (messageId)' };
            if (!params.body)      return { valid: false, error: 'Corps de réponse manquant (body)' };
            break;
        case 'createTask':
            if (!params.title) return { valid: false, error: 'Titre de tâche manquant (title)' };
            break;
        case 'markEmailRead':
            if (!params.messageId) return { valid: false, error: 'ID du message manquant (messageId)' };
            break;
    }

    return { valid: true };
}

// ─── processAgentMessage ──────────────────────────────────────────────────────
/**
 * Traite un message utilisateur et retourne la réponse structurée de l'agent.
 *
 * @param {string} message             - Message de l'utilisateur
 * @param {Array}  conversationHistory - Historique [{role, content}]
 * @param {Object} m365Context         - Contexte M365 (brief IA)
 * @returns {Promise<Object>}          - { intent, response, needsConfirmation, confirmText, action }
 */
async function processAgentMessage(message, conversationHistory, m365Context) {
    const ctxBlock    = formatM365Context(m365Context);
    const systemFull  = ctxBlock ? `${AGENT_SYSTEM}\n\n${ctxBlock}` : AGENT_SYSTEM;
    const trimmedHist = trimHistory(conversationHistory);

    const messages = [
        { role: 'system',    content: systemFull },
        ...trimmedHist,
        { role: 'user', content: message },
    ];

    let content;
    try {
        content = await callLLM(messages, { model: MODELS.AGENT, temperature: 0.25 });
    } catch (err) {
        console.error('[Agent] Erreur LLM:', err.message);
        throw err;
    }

    let parsed;
    try {
        parsed = parseJSON(content);
    } catch {
        // Fallback gracieux : traite la réponse brute comme du texte
        return {
            intent:            'read',
            response:          content.slice(0, 500),
            needsConfirmation: false,
            confirmText:       null,
            action:            null,
        };
    }

    // Valide l'action si présente
    if (parsed.action) {
        const validation = validateAction(parsed.action);
        if (!validation.valid) {
            console.warn('[Agent] Action invalide:', validation.error, parsed.action);
            return {
                intent:            'read',
                response:          parsed.response || 'Je n\'ai pas pu préparer cette action correctement. Pouvez-vous préciser ?',
                needsConfirmation: false,
                confirmText:       null,
                action:            null,
            };
        }
    }

    return {
        intent:            parsed.intent            || 'read',
        response:          parsed.response          || '',
        needsConfirmation: parsed.needsConfirmation || false,
        confirmText:       parsed.confirmText       || null,
        action:            parsed.action            || null,
    };
}

// ─── executeAgentAction ────────────────────────────────────────────────────────
/**
 * Exécute une action confirmée via Microsoft Graph.
 *
 * @param {Object} action       - { type, params }
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
async function executeAgentAction(action, accessToken) {
    const {
        sendEmailMessage,
        replyToEmail,
        createTodoTask,
        markEmailAsRead,
    } = require('./graph.service');

    const { type, params } = action;

    switch (type) {
        case 'sendEmail':
        case 'forwardEmail':
            return await sendEmailMessage(accessToken, params);
        case 'replyEmail':
            return await replyToEmail(accessToken, params.messageId, params.body);
        case 'createTask':
            return await createTodoTask(accessToken, { title: params.title, notes: params.notes });
        case 'markEmailRead':
            return await markEmailAsRead(accessToken, params.messageId);
        default:
            throw new Error(`Type d'action non supporté: ${type}`);
    }
}

// ─── generateMorningScript ────────────────────────────────────────────────────
/**
 * Génère un script vocal pour le brief matinal.
 * Conçu pour être lu à voix haute — naturel, fluide, chaleureux.
 *
 * @param {Object} m365Data - { name, date, emails, meetings, tasks }
 * @returns {Promise<string>} - Texte à lire à voix haute
 */
async function generateMorningScript(m365Data) {
    const { name = 'vous', date = '', emails = [], meetings = [], tasks = [] } = m365Data;

    // Sélectionne les données les plus pertinentes
    const urgentEmails   = emails.filter(e => e.isUrgent).slice(0, 2);
    const topEmails      = urgentEmails.length ? urgentEmails : emails.slice(0, 2);
    const todayMeetings  = meetings.slice(0, 3);
    const priorityTasks  = tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').slice(0, 2);
    const topTasks       = priorityTasks.length ? priorityTasks : tasks.slice(0, 2);

    const dataContext = JSON.stringify({ name, date, emails: topEmails, meetings: todayMeetings, tasks: topTasks });

    const prompt = `Tu es OneWork365, l'assistant vocal de l'application OneWork365. Génère un brief matinal à lire à voix haute par un TTS.

CONTRAINTES STRICTES :
• Maximum 120 mots (TTS limite)
• Phrase par phrase — pas de listes, pas de tirets, pas de markdown
• Ton chaleureux et naturel comme un vrai assistant personnel
• Cite les vrais noms, heures et sujets fournis
• Termine par une phrase d'encouragement courte

STRUCTURE :
1. Salutation avec prénom + jour (1 phrase)
2. Emails importants (max 2 — cite expéditeur + sujet en 1 phrase chacun)
3. Réunions du jour (cite heure + titre, max 2-3)
4. Tâche prioritaire si présente (max 1 phrase)
5. Phrase d'élan final

DONNÉES :
${dataContext}

Réponds UNIQUEMENT avec le texte à lire. Pas de JSON, pas de balises.`;

    try {
        const script = await callLLM(
            [{ role: 'user', content: prompt }],
            { model: MODELS.SCRIPT, temperature: 0.65 }
        );

        // Nettoyage basique : supprime tirets, astérisques, numéros de liste
        return script
            .replace(/^[-•*]\s*/gm, '')
            .replace(/^\d+\.\s*/gm, '')
            .replace(/\*\*/g, '')
            .trim();
    } catch (err) {
        console.error('[Agent] Erreur generateMorningScript:', err.message);
        throw err;
    }
}

module.exports = { processAgentMessage, executeAgentAction, generateMorningScript };
