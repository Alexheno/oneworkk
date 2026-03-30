# Guide Administrateur IT — OneWork365

## Autoriser OneWork365 pour votre organisation Microsoft 365

### Option 1 — Autorisation en 1 clic (recommandé)

En tant qu'administrateur Microsoft 365, cliquez sur ce lien pour autoriser OneWork365 pour tous vos utilisateurs :

```
https://login.microsoftonline.com/organizations/adminconsent?client_id=6ba5635c-5459-4c73-a599-04f669c610ad&redirect_uri=https://onework365.app/admin-consent-success
```

→ Connectez-vous avec votre compte **Administrateur Global** ou **Administrateur d'application**
→ Acceptez les permissions demandées
→ Tous vos utilisateurs peuvent maintenant se connecter sans approbation individuelle

---

### Option 2 — Via Azure Active Directory

1. Connectez-vous sur [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Applications d'entreprise**
3. Cliquez **+ Nouvelle application** → **Ajouter depuis la galerie** ou cherchez "OneWork365"
4. Si non trouvé : **Créer votre propre application** → entrez le Client ID :
   ```
   6ba5635c-5459-4c73-a599-04f669c610ad
   ```
5. Dans **Autorisations** → **Accorder le consentement administrateur**

---

### Permissions demandées par OneWork365

| Permission | Type | Usage |
|---|---|---|
| `User.Read` | Déléguée | Nom et email de l'utilisateur |
| `Mail.Read` | Déléguée | Lecture des emails pour le brief |
| `Mail.ReadWrite` | Déléguée | Archivage (futur) |
| `Mail.Send` | Déléguée | Envoi d'emails via l'agent IA |
| `Calendars.Read` | Déléguée | Réunions du jour |
| `Chat.Read` | Déléguée | Messages Teams |
| `Files.Read.All` | Déléguée | Fichiers OneDrive récents |
| `Tasks.Read` | Déléguée | Lecture des tâches To Do |
| `Tasks.ReadWrite` | Déléguée | Création de tâches via l'agent |
| `Notes.Read` | Déléguée | Pages OneNote récentes |

> ⚠️ Toutes les permissions sont **déléguées** (agissent au nom de l'utilisateur connecté, pas en tant qu'application). Aucune permission d'application (sans utilisateur) n'est demandée.

---

### Déploiement via Microsoft Intune

Utilisez le script `deploy-intune.ps1` inclus dans ce dossier :

1. Dans **Intune** → **Appareils** → **Scripts PowerShell**
2. Cliquez **+ Ajouter**
3. Importez `deploy-intune.ps1`
4. Configuration :
   - Exécuter ce script en utilisant les informations d'identification de l'utilisateur : **Oui**
   - Appliquer la vérification de signature du script : **Non** (ou ajoutez votre cert interne)
5. Attribuez aux groupes d'utilisateurs souhaités

---

### Politique de confidentialité & conformité

- 🔒 Données chiffrées TLS 1.3 en transit
- 📍 Backend hébergé sur Railway (USA, SOC 2 Type II)
- 🇪🇺 Base de données Supabase hébergée dans l'UE
- ❌ Aucune revente de données
- 📄 [Politique de confidentialité complète](https://onework365.app/privacy)
- 📄 [Conditions d'utilisation](https://onework365.app/terms)

---

### Contact support entreprise

📧 enterprise@onework365.app
🌐 onework365.app/enterprise
