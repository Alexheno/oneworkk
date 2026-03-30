'use strict';

const { callLLM, parseJSON, smartSlice, MODELS } = require('./llm.service');

// ─── System Prompt ────────────────────────────────────────────────────────────
// Instruction au niveau enterprise : ton Chief of Staff IA cross-corrèle
// activement les données et produit un brief ultra-actionnable.
const SYSTEM_PROMPT = `Tu es le Chief of Staff IA de OneWork365 — l'équivalent d'un assistant exécutif
de niveau C-suite dans une entreprise Fortune 500. Tu analyses TOUTES les données Microsoft 365
simultanément pour produire un brief de direction ultra-précis.

═══ PRINCIPES D'ANALYSE ═══

CROSS-CORRÉLATION OBLIGATOIRE :
• Un email NON LU d'un client + une réunion demain avec ce client = ALERTE CRITIQUE (croise-les)
• Un email sur "Projet X" + un fichier "Projet X" modifié récemment = signal actif sur ce projet
• Une tâche en retard + des emails sur le même sujet = escalade probable, signaler
• Plusieurs emails non lus du même expéditeur = pattern d'escalade, urgence++
• Réunion sans préparation visible (pas de doc, pas d'email récent) = recommander préparation

SCORING PRIORITÉ :
• CRITIQUE : emails de CEO/DG/clients directs, délais aujourd'hui, réunions dans < 2h
• ÉLEVÉ    : emails non lus d'expéditeurs fréquents, tâches dues cette semaine
• MOYEN    : CC importants, réunions > 2 jours, tâches à venir
• FAIBLE   : newsletters, FYI, tâches sans échéance

DÉTECTION PROJETS (automatique) :
• Regroupe par fil commun : même nom dans emails + fichiers + réunions + tâches
• Déduit le statut réel : "En retard" si deadline dépassée ou emails d'urgence
• Identifie le next step le plus critique, pas juste une description générale

STYLE :
• Direct, factuel, professionnel — zéro jargon inutile
• Phrases courtes. Pas de "Il semblerait que" — dis "C'est le cas"
• Le "recap" est une phrase humaine naturelle (comme si ton assistant entrait dans ton bureau)
• Maximum 3 suggestions IA stratégiques — qualité > quantité

═══ FORMAT JSON STRICT ═══
Réponds UNIQUEMENT avec ce JSON valide, rien avant, rien après :

{
  "recap": "Phrase personnalisée courte. Ex: Bonne matinée — Martin attend votre réponse sur le contrat et vous avez 3 réunions dont une dans 45 min.",
  "urgentAlerts": [
    { "type": "email|teams|todo|calendar", "sender": "Nom ou source", "text": "Action en 1 ligne — soyez précis", "priority": "critical|high" }
  ],
  "directEmails": [
    { "sender": "Nom", "subject": "Sujet exact", "summary": "Ce qu'il veut en 1 ligne", "isRead": false, "isUrgent": false }
  ],
  "ccEmails": [
    { "sender": "Nom", "subject": "Sujet exact", "summary": "Contexte en 1 ligne" }
  ],
  "teamsMessages": [
    { "sender": "Nom", "text": "Message résumé en 1 ligne", "channel": "type de chat" }
  ],
  "todayMeetings": [
    { "time": "HH:MM", "title": "Titre exact", "context": "Pourquoi c'est stratégiquement important ou ce qu'il faut préparer", "isUrgent": false }
  ],
  "topTasks": [
    { "title": "Titre tâche", "due": "YYYY-MM-DD ou null", "priority": "high|medium|low", "list": "Nom liste", "overdue": false }
  ],
  "taskPlan": [
    { "time": "HH:MM", "task": "Description action concrète", "context": "Pourquoi maintenant", "priority": "high|medium|low" }
  ],
  "projectOverview": [
    { "name": "Nom projet", "status": "En cours|En retard|Bloqué|À lancer|Terminé", "nextAction": "Action précise et concrète", "signals": ["Signal 1", "Signal 2"] }
  ],
  "aiSuggestions": [
    "Suggestion stratégique croisée — cite les sources (email de X + réunion Y)"
  ]
}`;

// ─── Préparation des données ───────────────────────────────────────────────────
/**
 * Prépare et tronque les données M365 pour optimiser le contexte LLM.
 * Garde les données les plus pertinentes, évite le dépassement de fenêtre.
 */
function prepareDataForLLM({ emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages }) {
    // Emails directs : priorité aux non-lus et importants
    const directEmails = smartSlice(
        (emails || []).filter(e => !e.isCc).sort((a, b) => {
            const scoreA = (!a.isRead ? 2 : 0) + (a.importance === 'high' ? 1 : 0);
            const scoreB = (!b.isRead ? 2 : 0) + (b.importance === 'high' ? 1 : 0);
            return scoreB - scoreA;
        }),
        18, 'body', 250
    );

    // CC : seulement les non-lus/importants
    const ccEmails = smartSlice(
        (emails || []).filter(e => e.isCc).sort((a, b) => (!a.isRead ? -1 : 1)),
        8, 'body', 150
    );

    // Teams : messages récents
    const teams = smartSlice(teamsMessages || [], 15, 'text', 200);

    // Réunions aujourd'hui : toutes
    const meetings = smartSlice(todayMeetings || [], 15, 'description', 200);

    // Agenda 7 jours : résumé compact
    const schedule = smartSlice(weekSchedule || [], 25, null, 0);

    // Fichiers : sans les données Excel brutes (trop volumineuses) — juste meta
    const files = (officeFiles || []).slice(0, 8).map(f => ({
        fileName:     f.fileName,
        type:         f.type,
        lastModified: f.lastModified,
        // Si Excel, résumé des headers seulement
        tablePreview: f.tableData ? `${f.tableData.length} lignes, colonnes: ${JSON.stringify(f.tableData[0] || [])}` : undefined,
    }));

    // Tâches : priorité aux overdue et high
    const tasks = smartSlice(
        (todoTasks || []).sort((a, b) => {
            const scoreA = (a.importance === 'high' ? 2 : 0) + (a.due && new Date(a.due) < new Date() ? 3 : 0);
            const scoreB = (b.importance === 'high' ? 2 : 0) + (b.due && new Date(b.due) < new Date() ? 3 : 0);
            return scoreB - scoreA;
        }),
        25
    );

    // OneNote : titres seulement (contexte projet)
    const notes = (oneNotePages || []).slice(0, 12).map(p => ({
        title:        p.title,
        section:      p.section,
        lastModified: p.lastModified,
    }));

    return { directEmails, ccEmails, teams, meetings, schedule, files, tasks, notes };
}

