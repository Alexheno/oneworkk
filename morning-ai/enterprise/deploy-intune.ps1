# ═══════════════════════════════════════════════════════════════
#  OneWork — Script de déploiement entreprise (Microsoft Intune)
#  Usage : déployez ce script via Intune > Devices > Scripts
#  Compatible : Windows 10/11 x64
# ═══════════════════════════════════════════════════════════════

param(
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\OneWork",
    [string]$DownloadUrl = "https://github.com/Alexheno/oneworkk/releases/latest/download/OneWork-Setup.exe",
    [switch]$Silent = $true
)

$ErrorActionPreference = "Stop"
$LogFile = "$env:TEMP\OneWork-Deploy.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== Déploiement OneWork démarré ==="
Write-Log "Utilisateur : $env:USERNAME"
Write-Log "Machine : $env:COMPUTERNAME"

# ─── Vérification Windows ───────────────────────────────────
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10) {
    Write-Log "ERREUR: Windows 10 ou supérieur requis."
    exit 1
}
Write-Log "OS: Windows $($osVersion.Major).$($osVersion.Minor) OK"

# ─── Téléchargement ─────────────────────────────────────────
$setupFile = "$env:TEMP\OneWork-Setup.exe"

Write-Log "Téléchargement depuis : $DownloadUrl"
try {
    $webClient = New-Object System.Net.WebClient
    $webClient.DownloadFile($DownloadUrl, $setupFile)
    Write-Log "Téléchargement OK : $([math]::Round((Get-Item $setupFile).Length / 1MB, 2)) MB"
} catch {
    Write-Log "ERREUR téléchargement : $_"
    exit 1
}

# ─── Vérification signature (si certificat disponible) ──────
# Décommentez si vous avez le certificat de signature :
# $sig = Get-AuthenticodeSignature -FilePath $setupFile
# if ($sig.Status -ne "Valid" -or $sig.SignerCertificate.Subject -notlike "*OneWork*") {
#     Write-Log "ERREUR: Signature invalide. Abandon."
#     Remove-Item $setupFile -Force
#     exit 1
# }
# Write-Log "Signature vérifiée : $($sig.SignerCertificate.Subject)"

# ─── Installation silencieuse ───────────────────────────────
Write-Log "Installation en cours (mode silencieux)..."
try {
    $process = Start-Process -FilePath $setupFile -ArgumentList "/S" -Wait -PassThru
    if ($process.ExitCode -ne 0) {
        Write-Log "AVERTISSEMENT: Code de sortie = $($process.ExitCode)"
    } else {
        Write-Log "Installation terminée avec succès."
    }
} catch {
    Write-Log "ERREUR installation : $_"
    exit 1
} finally {
    Remove-Item $setupFile -Force -ErrorAction SilentlyContinue
}

# ─── Admin Consent Microsoft (optionnel) ────────────────────
# Décommentez pour ouvrir la page d'autorisation IT si pas encore fait :
# $clientId = "6ba5635c-5459-4c73-a599-04f669c610ad"
# $consentUrl = "https://login.microsoftonline.com/organizations/adminconsent?client_id=$clientId"
# Write-Log "Ouverture admin consent : $consentUrl"
# Start-Process $consentUrl

# ─── Vérification installation ──────────────────────────────
$exePath = "$env:LOCALAPPDATA\Programs\OneWork\OneWork.exe"
if (Test-Path $exePath) {
    Write-Log "SUCCÈS: OneWork installé dans $exePath"
    exit 0
} else {
    # Chercher dans Program Files aussi
    $altPath = "C:\Program Files\OneWork\OneWork.exe"
    if (Test-Path $altPath) {
        Write-Log "SUCCÈS: OneWork installé dans $altPath"
        exit 0
    }
    Write-Log "AVERTISSEMENT: Exécutable non trouvé après installation."
    exit 0
}
