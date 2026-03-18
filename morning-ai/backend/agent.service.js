require('dotenv').config();

const AGENT_SYSTEM = `Tu es Alex, le Chief of Staff IA de OneWork. Tu es concis, direct, précis. Tu parles uniquement français.

CAPACITÉS :
- Lire et analyser les données Microsoft 365 (emails, réunions, tâches, projets)
- Rédiger des emails, réponses, messages
- Exécuter des actions : envoyer email, créer tâche

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT en JSON valide, rien d'autre, pas de markdown
2. Maximum 2-3 phrases dans "response"
3. Actions irréversibles (envoyer email) → needsConfirmation: true
4. Utilise PRÉCISÉMENT les données M365 fournies (noms, sujets, heures réelles)

FORMAT JSON STRICT :
{
  "intent": "read|compose|action|analyze",
  "response": "Réponse naturelle courte",
  "needsConfirmation": false,
  "confirmText": null,
  "action": null
}

Si action avec confirmation :
{
  "intent": "action",
  "response": "Je vais faire X. Confirmer ?",
  "needsConfirmation": true,
  "confirmText": "Résumé action 1 ligne",
  "action": {
    "type": "sendEmail|createTask|replyEmail",
    "params": { "to": "email@ex.com", "subject": "...", "body": "..." }
  }
}`;

async function processAgentMessage(message, conversationHistory, m365Context) {
    try {
        const ctxStr = m365Context ? `
CONTEXTE M365 ACTUEL :
Emails directs récents : ${JSON.stringify((m365Context.directEmails || []).slice(0, 8))}
Réunions aujourd'hui : ${JSON.stringify(m365Context.todayMeetings || [])}
Tâches prioritaires : ${JSON.stringify((m365Context.topTasks || []).slice(0, 6))}
Projets : ${JSON.stringify((m365Context.projectOverview || []).slice(0, 5))}
Alertes urgentes : ${JSON.stringify(m365Context.urgentAlerts || [])}
Données brutes (IDs pour actions) : ${JSON.stringify(m365Context.rawData || {})}
` : '';

        const messages = [
            { role: 'system', content: AGENT_SYSTEM + '\n' + ctxStr },
            ...(conversationHistory || []),
            { role: 'user', content: message }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`OpenRouter ${response.status}: ${err}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content
            .replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            return JSON.parse(content);
        } catch {
            return { intent: 'read', response: content, needsConfirmation: false, action: null };
        }
    } catch (error) {
        console.error('Erreur agent:', error.message);
        throw error;
    }
}

async function executeAgentAction(action, accessToken) {
    const { sendEmailMessage, replyToEmail, createTodoTask } = require('./graph.service');
    const { type, params } = action;

    switch (type) {
        case 'sendEmail':
            return await sendEmailMessage(accessToken, params);
        case 'replyEmail':
            return await replyToEmail(accessToken, params.messageId, params.body);
        case 'createTask':
            return await createTodoTask(accessToken, params);
        default:
            throw new Error(`Action inconnue: ${type}`);
    }
}

module.exports = { processAgentMessage, executeAgentAction };
