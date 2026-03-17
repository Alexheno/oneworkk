require('isomorphic-fetch');
const { Client } = require('@microsoft/microsoft-graph-client');

function getAuthenticatedClient(accessToken) {
    return Client.init({ authProvider: (done) => done(null, accessToken) });
}

// 1. Emails — séparés direct (À vous) vs CC (Vous en copie)
async function getRecentEmails(accessToken, userEmail) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/messages')
            .select('sender,subject,bodyPreview,isRead,receivedDateTime,importance,toRecipients,ccRecipients')
            .top(40)
            .orderby('receivedDateTime DESC')
            .get();

        const emails = res.value.map(msg => {
            const toList = (msg.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase());
            const ccList = (msg.ccRecipients || []).map(r => r.emailAddress?.address?.toLowerCase());
            const isCc = userEmail ? ccList.includes(userEmail.toLowerCase()) && !toList.includes(userEmail.toLowerCase()) : false;
            return {
                sender: msg.sender?.emailAddress?.name || msg.sender?.emailAddress?.address || 'Inconnu',
                subject: msg.subject,
                body: msg.bodyPreview,
                isRead: msg.isRead,
                importance: msg.importance,
                receivedAt: msg.receivedDateTime,
                isCc
            };
        });
        return emails;
    } catch (e) {
        console.error('Erreur Graph (Mails):', e.message);
        return [];
    }
}

// 2. Agenda du jour UNIQUEMENT (pour la carte Réunions)
async function getTodayMeetings(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
        const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
        const res = await client.api(`/me/calendarview?startDateTime=${start}&endDateTime=${end}`)
            .select('subject,start,end,isOnlineMeeting,organizer,bodyPreview')
            .orderby('start/dateTime')
            .top(20)
            .get();
        return res.value.map(e => ({
            title: e.subject,
            start: new Date(e.start.dateTime + 'Z').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            end:   new Date(e.end.dateTime + 'Z').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            isOnline: e.isOnlineMeeting,
            organizer: e.organizer?.emailAddress?.name,
            description: e.bodyPreview?.slice(0, 150)
        }));
    } catch (e) {
        console.error('Erreur Graph (Réunions):', e.message);
        return [];
    }
}

// 3. Agenda 7 jours (pour le plan et l'IA)
async function getWeekSchedule(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString();
        const res = await client.api(`/me/calendarview?startDateTime=${start}&endDateTime=${end}`)
            .select('subject,start,end,isOnlineMeeting,attendees')
            .orderby('start/dateTime')
            .top(50)
            .get();
        return res.value.map(e => {
            const s = new Date(e.start.dateTime + 'Z').toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const en = new Date(e.end.dateTime + 'Z').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return { time: `${s} → ${en}`, title: e.subject, isOnline: e.isOnlineMeeting, attendeesCount: e.attendees?.length || 0 };
        });
    } catch (e) {
        console.error('Erreur Graph (Agenda):', e.message);
        return [];
    }
}

// 4. Messages Teams
async function getTeamsMessages(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/chats').expand('lastMessagePreview').top(25).get();
        return res.value
            .filter(c => c.lastMessagePreview)
            .map(c => ({
                sender: c.lastMessagePreview.from?.user?.displayName || 'Teams',
                text: c.lastMessagePreview.body?.content || 'Message',
                chatType: c.chatType
            }));
    } catch (e) {
        console.warn('Erreur Graph (Teams):', e.message);
        return [];
    }
}

// 5. Fichiers Office récents (Excel, Word, PowerPoint)
async function getRecentOfficeFiles(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/drive/recent').select('id,name,lastModifiedDateTime,webUrl').top(40).get();
        const files = res.value.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.docx') || f.name.endsWith('.pptx'));
        let officeData = [];
        for (const file of files.slice(0, 8)) {
            const entry = {
                fileName: file.name,
                lastModified: file.lastModifiedDateTime,
                type: file.name.endsWith('.xlsx') ? 'Excel' : file.name.endsWith('.docx') ? 'Word' : 'PowerPoint'
            };
            if (file.name.endsWith('.xlsx')) {
                try {
                    const sheets = await client.api(`/me/drive/items/${file.id}/workbook/worksheets`).get();
                    if (sheets.value?.length > 0) {
                        const range = await client.api(`/me/drive/items/${file.id}/workbook/worksheets/${sheets.value[0].id}/usedRange`).get();
                        entry.tableData = range.values ? range.values.slice(0, 80) : [];
                    }
                } catch (_) {}
            }
            officeData.push(entry);
        }
        return officeData;
    } catch (e) {
        console.error('Erreur Graph (Fichiers):', e.message);
        return [];
    }
}

// 6. Microsoft To Do
async function getToDoTasks(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const lists = await client.api('/me/todo/lists').get();
        let all = [];
        for (const list of lists.value) {
            try {
                const tasks = await client.api(`/me/todo/lists/${list.id}/tasks`)
                    .filter("status ne 'completed'")
                    .select('title,status,dueDateTime,importance,createdDateTime')
                    .top(20).get();
                all = all.concat(tasks.value.map(t => ({
                    list: list.displayName,
                    title: t.title,
                    due: t.dueDateTime?.dateTime || null,
                    importance: t.importance,
                    createdAt: t.createdDateTime
                })));
            } catch (_) {}
        }
        return all;
    } catch (e) {
        console.error('Erreur Graph (To Do):', e.message);
        return [];
    }
}

// 7. OneNote
async function getOneNotePages(accessToken) {
    try {
        const client = getAuthenticatedClient(accessToken);
        const res = await client.api('/me/onenote/pages')
            .select('title,createdDateTime,lastModifiedDateTime,parentSection')
            .orderby('lastModifiedDateTime DESC').top(20).get();
        return res.value.map(p => ({ title: p.title, section: p.parentSection?.displayName || '', lastModified: p.lastModifiedDateTime }));
    } catch (e) {
        console.warn('Erreur Graph (OneNote):', e.message);
        return [];
    }
}

module.exports = { getRecentEmails, getTodayMeetings, getWeekSchedule, getTeamsMessages, getRecentOfficeFiles, getToDoTasks, getOneNotePages };
