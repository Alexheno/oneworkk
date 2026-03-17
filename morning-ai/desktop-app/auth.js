const msal = require('@azure/msal-node');
const { shell } = require('electron');

const CLIENT_ID = '6ba5635c-5459-4c73-a599-04f669c610ad';
const TENANT_ID = '862add60-061c-46c4-af0c-7aef239fc1e0';
// Comme autorisé par le user, 'common' permet aux comptes perso et pro (multitenant) de se connecter.
const AUTHORITY = `https://login.microsoftonline.com/common`;

const msalConfig = {
    auth: {
        clientId: CLIENT_ID,
        authority: AUTHORITY,
    },
    system: {
        loggerOptions: {
            loggerCallback(loglevel, message, containsPii) {
                // console.log(message);
            },
            piiLoggingEnabled: false,
            logLevel: msal.LogLevel.Info,
        }
    }
};

const pca = new msal.PublicClientApplication(msalConfig);

const scopes = ["User.Read", "Mail.Read", "Calendars.Read", "Chat.Read", "Files.Read.All", "Tasks.Read", "Notes.Read"];

async function login() {
    const request = {
        scopes: scopes,
        openBrowser: async (url) => {
            // Ouvre le navigateur par défaut de l'utilisateur pour le login MS
            await shell.openExternal(url);
        },
        successTemplate: "Authentification réussie ! L'assistant OneWork est désormais connecté. Vous pouvez fermer cet onglet.",
        errorTemplate: "Une erreur est survenue lors de l'authentification.",
    };

    try {
        const response = await pca.acquireTokenInteractive(request);
        return {
            success: true,
            account: response.account,
            accessToken: response.accessToken
        };
    } catch (error) {
        console.error("Erreur d'authentification Microsoft: ", error);
        return { success: false, error: error.message };
    }
}

module.exports = { login };
