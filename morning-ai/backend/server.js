require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { analyzeWorkData } = require('./ai.service');
const { supabase } = require('./supabase');
const { getRecentEmails, getTodayMeetings, getWeekSchedule, getTeamsMessages, getRecentOfficeFiles, getToDoTasks, getOneNotePages } = require('./graph.service');
const { processAgentMessage, executeAgentAction, generateMorningScript } = require('./agent.service');

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'OneWork Backend is running ⚡' });
});

app.post('/api/analyze', async (req, res) => {
    try {
        const { accessToken, email = 'demo@onework.app', name = 'Utilisateur', currentTime, currentDay, timeOfDay, habits } = req.body;

        if (!accessToken) return res.status(401).json({ success: false, error: 'Token Microsoft manquant.' });

        // Upsert utilisateur Supabase
        let { data: user } = await supabase.from('users').select('*').eq('email', email).single();
        if (!user) {
            const { data: newUser } = await supabase.from('users').insert([{ email, name }]).select().single();
            user = newUser;
        }

        console.log(`📡 Récupération données M365 pour ${name} (${currentDay} ${currentTime})...`);

        const [emails, todayMeetings, weekSchedule, teamsMessages, officeFiles, todoTasks, oneNotePages] = await Promise.all([
            getRecentEmails(accessToken, email),
            getTodayMeetings(accessToken),
            getWeekSchedule(accessToken),
            getTeamsMessages(accessToken),
            getRecentOfficeFiles(accessToken),
            getToDoTasks(accessToken),
            getOneNotePages(accessToken)
        ]);

        console.log(`✅ ${emails.length} emails, ${todayMeetings.length} réunions, ${teamsMessages.length} Teams, ${todoTasks.length} tâches`);

        const context = { userName: name, currentTime, currentDay, timeOfDay, habits };
        const analysis = await analyzeWorkData(emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages, context);

        if (analysis.error) return res.status(500).json({ success: false, error: analysis.error });

        // Sauvegarde Supabase
        if (user) {
            await supabase.from('daily_briefs').insert([{
                user_id: user.id,
                urgent_alerts: analysis.urgentAlerts || [],
                priority_emails: analysis.directEmails || [],
                ai_suggestions: analysis.aiSuggestions || []
            }]);
        }

        res.json({
            success: true,
            data: analysis,
            rawCounts: {
                emails: emails.length,
                directEmails: emails.filter(e => !e.isCc).length,
                ccEmails: emails.filter(e => e.isCc).length,
                meetings: todayMeetings.length,
                teams: teamsMessages.length,
                tasks: todoTasks.length,
                files: officeFiles.length
            },
            rawData: {
                emails: emails.slice(0, 10).map(e => ({ id: e.id, sender: e.sender, senderEmail: e.senderEmail, subject: e.subject })),
                meetings: todayMeetings.map(m => ({ id: m.id, title: m.title, start: m.start })),
                tasks: todoTasks.slice(0, 10).map(t => ({ title: t.title, list: t.list }))
            }
        });

    } catch (error) {
        console.error('Erreur /api/analyze:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { accessToken, message, conversationHistory, context, executeAction } = req.body;

        if (!accessToken) return res.status(401).json({ success: false, error: 'Token manquant.' });

        // Execute a confirmed action
        if (executeAction) {
            const result = await executeAgentAction(executeAction, accessToken);
            return res.json({ success: true, executed: true, result });
        }

        // Process chat message
        const agentResponse = await processAgentMessage(message, conversationHistory || [], context);
        res.json({ success: true, ...agentResponse });

    } catch (error) {
        console.error('Erreur /api/chat:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/morning-brief', async (req, res) => {
    try {
        const { accessToken, email, name } = req.body;
        if (!accessToken) return res.status(401).json({ success: false, error: 'Token manquant.' });

        const [emails, todayMeetings, todoTasks] = await Promise.all([
            getRecentEmails(accessToken, email || ''),
            getTodayMeetings(accessToken),
            getToDoTasks(accessToken)
        ]);

        const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        const script = await generateMorningScript({
            name: name || 'vous',
            date: dateStr,
            emails: emails.slice(0, 5).map(e => ({ sender: e.sender, subject: e.subject, isUrgent: e.isUrgent })),
            meetings: todayMeetings.map(m => ({ title: m.title, time: m.time || m.start })),
            tasks: todoTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority }))
        });

        res.json({ success: true, script });
    } catch (error) {
        console.error('Erreur /api/morning-brief:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 OneWork Backend sur port ${port}`);
});
