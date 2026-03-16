require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { analyzeWorkData } = require('./ai.service');
const { supabase } = require('./supabase');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- ROUTES API ---

app.get('/api/test', (req, res) => {
  res.json({ message: 'Serveur Morning-AI en ligne et fonctionnel !', timestamp: new Date() });
});

const { getRecentEmails, getTodaySchedule, getTeamsMessages } = require('./graph.service');

// Nouvelle route d'analyse IA "OneWork" avec VRAIES données via Token Microsoft
app.post('/api/analyze', async (req, res) => {
  try {
    const { accessToken, email = "demo@onework.app", name = "Utilisateur" } = req.body;
    
    if (!accessToken) {
        return res.status(401).json({ success: false, error: "Jeton d'accès Microsoft (accessToken) manquant."});
    }

    // 1. Trouver ou créer l'utilisateur dans Supabase (Identité)
    let { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
    if (!user) {
        // Création du profil si inexistant
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{ email, name }])
            .select()
            .single();
            
        if (!createError) user = newUser;
    }

    console.log(`📡 Graph API: Téléchargement des données Microsoft pour ${name}...`);
    
    // 2. Extraire les vraies données depuis Microsoft 365 (via le token de l'app Electron)
    const [realEmails, realSchedule, realTeams, realExcel] = await Promise.all([
        getRecentEmails(accessToken),
        getTodaySchedule(accessToken),
        getTeamsMessages(accessToken),
        getRecentExcelData(accessToken)
    ]);
    
    console.log(`✅ Récupéré: ${realEmails.length} Mails, ${realSchedule.length} Events, ${realTeams.length} Chats, ${realExcel.length} Tableurs Excel.`);

    // 3. Appel à notre "Executive Assistant" Gemini via OpenRouter avec les VRAIES DONNÉES !
    const analysis = await analyzeWorkData(realEmails, realTeams, realSchedule, realExcel);
    
    if (analysis.error) {
       return res.status(500).json({ success: false, error: analysis.error });
    }

    // 4. Sauvegarde de l'analyse dans Supabase (table daily_briefs)
    if (user) {
        await supabase
            .from('daily_briefs')
            .insert([{
                user_id: user.id,
                urgent_alerts: analysis.urgentAlerts || [],
                priority_emails: analysis.priorityEmails || [],
                ai_suggestions: analysis.aiSuggestions || [] // Inclus les tâches Excel/Agenda !
            }]);
    }

    // 5. On retourne l'analyse + les données brutes extraites au FrontEnd
    res.json({
        success: true,
        data: analysis,
        rawCounts: {
            emails: realEmails.length,
            events: realSchedule.length,
            chats: realTeams.length,
            excel: realExcel.length
        }
    });

  } catch (error) {
    console.error("Erreur serveur lors de l'analyse M365:", error);
    res.status(500).json({ success: false, error: "Erreur interne Microsoft Graph ou IA." });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Morning AI Backend is running ⚡' });
});

app.get('/api/daily-brief', (req, res) => {
  // L'ancienne route mockée (pour rétrocompatibilité de l'AssistivTouch pendant le DEV)
  res.json({
    date: new Date().toISOString(),
    alert: { type: 'Urgent', message: 'Valider le MVP' },
    meetings: [],
    tasks: []
  });
});

app.listen(port, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
  console.log('API "OneWork Intelligence" prête avec Supabase.');
});
