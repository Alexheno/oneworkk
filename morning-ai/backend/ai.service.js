const SYSTEM_PROMPT = `
Tu es un Chief of Staff IA ultra-intelligent. Tu reçois TOUTES les données de travail d'un utilisateur (peu importe son métier) et tu dois comprendre en profondeur ce qu'il fait, où il en est, ce qui est urgent, et comment organiser sa journée et sa semaine de façon optimale.

**TON OBJECTIF :**
1. Comprendre le métier et le contexte de l'utilisateur à partir de ses données (pas besoin qu'il te le dise)
2. Identifier les projets en cours, leur état d'avancement et les blocages
3. Croiser TOUTES les sources (mails + Teams + agenda + To Do + OneNote + fichiers Office) pour détecter des liens entre elles
4. Produire un plan d'action concret, priorisé et personnalisé pour sa journée

**RÈGLES D'ANALYSE :**
- Un mail sans réponse depuis 24h + une réunion sur ce sujet aujourd'hui = URGENT
- Une tâche To Do en retard + un mail sur ce projet = alerte croisée
- Un fichier PowerPoint récent + une réunion aujourd'hui = probablement une présentation à préparer
- Un fichier Word récent = rapport/document en cours, cherche le contexte dans les mails
- Des notes OneNote récentes = sujets actifs sur lesquels l'utilisateur travaille
- Des cases vides dans Excel = données manquantes, potentiellement bloquantes

**FORMAT DE RÉPONSE OBLIGATOIRE (JSON STRICT, aucun texte avant ou après) :**
{
  "urgentAlerts": [
    { "type": "email|teams|todo|calendar|file", "sender": "Qui", "text": "Action requise en 1 ligne" }
  ],
  "priorityEmails": [
    { "sender": "Nom", "subject": "Sujet", "summary": "1 ligne" }
  ],
  "taskPlan": [
    { "time": "09:00", "task": "Description de la tâche", "context": "Pourquoi maintenant (ex: réunion à 10h, mail de relance reçu)", "priority": "high|medium|low", "source": "todo|email|calendar|file" }
  ],
  "projectOverview": [
    { "name": "Nom du projet détecté", "status": "En cours|En retard|Bloqué|À lancer", "nextAction": "Prochaine étape concrète", "signals": ["Signal 1 qui a permis de détecter ce projet"] }
  ],
  "aiSuggestions": [
    "Suggestion stratégique croisée (ex: Ton fichier Budget_Q2.xlsx n'a pas été mis à jour depuis 5 jours et tu as une réunion finances demain — à traiter ce soir.)"
  ]
}
`;

async function analyzeWorkData(emails, teams, schedule, officeFiles, todoTasks, oneNotePages) {
    try {
        const userPrompt = `
Voici l'ensemble des données de travail de l'utilisateur. Analyse-les en profondeur et en croisant toutes les sources.

--- EMAILS (30 derniers, du plus récent au plus ancien) ---
${JSON.stringify(emails)}

--- MESSAGES TEAMS ---
${JSON.stringify(teams)}

--- AGENDA (aujourd'hui + 7 jours) ---
${JSON.stringify(schedule)}

--- FICHIERS OFFICE RÉCENTS (Excel, Word, PowerPoint) ---
${JSON.stringify(officeFiles)}

--- TÂCHES MICROSOFT TO DO (non terminées) ---
${JSON.stringify(todoTasks)}

--- NOTES ONENOTE RÉCENTES ---
${JSON.stringify(oneNotePages)}

Maintenant :
1. Identifie le métier et le contexte de cet utilisateur
2. Détecte les projets actifs en croisant les sources
3. Produis le plan d'action du jour avec des horaires réalistes
4. Remonte les alertes critiques issues de croisements de données
5. Retourne UNIQUEMENT le JSON attendu, sans texte autour.
        `.trim();

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`OpenRouter Error ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        let content = data.choices[0].message.content;
        content = content.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(content);
        } catch (e) {
            console.error("L'IA n'a pas retourné un JSON valide. Brut :", content);
            return { error: "Erreur JSON IA", raw: content };
        }

    } catch (error) {
        console.error("Erreur d'analyse IA:", error);
        throw error;
    }
}

module.exports = { analyzeWorkData };
