#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DE SAUVEGARDE AUTOMATIQUE DE LA BASE DE DONNÉES POSTGRESQL (RATE IT)
# ==============================================================================
# Ce script effectue un dump SQL à chaud compressé sans interrompre les parties.
# Utilisation manuelle : ./scripts/backup-db.sh
# Utilisation en cron : 0 3 * * * /chemin/vers/Rate-it/scripts/backup-db.sh
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/rate_it_backup_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="rate-it-postgres"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-rate_it}"
RETENTION_DAYS=14 # Conserve les sauvegardes des 14 derniers jours

# Créer le répertoire de sauvegarde s'il n'existe pas
mkdir -p "${BACKUP_DIR}"

echo "📦 [$(date)] Début de la sauvegarde de la base de données '${POSTGRES_DB}'..."

# Vérifier si le conteneur PostgreSQL tourne
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Erreur : Le conteneur '${CONTAINER_NAME}' n'est pas en cours d'exécution !" >&2
    exit 1
fi

# Exécution du dump compressé
docker exec -t "${CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"

# Vérifier que le fichier n'est pas vide
if [ -s "${BACKUP_FILE}" ]; then
    FILE_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    echo "✅ Sauvegarde réussie : ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "❌ Erreur : Le fichier de sauvegarde est vide !" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

# Nettoyage des anciennes sauvegardes (+ de 14 jours)
echo "🧹 Nettoyage des sauvegardes de plus de ${RETENTION_DAYS} jours..."
find "${BACKUP_DIR}" -type f -name "rate_it_backup_*.sql.gz" -mtime +"${RETENTION_DAYS}" -exec rm {} \;

echo "🎉 Sauvegarde terminée avec succès !"