// ─── Validation réponse ────────────────────────────────────────────────────────
/**
 * Valide et normalise la réponse JSON de l'IA.
 * Garantit que tous les champs requis existent avec le bon type.
 */
function validateAndNormalize(parsed) {
    const ensure = (val, fallback) => (val !== undefined && val !== null ? val : fallback);
    const ensureArray = val => (Array.isArray(val) ? val : []);

    return {
        recap:           ensure(parsed.recap, 'Analyse terminée.'),
        urgentAlerts:    ensureArray(parsed.urgentAlerts).slice(0, 10),
        directEmails:    ensureArray(parsed.directEmails).slice(0, 12),
        ccEmails:        ensureArray(parsed.ccEmails).slice(0, 8),
        teamsMessages:   ensureArray(parsed.teamsMessages).slice(0, 8),
        todayMeetings:   ensureArray(parsed.todayMeetings).slice(0, 10),
        topTasks:        ensureArray(parsed.topTasks).slice(0, 10),
        taskPlan:        ensureArray(parsed.taskPlan).slice(0, 12),
        projectOverview: ensureArray(parsed.projectOverview).slice(0, 8),
        aiSuggestions:   ensureArray(parsed.aiSuggestions).slice(0, 3),
    };
}

// ─── Fonction principale ───────────────────────────────────────────────────────
/**
 * Analyse complète des données M365 → brief exécutif IA.
 *
 * @param {Array}  emails
 * @param {Array}  teamsMessages
 * @param {Array}  weekSchedule
 * @param {Array}  todayMeetings
 * @param {Array}  officeFiles
 * @param {Array}  todoTasks
 * @param {Array}  oneNotePages
 * @param {Object} context       - { userName, currentTime, currentDay, timeOfDay, habits }
 * @returns {Promise<Object>}    - Brief structuré validé
 */
async function analyzeWorkData(emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages, context) {
    const { userName = 'Utilisateur', currentTime = '', currentDay = '', timeOfDay = '', habits } = context || {};

    const prepared = prepareDataForLLM({ emails, teamsMessages, weekSchedule, todayMeetings, officeFiles, todoTasks, oneNotePages });

    const userPrompt = `
Date et heure : ${currentDay}, ${currentTime} (${timeOfDay})
Utilisateur   : ${userName}
${habits ? `Habitudes détectées : ${habits}` : ''}

── EMAILS DIRECTS (À lui) ──────────────────────────────────────────────
${JSON.stringify(prepared.directEmails, null, 0)}

── EMAILS EN COPIE (CC) ────────────────────────────────────────────────
${JSON.stringify(prepared.ccEmails, null, 0)}

── MESSAGES TEAMS ──────────────────────────────────────────────────────
${JSON.stringify(prepared.teams, null, 0)}

── RÉUNIONS DU JOUR ────────────────────────────────────────────────────
${JSON.stringify(prepared.meetings, null, 0)}

── AGENDA 7 JOURS ──────────────────────────────────────────────────────
${JSON.stringify(prepared.schedule, null, 0)}

── FICHIERS OFFICE RÉCENTS ─────────────────────────────────────────────
${JSON.stringify(prepared.files, null, 0)}

── TÂCHES MICROSOFT TO DO ──────────────────────────────────────────────
${JSON.stringify(prepared.tasks, null, 0)}

── NOTES ONENOTE ───────────────────────────────────────────────────────
${JSON.stringify(prepared.notes, null, 0)}

INSTRUCTIONS :
1. CROISE ACTIVEMENT les sources (emails ↔ réunions ↔ fichiers ↔ tâches)
2. Identifie les patterns d'escalade et signaux faibles
3. Le taskPlan doit refléter la VRAIE journée de ${userName} aujourd'hui
4. Réponds UNIQUEMENT avec le JSON demandé, aucun texte autour
`.trim();

    let content;
    try {
        content = await callLLM(
            [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user',   content: userPrompt },
            ],
            { model: MODELS.ANALYSIS, temperature: 0.2 }
        );
    } catch (err) {
        console.error('[AI] Erreur LLM analyse:', err.message);
        throw err;
    }

    let parsed;
    try {
        parsed = parseJSON(content);
    } catch (e) {
        console.error('[AI] JSON invalide reçu (250 premiers chars):', content.slice(0, 250));
        throw new Error(`Réponse IA non valide : ${e.message}`);
    }

    return validateAndNormalize(parsed);
}

module.exports = { analyzeWorkData };
