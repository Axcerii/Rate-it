import pool from './db.js';

const ANILIST_GRAPHQL_ENDPOINT = 'https://graphql.anilist.co';

/**
 * Small delay helper
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Safe fetch with retry on AniList rate limits (HTTP 429)
 */
async function queryAniList(query, variables = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(ANILIST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query, variables }),
      });

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10);
        console.warn(`⏳ AniList Rate limit reached (429). Waiting ${retryAfter}s before retry (Attempt ${attempt}/${maxRetries})...`);
        await sleep(retryAfter * 1000 + 500);
        continue;
      }

      if (res.status === 404) {
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AniList API HTTP ${res.status}: ${errorText}`);
      }

      const json = await res.json();
      if (json.errors && json.errors.length > 0) {
        // If not found in GraphQL response
        if (json.errors.some(e => e.status === 404 || e.message?.toLowerCase().includes('not found'))) {
          return null;
        }
        throw new Error(`AniList GraphQL Error: ${json.errors[0].message}`);
      }

      return json.data;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`⚠️ Request failed: ${err.message}. Retrying in 1s...`);
      await sleep(1000);
    }
  }
}

/**
 * Batch fetch AniList media by MAL IDs (up to 50 IDs per batch)
 */
async function fetchAniListByMalIds(malIds) {
  if (!malIds || malIds.length === 0) return new Map();

  const query = `
    query ($malIds: [Int]) {
      Page(page: 1, perPage: 50) {
        media(idMal_in: $malIds, type: ANIME) {
          id
          idMal
          title {
            romaji
            english
          }
        }
      }
    }
  `;

  const data = await queryAniList(query, { malIds });
  const map = new Map();
  const mediaList = data?.Page?.media || [];

  for (const media of mediaList) {
    if (media.idMal) {
      map.set(media.idMal, {
        anilistId: media.id,
        anilistTitle: media.title?.romaji || media.title?.english || 'Titre Inconnu',
      });
    }
  }

  return map;
}

/**
 * Fallback: Search AniList by text title
 */
async function searchAniListByTitle(title) {
  if (!title || title.trim().length < 2) return null;

  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        idMal
        title {
          romaji
          english
        }
      }
    }
  `;

  try {
    const data = await queryAniList(query, { search: title.trim() });
    const media = data?.Media;
    if (!media) return null;

    return {
      anilistId: media.id,
      idMal: media.idMal || null,
      anilistTitle: media.title?.romaji || media.title?.english || 'Titre Inconnu',
    };
  } catch (err) {
    // Media not found or search failed
    return null;
  }
}

/**
 * Ensure database schema has AniList columns & index
 */
export async function ensureAniListColumns(clientOrPool) {
  await clientOrPool.query(`
    ALTER TABLE videos ADD COLUMN IF NOT EXISTS anilist_id INTEGER;
    ALTER TABLE videos ADD COLUMN IF NOT EXISTS anilist_title VARCHAR(255);
    CREATE INDEX IF NOT EXISTS idx_videos_anilist_id ON videos(anilist_id);
  `);
}

/**
 * Run AniList Migration and Backfill
 */
