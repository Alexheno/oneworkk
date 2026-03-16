// ai.service.js
// Utilisation de l'API REST native via fetch pour éviter les erreurs SDK d'importation

const SYSTEM_PROMPT = `
Tu es l'Executive Assistant d'un dirigeant très occupé. Ton rôle est d'analyser ses e-mails, ses messages Teams, son agenda de la journée MAIS AUSSI le contenu de ses fichiers Excel récemment modifiés.
Tu dois lui restituer une vision synthétique, priorisée et 100% orientée action.

**RÈGLES D'ANALYSE AVANCÉE :**
1. **Identifie les actions cachées** : Scrute l'agenda (réunions à préparer ?) et les fichiers Excel (y a-t-il des KPIs en baisse, des cases vides, des tâches en retard dans un planning Excel ?).
2. **Priorise (URGENT vs NORMAL)** : Ce qui demande une action immédiate est MAJEUR. (Ex: Un mail de relance pour la réunion d'aujourd'hui).
3. **Soit hyper concis** : Écris de manière "Bento Grid". Des bullet points très courts, clairs et professionnels.

**FORMAT DE RÉPONSE OBLIGATOIRE (JSON STRICT) :**
Tu dois EXCLUSIVEMENT répondre sous ce format JSON (aucun texte d'explication avant ni après) :
{
  "urgentAlerts": [
    { "type": "teams", "sender": "Nom/Personne", "text": "Résumé très bref de l'action requise" },
    { "type": "global", "sender": "Fichier Excel X", "text": "Le CA est en baisse au Q3, ou Tâche Y en retard" }
  ],
  "priorityEmails": [
    { "sender": "Nom", "subject": "Sujet du mail", "summary": "1 ligne de résumé" }
  ],
  "aiSuggestions": [
    "Une suggestion stratégique globale (ex: Vous avez un Point Investisseur à 11h, n'oubliez pas de mettre à jour le fichier Excel Q3 vu les derniers emails)."
  ]
}
`;

async function analyzeWorkData(rawEmails, rawTeamsMessages, schedule, excelData) {
  try {
    const userPrompt = `
      Voici le dump des données de la journée :
      
      -- EMAILS (20 derniers) --
      ${JSON.stringify(rawEmails)}
      
      -- TEAMS (Derniers chats) --
      ${JSON.stringify(rawTeamsMessages)}
      
      -- AGENDA DU JOUR --
      ${JSON.stringify(schedule)}
      
      -- FICHIERS EXCEL RECENTS (Nom + Aperçu du contenu actuel) --
      ${JSON.stringify(excelData)}
      
      Analyse ces données croisées, trouve les conflits, les retards, les préparations nécessaires et renvoie UNIQUEMENT le JSON attendu.
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash-lite", // Le modèle de compet' choisi
        "messages": [
          { "role": "system", "content": SYSTEM_PROMPT },
          { "role": "user", "content": userPrompt }
        ]
      })
    });

    if (!response.ok) {
       const errBody = await response.text();
       throw new Error(`OpenRouter Error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Nettoyage au cas où l'IA retourne des balises Markdown ```json ... ```
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
        const parsedData = JSON.parse(content);
        return parsedData;
    } catch(e) {
        console.error("L'IA n'a pas retourné un JSON valide. Brut :", content);
        return { error: "Erreur JSON IA", raw: content };
    }

  } catch (error) {
    console.error("Erreur d'analyse IA:", error);
    throw error;
  }
}

module.exports = { analyzeWorkData };
