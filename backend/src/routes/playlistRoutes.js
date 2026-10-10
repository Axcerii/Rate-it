import { Router } from 'express';
import {
  getPlaylistsList,
  getPlaylistById,
  createPlaylistRecord,
  getAllCategories,
} from '../services/playlistService.js';
import { getAdminSessionToken, isValidAdminSession } from '../utils/security.js';
import { consumeRateLimit, PLAYLIST_WRITE_LIMIT } from '../utils/rateLimiter.js';

const router = Router();

// Playlist creation budget per IP, shared with the playlist:create / playlist:update_with_secret socket events
function checkCreationRateLimit(ip) {
  return consumeRateLimit('playlist:write', ip, PLAYLIST_WRITE_LIMIT);
}

/**
 * GET /api/playlists/categories
 * Returns active categories list
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await getAllCategories();
    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=120');
    return res.status(200).json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des catégories',
    });
  }
});

/**
 * GET /api/playlists
 * Returns all validated and community playlists + dynamic categories list.
 * Serves with HTTP Cache-Control headers for CDN / browser caching.
 */
router.get('/', async (req, res) => {
  try {
    // Admin view (with secret codes) only when asked for (?admin=1) by a browser holding an admin session.
    // The flag is not a secret: the session cookie is what grants access.
    const isAdmin = Boolean(req.query.admin) && isValidAdminSession(getAdminSessionToken(req.headers.cookie));

    const [data, categories] = await Promise.all([
      getPlaylistsList({ isAdmin }),
      getAllCategories(),
    ]);

    // If public (not admin), set HTTP cache headers
    if (!isAdmin) {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
    } else {
      res.setHeader('Cache-Control', 'no-store');
    }

    return res.status(200).json({
      success: true,
      validated: data.validated,
      community: data.community,
      categories,
    });
  } catch (error) {
    console.error('Error fetching playlists via REST API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération des playlists',
    });
  }
});

/**
 * GET /api/playlists/:id
 * Returns playlist metadata and track list.
 * Serves with HTTP Cache-Control headers for CDN / browser caching.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = await getPlaylistById(id);

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=600');

    return res.status(200).json({
      success: true,
      playlist: data.playlist,
      videos: data.videos,
    });
  } catch (error) {
    const status = error.message === 'Playlist introuvable' ? 404 : 400;
    return res.status(status).json({
      success: false,
      error: error.message || 'Erreur lors de la récupération de la playlist',
    });
  }
});

/**
 * POST /api/playlists
 * Creates a new custom playlist.
 */
router.post('/', async (req, res) => {
  try {
    // req.ip follows "trust proxy": the address appended by the reverse proxy, not a client-supplied header
    const ip = req.ip || 'unknown';
    if (!checkCreationRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        error: 'Trop de playlists créées récemment. Veuillez patienter avant d\'en créer une autre.',
      });
    }

    const { name, description, videos, categories } = req.body;

    const result = await createPlaylistRecord({
      name,
      description,
      videos,
      categories,
    });

    res.setHeader('Cache-Control', 'no-store');
    return res.status(201).json(result);
  } catch (error) {
    console.error('Error creating custom playlist via REST API:', error);
    return res.status(400).json({
      success: false,
      error: error.message || 'Échec de la création de la playlist',
    });
  }
});

export default router;
