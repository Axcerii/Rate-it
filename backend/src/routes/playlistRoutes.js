import { Router } from 'express';
import {
  getPlaylistsList,
  getPlaylistById,
  createPlaylistRecord,
  getAllCategories,
} from '../services/playlistService.js';
import { verifyAdminCredential } from '../utils/security.js';

const router = Router();

// Rate limiter map for playlist creation by IP
const creationAttempts = new Map();
const MAX_CREATIONS_PER_WINDOW = 20; // max 20 playlists per 15 minutes per IP
const CREATION_WINDOW_MS = 15 * 60 * 1000;

function checkCreationRateLimit(ip) {
  const now = Date.now();
  const entry = creationAttempts.get(ip);
  if (!entry) {
    creationAttempts.set(ip, { count: 1, resetAt: now + CREATION_WINDOW_MS });
    return true;
  }
  if (now > entry.resetAt) {
    creationAttempts.set(ip, { count: 1, resetAt: now + CREATION_WINDOW_MS });
    return true;
  }
  if (entry.count >= MAX_CREATIONS_PER_WINDOW) {
    return false;
  }
  entry.count += 1;
  return true;
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
    // Admin credential (session token) travels in a header: query strings end up in proxy logs and history
    let isAdmin = false;
    const credential = req.get('x-admin-auth');

    if (credential) {
      try {
        verifyAdminCredential(credential.trim(), req.ip);
        isAdmin = true;
      } catch (_) {
        isAdmin = false;
      }
    }

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
