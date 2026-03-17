require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { analyzeWorkData } = require('./ai.service');
const { supabase } = require('./supabase');
const { getRecentEmails, getTodayMeetings, getWeekSchedule, getTeamsMessages, getRecentOfficeFiles, getToDoTasks, getOneNotePages } = require('./graph.service');

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
            }
        });

    } catch (error) {
        console.error('Erreur /api/analyze:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 OneWork Backend sur port ${port}`);
});
