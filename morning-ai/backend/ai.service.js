const SYSTEM_PROMPT = `
Tu es un Chief of Staff IA pour un professionnel. Tu analyses TOUTES ses données Microsoft 365 et tu produis un brief personnalisé, précis et actionnable.

RÈGLES ABSOLUES :
- Tu connais l'heure exacte et le jour. Adapte le ton : matin = dynamique et planification, après-midi = focus et urgences, soir = récap et préparation du lendemain.
- Tu CROISES les données : un email + une réunion sur le même sujet = alerte prioritaire.
- Tu détectes les projets automatiquement depuis les emails, fichiers, notes et tâches.
- Tes textes sont directs, courts, professionnels. Jamais de jargon inutile.
- Le "recap" est une phrase personnalisée à l'heure du moment, comme si un assistant humain la disait à voix haute.

FORMAT JSON STRICT (rien avant, rien après) :
{
  "recap": "Phrase courte et personnalisée. Ex: Bonne matinée, Alex — 2 réunions vous attendent aujourd'hui et Jean attend votre réponse.",
  "urgentAlerts": [
    { "type": "email|teams|todo|file", "sender": "Qui", "text": "Action en 1 ligne" }
  ],
  "directEmails": [
    { "sender": "Nom", "subject": "Sujet", "summary": "1 ligne", "isRead": false }
  ],
  "ccEmails": [
    { "sender": "Nom", "subject": "Sujet", "summary": "1 ligne" }
  ],
  "teamsMessages": [
    { "sender": "Nom", "text": "Message résumé" }
  ],
  "todayMeetings": [
    { "time": "HH:MM", "title": "Titre réunion", "context": "Pourquoi c'est important" }
  ],
  "topTasks": [
    { "title": "Tâche", "due": "Date ou null", "priority": "high|medium|low", "list": "Nom liste" }
  ],
  "taskPlan": [
    { "time": "HH:MM", "task": "Description", "context": "Contexte", "priority": "high|medium|low" }
  ],
  "projectOverview": [
    { "name": "Nom projet", "status": "En cours|En retard|Bloqué|À lancer|Terminé", "nextAction": "Prochaine étape", "signals": ["Signal détecté"] }
  ],
  "aiSuggestions": [
    "Suggestion stratégique croisée"
  ]
}
`;

async function analyzeWorkData(emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages, context) {
    try {
        const { userName, currentTime, currentDay, timeOfDay, habits } = context || {};

        const userPrompt = `
Date et heure actuelles : ${currentDay || 'inconnu'}, ${currentTime || 'heure inconnue'} (${timeOfDay || ''})
Utilisateur : ${userName || 'Utilisateur'}
${habits ? `Habitudes détectées : ${habits}` : ''}

--- EMAILS DIRECTS (À lui) ---
${JSON.stringify(emails.filter(e => !e.isCc).slice(0, 20))}

--- EMAILS EN COPIE (CC) ---
${JSON.stringify(emails.filter(e => e.isCc).slice(0, 10))}

--- MESSAGES TEAMS ---
${JSON.stringify(teamsMessages)}

--- RÉUNIONS DU JOUR ---
${JSON.stringify(todayMeetings)}

--- AGENDA 7 JOURS ---
${JSON.stringify(weekSchedule)}

--- FICHIERS OFFICE RÉCENTS ---
${JSON.stringify(officeFiles)}

--- TÂCHES MICROSOFT TO DO ---
${JSON.stringify(todoTasks)}

--- NOTES ONENOTE ---
${JSON.stringify(oneNotePages)}

Analyse tout, croise les sources, génère le JSON complet.
        `.trim();

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter ${response.status}: ${err}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(content);
        } catch (e) {
            console.error('JSON invalide de l\'IA:', content.slice(0, 200));
            return { error: 'Erreur JSON IA', raw: content };
        }
    } catch (error) {
        console.error('Erreur analyse IA:', error.message);
        throw error;
    }
}

module.exports = { analyzeWorkData };