export async function runAniListMigration(options = {}) {
  const force = Boolean(options.force);
  const client = await pool.connect();

  console.log('====================================================');
  console.log('🚀 DÉMARRAGE DE LA MIGRATION ET DU BACKFILL ANILIST');
  console.log(`Mode : ${force ? 'FORCÉ (Re-synchronise tout)' : 'STANDARD (Uniquement les vidéos sans AniList ID)'}`);
  console.log('====================================================\n');

  try {
    // 1. Ensure columns & indexes exist
    console.log('1. Vérification du schéma PostgreSQL (colonnes anilist_id, anilist_title)...');
    await ensureAniListColumns(client);
    console.log('✅ Schéma vérifié et prêt.\n');

    // 2. Fetch videos to migrate
    const queryStr = force
      ? `SELECT id, youtube_id, title, mal_anime_id, mal_title, anilist_id, anilist_title FROM videos ORDER BY id ASC`
      : `SELECT id, youtube_id, title, mal_anime_id, mal_title, anilist_id, anilist_title FROM videos WHERE anilist_id IS NULL ORDER BY id ASC`;

    const res = await client.query(queryStr);
    const videosToProcess = res.rows;

    const totalInDbRes = await client.query('SELECT COUNT(*) as count FROM videos');
    const totalVideosInDb = parseInt(totalInDbRes.rows[0].count, 10);

    console.log(`📊 Statistiques de la base de données :`);
    console.log(`   - Total de vidéos en base : ${totalVideosInDb}`);
    console.log(`   - Vidéos à traiter pour AniList : ${videosToProcess.length}\n`);

    if (videosToProcess.length === 0) {
      console.log('✨ Toutes les vidéos sont déjà synchronisées avec AniList ! Aucune action requise.');
      return { success: true, processed: 0, matchedByMalId: 0, matchedByTitle: 0, skipped: 0 };
    }

    // Separate videos with mal_anime_id and those without
    const withMalId = [];
    const withoutMalId = [];

    for (const v of videosToProcess) {
      if (v.mal_anime_id && !isNaN(parseInt(v.mal_anime_id, 10))) {
        withMalId.push(v);
      } else {
        withoutMalId.push(v);
      }
    }

    console.log(`📌 Répartition du traitement :`);
    console.log(`   - Avec ID MyAnimeList numérique : ${withMalId.length} (traité par lots ultra-rapides)`);
    console.log(`   - Sans ID MyAnimeList numérique : ${withoutMalId.length} (traité par recherche textuelle de secours)\n`);

    let matchedByMalIdCount = 0;
    let matchedByTitleCount = 0;
    const notFoundVideos = [];

    // --- PASSE 1 : Batching par mal_anime_id (lots de 50) ---
    if (withMalId.length > 0) {
      console.log('--- PASSE 1 : Résolution rapide par lots (idMal_in) ---');
      const BATCH_SIZE = 50;

      for (let i = 0; i < withMalId.length; i += BATCH_SIZE) {
        const batch = withMalId.slice(i, i + BATCH_SIZE);
        const malIds = [...new Set(batch.map((v) => parseInt(v.mal_anime_id, 10)))];

        console.log(`📦 Envoi du lot ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(withMalId.length / BATCH_SIZE)} (${malIds.length} IDs MAL)...`);
        const anilistMap = await fetchAniListByMalIds(malIds);

        for (const video of batch) {
          const malId = parseInt(video.mal_anime_id, 10);
          const match = anilistMap.get(malId);

          if (match) {
            await client.query(
              `UPDATE videos 
               SET anilist_id = $1, anilist_title = $2 
               WHERE id = $3`,
              [match.anilistId, match.anilistTitle, video.id]
            );
            matchedByMalIdCount++;
          } else {
            // Not found by MAL ID, try fallback by title
            withoutMalId.push(video);
          }
        }

        // Small pause between batches
        await sleep(250);
      }
      console.log(`✅ Passe 1 terminée : ${matchedByMalIdCount} vidéos reliées avec succès via MAL ID.\n`);
    }

    // --- PASSE 2 : Recherche unitaire par titre pour le reste ---
    if (withoutMalId.length > 0) {
      console.log(`--- PASSE 2 : Résolution par recherche de titre pour ${withoutMalId.length} vidéo(s) ---`);

      for (let idx = 0; idx < withoutMalId.length; idx++) {
        const video = withoutMalId[idx];
        // Only search AniList using explicit anime title (mal_title) or structured anime description
        // Never use video.title (the song name) as searchTitle!
        let searchTitle = video.mal_title;
        if (!searchTitle && video.description) {
          const descMatch = video.description.match(/(?:Opening|Ending|Insert Song)(?:\s+\d+)?\s*[-–:]\s*(.+)/i);
          if (descMatch && descMatch[1]) {
            searchTitle = descMatch[1].trim();
          }
        }

        if (!searchTitle || searchTitle.trim().length < 2) {
          notFoundVideos.push(video);
          continue;
        }

        process.stdout.write(`🔍 [${idx + 1}/${withoutMalId.length}] Recherche pour "${searchTitle}"... `);
        const match = await searchAniListByTitle(searchTitle);

        if (match) {
          await client.query(
            `UPDATE videos 
             SET anilist_id = $1, 
                 anilist_title = $2,
                 mal_anime_id = COALESCE(mal_anime_id, $3)
             WHERE id = $4`,
            [match.anilistId, match.anilistTitle, match.idMal, video.id]
          );
          matchedByTitleCount++;
          process.stdout.write(`✅ Trouvé -> AniList ID ${match.anilistId} ("${match.anilistTitle}")\n`);
        } else {
          notFoundVideos.push(video);
          process.stdout.write(`❌ Non trouvé\n`);
        }

        // Respect AniList 90 req/min rate limit on sequential searches
        await sleep(350);
      }
      console.log(`✅ Passe 2 terminée : ${matchedByTitleCount} vidéos reliées via recherche de titre.\n`);
    }

    // --- RÉCAPITULATIF FINAL ---
    console.log('====================================================');
    console.log('🎉 BILAN DE LA MIGRATION ANILIST');
    console.log('====================================================');
    console.log(`Total vidéos analysées             : ${videosToProcess.length}`);
    console.log(`Reliées avec succès via ID MAL     : ${matchedByMalIdCount}`);
    console.log(`Reliées avec succès via Titre      : ${matchedByTitleCount}`);
    console.log(`Total nouvellement associées       : ${matchedByMalIdCount + matchedByTitleCount}`);
    console.log(`Non trouvées / À vérifier          : ${notFoundVideos.length}`);

    if (notFoundVideos.length > 0) {
      console.log('\n⚠️ Vidéos n\'ayant pas pu être reliées automatiquement :');
      notFoundVideos.slice(0, 10).forEach((v) => {
        console.log(`   - [ID: ${v.id}] YT: "${v.youtube_id}" | Titre: "${v.title}" | MAL Titre: "${v.mal_title || 'N/A'}"`);
      });
      if (notFoundVideos.length > 10) {
        console.log(`   ... et ${notFoundVideos.length - 10} autres.`);
      }
    }
    console.log('====================================================\n');

    return {
      success: true,
      processed: videosToProcess.length,
      matchedByMalId: matchedByMalIdCount,
      matchedByTitle: matchedByTitleCount,
      unmatchedCount: notFoundVideos.length,
    };
  } catch (error) {
    console.error('❌ Erreur critique lors de la migration AniList :', error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow direct CLI execution: node src/db/migrate_anilist.js [--force]
if (process.argv[1] && process.argv[1].includes('migrate_anilist')) {
  const force = process.argv.includes('--force');
  runAniListMigration({ force })
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
