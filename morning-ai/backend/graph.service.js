require('isomorphic-fetch');
const { Client } = require('@microsoft/microsoft-graph-client');

// Fonction d'initialisation du client Graph avec le jeton reçu de l'application Windows
function getAuthenticatedClient(accessToken) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
}

// 1. Lire les Emails Récents (Top 20 non triés par date)
async function getRecentEmails(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/messages')
            .select('sender,subject,bodyPreview,isRead')
            .top(20) // On limite pour pas exploser le contexte IA
            .orderby('receivedDateTime DESC')
            .get();
        
        // Formatage pour l'IA : On simplifie l'objet pour économiser des tokens
        return res.value.map(msg => ({
            sender: msg.sender?.emailAddress?.name || msg.sender?.emailAddress?.address || "Inconnu",
            subject: msg.subject,
            body: msg.bodyPreview, // Le preview est suffisant souvent pour Gemini
            isRead: msg.isRead
        }));
    } catch (e) {
        console.error("Erreur Graph API (Mails) :", e.message);
        return [];
    }
}

// 2. Lire l'Agenda du Jour (Events)
async function getTodaySchedule(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        
        // Calcul du début et de la fin de journée en UTC
        const today = new Date();
        const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
        const endOfDay = new Date(today.setHours(23,59,59,999)).toISOString();

        const res = await client.api(`/me/calendarview?startDateTime=${startOfDay}&endDateTime=${endOfDay}`)
            .select('subject,start,end,isOnlineMeeting')
            .orderby('start/dateTime')
            .get();
            
        return res.value.map(event => {
            // Conversion locale basique de l'heure
            const s = new Date(event.start.dateTime + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            const e = new Date(event.end.dateTime + 'Z').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            return {
                time: `${s} - ${e}`,
                title: event.subject
            };
        });
    } catch (e) {
        console.error("Erreur Graph API (Agenda) :", e.message);
        return [];
    }
}

// 3. Lire les Messages Teams (Plus profond)
async function getTeamsMessages(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        // On récupère les 25 derniers messages dans tous les chats 1v1 ou Groupes
        const res = await client.api('/me/chats')
            .expand('lastMessagePreview')
            .top(25)
            .get();
            
        return res.value
            .filter(chat => chat.lastMessagePreview)
            .map(chat => ({
               sender: chat.lastMessagePreview.from?.user?.displayName || "Teams",
               text: chat.lastMessagePreview.body?.content || "Message"
            }));
    } catch (e) {
        console.warn("Erreur Graph API (Teams - Peut nécessiter des droits Admins) :", e.message);
        return [];
    }
}

// 4. Lire les Fichiers Excel Récents (Analyse ultra profonde)
async function getRecentExcelData(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        
        // On récupère les fichiers récemment utilisés par l'utilisateur
        const res = await client.api('/me/drive/recent')
            .select('id,name')
            .top(30) // On cherche plus loin dans l'historique du drive
            .get();
            
        // On filtre uniquement les classeurs Excel
        const excelFiles = res.value.filter(file => file.name.endsWith('.xlsx'));
        let excelData = [];
        
        // On extrait les 5 derniers classeurs Excel modifiés
        for (const file of excelFiles.slice(0, 5)) {
            try {
                // Demander la première feuille de calcul (worksheet)
                const sheetsRes = await client.api(`/me/drive/items/${file.id}/workbook/worksheets`).get();
                if (sheetsRes.value && sheetsRes.value.length > 0) {
                    const firstSheetId = sheetsRes.value[0].id;
                    // Extraire les données de la plage utilisée
                    const rangeRes = await client.api(`/me/drive/items/${file.id}/workbook/worksheets/${firstSheetId}/usedRange`).get();
                    
                    // On aspire jusqu'à 150 lignes de Tâches/Metrics par fichier (Gemini gère 1 Million de tokens !)
                    const rows = rangeRes.values ? rangeRes.values.slice(0, 150) : [];
                    excelData.push({
                        fileName: file.name,
                        tableData: rows
                    });
                }
            } catch (err) {
                console.warn(`Lecture ignorée pour le fichier Excel protégé : ${file.name}`);
            }
        }
        return excelData;
    } catch (e) {
        console.error("Erreur Graph API (Excel) :", e.message);
        return [];
    }
}

module.exports = {
    getRecentEmails,
    getTodaySchedule,
    getTeamsMessages,
    getRecentExcelData
};
