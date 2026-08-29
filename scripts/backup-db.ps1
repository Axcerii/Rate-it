# ==============================================================================
# SCRIPT POWERSHELL DE SAUVEGARDE POSTGRESQL (RATE IT)
# ==============================================================================

$BackupDir = Join-Path $PSScriptRoot "..\backups"
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "rate_it_backup_$Timestamp.sql"
$ContainerName = "rate-it-postgres"
$User = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }
$Db = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "rate_it" }

Write-Host "📦 Début de la sauvegarde de la base de données PostgreSQL ($Db)..." -ForegroundColor Cyan

$RunningContainers = docker ps --format '{{.Names}}'
if ($RunningContainers -notcontains $ContainerName) {
    Write-Host "❌ Erreur : Le conteneur $ContainerName n'est pas démarré !" -ForegroundColor Red
    exit 1
}

# Exécuter pg_dump
docker exec -t $ContainerName pg_dump -U $User $Db | Out-File -FilePath $BackupFile -Encoding utf8

if ((Get-Item $BackupFile).Length -gt 0) {
    Write-Host "✅ Sauvegarde terminée : $BackupFile" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur : Le fichier de sauvegarde est vide." -ForegroundColor Red
}
