'use strict';
require('isomorphic-fetch');
const { Client } = require('@microsoft/microsoft-graph-client');

// ─── Client factory ──────────────────────────────────────────────────────────
function getClient(accessToken) {
    return Client.init({ authProvider: (done) => done(null, accessToken) });
}

// ─── Retry helper ────────────────────────────────────────────────────────────
/**
 * Exécute fn() avec retry exponentiel.
 * Ré-essaie sur 429 (rate limit) et 5xx.
 * Propage immédiatement les erreurs 4xx (sauf 429) — token invalide, permission refusée, etc.
 */
async function withRetry(fn, context = 'Graph', maxRetries = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            const status = err.statusCode || err.status || 0;

            // Erreurs client non-retryables (401 Unauthorized, 403 Forbidden, 404 Not Found)
            if (status === 401 || status === 403) throw err;
            if (status >= 400 && status < 500 && status !== 429) break;

            if (attempt < maxRetries) {
                const delay = 600 * Math.pow(2, attempt - 1);  // 600ms, 1.2s, 2.4s
                console.warn(`[Graph:${context}] tentative ${attempt}/${maxRetries} → retry dans ${delay}ms (${err.message})`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    throw lastErr;
}

// ─── 1. Emails ───────────────────────────────────────────────────────────────
/**
 * Récupère les 40 emails les plus récents, séparés direct / CC.
 * Marque les non-lus et les importants.
 */
async function getRecentEmails(accessToken, userEmail) {
    try {
        const client = getClient(accessToken);
        const res = await withRetry(
            () => client.api('/me/messages')
                .select('id,sender,subject,bodyPreview,isRead,receivedDateTime,importance,toRecipients,ccRecipients,conversationId,webLink')
                .top(40)
                .orderby('receivedDateTime DESC')
                .get(),
            'Emails'
        );

        const userLower = (userEmail || '').toLowerCase();

        return res.value.map(msg => {
            const toList = (msg.toRecipients || []).map(r => r.emailAddress?.address?.toLowerCase());
            const ccList = (msg.ccRecipients || []).map(r => r.emailAddress?.address?.toLowerCase());
            const isCc   = userLower
                ? ccList.includes(userLower) && !toList.includes(userLower)
                : false;

            return {
                id:             msg.id,
                conversationId: msg.conversationId,
                sender:         msg.sender?.emailAddress?.name || msg.sender?.emailAddress?.address || 'Inconnu',
                senderEmail:    msg.sender?.emailAddress?.address || '',
                subject:        msg.subject || '(sans sujet)',
                body:           msg.bodyPreview || '',
                isRead:         msg.isRead,
                isUrgent:       msg.importance === 'high',
                importance:     msg.importance,
                receivedAt:     msg.receivedDateTime,
                isCc,
                webLink:        msg.webLink || '',
            };
        });
    } catch (err) {
        console.error('[Graph:Emails]', err.message);
        return [];
    }
}

// ─── 2. Réunions du jour ─────────────────────────────────────────────────────
/**
 * Retourne toutes les réunions du jour, avec calcul de l'état (passée / imminente / à venir).
 */
async function getTodayMeetings(accessToken) {
    try {
        const client = getClient(accessToken);
        const now    = new Date();
        const start  = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const end    = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

        const res = await withRetry(
            () => client.api(`/me/calendarview?startDateTime=${start}&endDateTime=${end}`)
                .select('id,subject,start,end,isOnlineMeeting,onlineMeetingUrl,organizer,bodyPreview,attendees,location')
                .orderby('start/dateTime')
                .top(20)
                .get(),
            'TodayMeetings'
        );

        return res.value.map(e => {
            const startDt = new Date(e.start.dateTime + (e.start.timeZone === 'UTC' ? 'Z' : ''));
            const endDt   = new Date(e.end.dateTime   + (e.end.timeZone   === 'UTC' ? 'Z' : ''));
            const nowMs   = Date.now();

            const status = startDt.getTime() > nowMs
                ? (startDt.getTime() - nowMs < 30 * 60 * 1000 ? 'imminent' : 'upcoming')
                : (endDt.getTime() < nowMs ? 'done' : 'ongoing');

            return {
                id:               e.id,
                title:            e.subject || '(sans titre)',
                start:            startDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                end:              endDt.toLocaleTimeString('fr-FR',   { hour: '2-digit', minute: '2-digit' }),
                time:             startDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                isOnline:         e.isOnlineMeeting || false,
                onlineMeetingUrl: e.onlineMeetingUrl || '',
                organizer:        e.organizer?.emailAddress?.name  || '',
                description:      (e.bodyPreview || '').slice(0, 200),
                attendeeCount:    (e.attendees || []).length,
                location:         e.location?.displayName || '',
                status,
            };
        });
    } catch (err) {
        console.error('[Graph:TodayMeetings]', err.message);
        return [];
    }
}

// ─── 3. Agenda 7 jours ───────────────────────────────────────────────────────
async function getWeekSchedule(accessToken) {
    try {
        const client = getClient(accessToken);
        const now    = new Date();
        const start  = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const end    = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59).toISOString();

        const res = await withRetry(
            () => client.api(`/me/calendarview?startDateTime=${start}&endDateTime=${end}`)
                .select('subject,start,end,isOnlineMeeting,attendees,organizer')
                .orderby('start/dateTime')
                .top(50)
                .get(),
            'WeekSchedule'
        );

        return res.value.map(e => {
            const startDt = new Date(e.start.dateTime + (e.start.timeZone === 'UTC' ? 'Z' : ''));
            const endDt   = new Date(e.end.dateTime   + (e.end.timeZone   === 'UTC' ? 'Z' : ''));
            const fmt     = startDt.toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const endFmt  = endDt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

            return {
                time:          `${fmt} → ${endFmt}`,
                title:         e.subject || '(sans titre)',
                isOnline:      e.isOnlineMeeting || false,
                attendeeCount: (e.attendees || []).length,
                organizer:     e.organizer?.emailAddress?.name || '',
            };
        });
    } catch (err) {
        console.error('[Graph:WeekSchedule]', err.message);
        return [];
    }
}

// ─── 4. Messages Teams ───────────────────────────────────────────────────────
async function getTeamsMessages(accessToken) {
    try {
        const client = getClient(accessToken);
        const res = await withRetry(
            () => client.api('/me/chats').expand('lastMessagePreview').top(25).get(),
            'Teams'
        );

        return res.value
            .filter(c => c.lastMessagePreview?.body?.content)
            .map(c => ({
                sender:   c.lastMessagePreview.from?.user?.displayName || 'Teams',
                text:     (c.lastMessagePreview.body?.content || '').slice(0, 300),
                chatType: c.chatType || 'oneOnOne',
                chatId:   c.id,
                webUrl:   `https://teams.microsoft.com/l/chat/${encodeURIComponent(c.id)}/0`,
            }));
    } catch (err) {
        console.warn('[Graph:Teams]', err.message);
        return [];
    }
}

// ─── 5. Fichiers Office récents ───────────────────────────────────────────────
/**
 * Récupère les fichiers Office récents avec lecture parallèle des workbooks Excel.
 */
async function getRecentOfficeFiles(accessToken) {
    try {
        const client = getClient(accessToken);
        const res = await withRetry(
            () => client.api('/me/drive/recent')
                .select('id,name,lastModifiedDateTime,webUrl,size,lastModifiedBy')
                .top(40)
                .get(),
            'Files'
        );

        const officeFiles = res.value.filter(f =>
            f.name.endsWith('.xlsx') || f.name.endsWith('.docx') || f.name.endsWith('.pptx')
        ).slice(0, 8);

        // Lecture parallèle des workbooks Excel
        const enriched = await Promise.allSettled(
            officeFiles.map(async file => {
                const entry = {
                    id:           file.id,
                    fileName:     file.name,
                    lastModified: file.lastModifiedDateTime,
                    webUrl:       file.webUrl,
                    size:         file.size,
                    modifiedBy:   file.lastModifiedBy?.user?.displayName || '',
                    type:         file.name.endsWith('.xlsx') ? 'Excel'
                                : file.name.endsWith('.docx') ? 'Word'
                                : 'PowerPoint',
                };

                if (file.name.endsWith('.xlsx')) {
                    try {
                        const sheets = await withRetry(
                            () => client.api(`/me/drive/items/${file.id}/workbook/worksheets`).get(),
                            `Excel:${file.name}`,
                            2   // Moins de retries pour les fichiers (non-critique)
                        );
                        if (sheets.value?.length > 0) {
                            const range = await withRetry(
                                () => client.api(`/me/drive/items/${file.id}/workbook/worksheets/${sheets.value[0].id}/usedRange`).get(),
                                `ExcelRange:${file.name}`,
                                2
                            );
                            // Envoie seulement les 5 premières lignes à l'IA
                            entry.tableData = (range.values || []).slice(0, 5);
                        }
                    } catch (_) {
                        // Non-critique : continue sans données Excel
                    }
                }

                return entry;
            })
        );

        return enriched
            .filter(r => r.status === 'fulfilled')
            .map(r => r.value);
    } catch (err) {
        console.error('[Graph:Files]', err.message);
        return [];
    }
}

// ─── 6. Microsoft To Do ───────────────────────────────────────────────────────
/**
 * Récupère toutes les tâches incomplètes en parallèle sur toutes les listes.
 */
async function getToDoTasks(accessToken) {
    try {
        const client = getClient(accessToken);
        const listsRes = await withRetry(
            () => client.api('/me/todo/lists').get(),
            'TodoLists'
        );

        // Fetch parallèle de toutes les listes
        const results = await Promise.allSettled(
            listsRes.value.map(list =>
                withRetry(
                    () => client.api(`/me/todo/lists/${list.id}/tasks`)
                        .filter("status ne 'completed'")
                        .select('id,title,status,dueDateTime,importance,createdDateTime,body')
                        .top(25)
                        .get(),
                    `TodoTasks:${list.displayName}`,
                    2
                ).then(tasks => tasks.value.map(t => ({
                    id:          t.id,
                    listId:      list.id,
                    list:        list.displayName,
                    title:       t.title,
                    due:         t.dueDateTime?.dateTime || null,
                    importance:  t.importance,
                    priority:    t.importance === 'high' ? 'high' : t.importance === 'normal' ? 'medium' : 'low',
                    createdAt:   t.createdDateTime,
                    overdue:     t.dueDateTime ? new Date(t.dueDateTime.dateTime) < new Date() : false,
                    notes:       t.body?.content?.slice(0, 200) || '',
                })))
            )
        );

        return results
            .filter(r => r.status === 'fulfilled')
            .flatMap(r => r.value);
    } catch (err) {
        console.error('[Graph:ToDo]', err.message);
        return [];
    }
}

// ─── 7. OneNote ───────────────────────────────────────────────────────────────
async function getOneNotePages(accessToken) {
    try {
        const client = getClient(accessToken);
        const res = await withRetry(
            () => client.api('/me/onenote/pages')
                .select('id,title,createdDateTime,lastModifiedDateTime,parentSection,parentNotebook')
                .orderby('lastModifiedDateTime DESC')
                .top(20)
                .get(),
            'OneNote'
        );

        return res.value.map(p => ({
            id:           p.id,
            title:        p.title || '(sans titre)',
            section:      p.parentSection?.displayName  || '',
            notebook:     p.parentNotebook?.displayName || '',
            lastModified: p.lastModifiedDateTime,
        }));
    } catch (err) {
        console.warn('[Graph:OneNote]', err.message);
        return [];
    }
}

// ─── WRITE OPERATIONS ────────────────────────────────────────────────────────

async function sendEmailMessage(accessToken, { to, subject, body, cc }) {
    const client = getClient(accessToken);
    const message = {
        subject,
        body:         { contentType: 'Text', content: body },
        toRecipients: [{ emailAddress: { address: to } }],
    };
    if (cc) message.ccRecipients = [{ emailAddress: { address: cc } }];

    await withRetry(
        () => client.api('/me/sendMail').post({ message, saveToSentItems: true }),
        'SendEmail'
    );
    return { success: true };
}

async function replyToEmail(accessToken, messageId, replyBody) {
    const client = getClient(accessToken);
    await withRetry(
        () => client.api(`/me/messages/${messageId}/reply`).post({ message: {}, comment: replyBody }),
        'ReplyEmail'
    );
    return { success: true };
}

async function createTodoTask(accessToken, { title, notes, dueDate, importance = 'normal' }) {
    const client = getClient(accessToken);

    const listsRes = await withRetry(
        () => client.api('/me/todo/lists').get(),
        'TodoListsForCreate',
        2
    );
    const listId = listsRes.value?.[0]?.id;
    if (!listId) throw new Error('Aucune liste To Do trouvée');

    const taskBody = {
        title,
        status:     'notStarted',
        importance,
    };
    if (notes)   taskBody.body = { content: notes, contentType: 'text' };
    if (dueDate) taskBody.dueDateTime = { dateTime: dueDate, timeZone: 'UTC' };

    const task = await withRetry(
        () => client.api(`/me/todo/lists/${listId}/tasks`).post(taskBody),
        'CreateTask'
    );
    return { success: true, task };
}

async function markEmailAsRead(accessToken, messageId) {
    const client = getClient(accessToken);
    await withRetry(
        () => client.api(`/me/messages/${messageId}`).patch({ isRead: true }),
        'MarkEmailRead'
    );
    return { success: true };
}

module.exports = {
    getRecentEmails,
    getTodayMeetings,
    getWeekSchedule,
    getTeamsMessages,
    getRecentOfficeFiles,
    getToDoTasks,
    getOneNotePages,
    sendEmailMessage,
    replyToEmail,
    createTodoTask,
    markEmailAsRead,
};
