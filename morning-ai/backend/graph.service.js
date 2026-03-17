require('isomorphic-fetch');
const { Client } = require('@microsoft/microsoft-graph-client');

function getAuthenticatedClient(accessToken) {
    return Client.init({
        authProvider: (done) => { done(null, accessToken); }
    });
}

// 1. Emails récents (non lus en priorité)
async function getRecentEmails(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/messages')
            .select('sender,subject,bodyPreview,isRead,receivedDateTime,importance')
            .top(30)
            .orderby('receivedDateTime DESC')
            .get();
        return res.value.map(msg => ({
            sender: msg.sender?.emailAddress?.name || msg.sender?.emailAddress?.address || "Inconnu",
            subject: msg.subject,
            body: msg.bodyPreview,
            isRead: msg.isRead,
            importance: msg.importance,
            receivedAt: msg.receivedDateTime
        }));
    } catch (e) {
        console.error("Erreur Graph API (Mails) :", e.message);
        return [];
    }
}

// 2. Agenda : aujourd'hui + 7 prochains jours
async function getTodaySchedule(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString();

        const res = await client.api(`/me/calendarview?startDateTime=${startOfDay}&endDateTime=${endOfWeek}`)
            .select('subject,start,end,isOnlineMeeting,bodyPreview,organizer,attendees')
            .orderby('start/dateTime')
            .top(50)
            .get();

        return res.value.map(event => {
            const s = new Date(event.start.dateTime + 'Z').toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const e = new Date(event.end.dateTime + 'Z').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return {
                time: `${s} → ${e}`,
                title: event.subject,
                isOnline: event.isOnlineMeeting,
                organizer: event.organizer?.emailAddress?.name,
                attendeesCount: event.attendees?.length || 0,
                description: event.bodyPreview?.slice(0, 200)
            };
        });
    } catch (e) {
        console.error("Erreur Graph API (Agenda) :", e.message);
        return [];
    }
}

// 3. Messages Teams
async function getTeamsMessages(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/chats')
            .expand('lastMessagePreview')
            .top(25)
            .get();
        return res.value
            .filter(chat => chat.lastMessagePreview)
            .map(chat => ({
                sender: chat.lastMessagePreview.from?.user?.displayName || "Teams",
                text: chat.lastMessagePreview.body?.content || "Message",
                chatType: chat.chatType
            }));
    } catch (e) {
        console.warn("Erreur Graph API (Teams) :", e.message);
        return [];
    }
}

// 4. Fichiers récents OneDrive : Excel, Word, PowerPoint
async function getRecentOfficeFiles(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/drive/recent')
            .select('id,name,lastModifiedDateTime,webUrl')
            .top(40)
            .get();

        const files = res.value.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.docx') || f.name.endsWith('.pptx')
        );

        let officeData = [];

        for (const file of files.slice(0, 8)) {
            const entry = {
                fileName: file.name,
                lastModified: file.lastModifiedDateTime,
                webUrl: file.webUrl,
                type: file.name.endsWith('.xlsx') ? 'Excel' : file.name.endsWith('.docx') ? 'Word' : 'PowerPoint'
            };

            // Pour Excel uniquement : lire le contenu du tableau
            if (file.name.endsWith('.xlsx')) {
                try {
                    const sheetsRes = await client.api(`/me/drive/items/${file.id}/workbook/worksheets`).get();
                    if (sheetsRes.value?.length > 0) {
                        const firstSheetId = sheetsRes.value[0].id;
                        const rangeRes = await client.api(`/me/drive/items/${file.id}/workbook/worksheets/${firstSheetId}/usedRange`).get();
                        entry.tableData = rangeRes.values ? rangeRes.values.slice(0, 100) : [];
                    }
                } catch (_) {}
            }

            officeData.push(entry);
        }

        return officeData;
    } catch (e) {
        console.error("Erreur Graph API (Fichiers Office) :", e.message);
        return [];
    }
}

// 5. Microsoft To Do : toutes les tâches non terminées
async function getToDoTasks(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const listsRes = await client.api('/me/todo/lists').get();
        let allTasks = [];

        for (const list of listsRes.value) {
            try {
                const tasksRes = await client.api(`/me/todo/lists/${list.id}/tasks`)
                    .filter("status ne 'completed'")
                    .select('title,status,dueDateTime,importance,body,createdDateTime')
                    .top(30)
                    .get();

                const tasks = tasksRes.value.map(t => ({
                    list: list.displayName,
                    title: t.title,
                    due: t.dueDateTime?.dateTime || null,
                    importance: t.importance,
                    note: t.body?.content?.replace(/<[^>]*>/g, '').slice(0, 150) || null,
                    createdAt: t.createdDateTime
                }));
                allTasks = allTasks.concat(tasks);
            } catch (_) {}
        }

        return allTasks;
    } catch (e) {
        console.error("Erreur Graph API (To Do) :", e.message);
        return [];
    }
}

// 6. OneNote : pages récemment modifiées
async function getOneNotePages(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/onenote/pages')
            .select('title,createdDateTime,lastModifiedDateTime,parentSection')
            .orderby('lastModifiedDateTime DESC')
            .top(20)
            .get();

        return res.value.map(page => ({
            title: page.title,
            section: page.parentSection?.displayName || 'Sans section',
            lastModified: page.lastModifiedDateTime
        }));
    } catch (e) {
        console.warn("Erreur Graph API (OneNote) :", e.message);
        return [];
    }
}

module.exports = {
    getRecentEmails,
    getTodaySchedule,
    getTeamsMessages,
    getRecentOfficeFiles,
    getToDoTasks,
    getOneNotePages
};
