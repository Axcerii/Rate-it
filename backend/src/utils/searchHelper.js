import { escapeLikePattern, sanitizeText } from './security.js';

/**
 * Builds SQL conditions and parameter list for multi-word, order-independent video search.
 *
 * Features:
 * - Splits search query into discrete tokens.
 * - Handles number contractions (e.g., "op2" -> "op 2", "ed1" -> "ed 1").
 * - Alias/Synonym matching:
 *     - "op" / "opening" / "openings" matches: \m(op[0-9]*|opening[s]?)\M
 *     - "ed" / "ending" / "endings" matches: \m(ed[0-9]*|ending[s]?)\M
 *     - "ost" / "soundtrack" / "soundtracks" matches: \m(ost|soundtrack[s]?)\M
 * - Every word must match somewhere in the corpus (title, artist_name, description, mal_title, youtube_id).
 * - Safe against SQL injection & LIKE wildcards.
 *
 * @param {string} rawQuery - The user input search string
 * @param {number} [paramStartIndex=1] - Starting parameter placeholder index ($1, $2, ...)
 * @param {string} [tableAlias='v'] - Alias of the videos table (default 'v')
 * @returns {{ clause: string, params: any[], nextParamIndex: number }}
 */
export function buildVideoSearchConditions(rawQuery, paramStartIndex = 1, tableAlias = 'v') {
  const sanitized = sanitizeText(rawQuery, 100);
  if (!sanitized || !sanitized.trim()) {
    return { clause: '', params: [], nextParamIndex: paramStartIndex };
  }

  // Expand contractions like op2 -> op 2, ed1 -> ed 1, opening3 -> opening 3
  const processed = sanitized
    .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
    .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');

  // Split into tokens by whitespace and common punctuation delimiters
  const rawTokens = processed
    .split(/[\s,_\-:/\\+]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (rawTokens.length === 0) {
    return { clause: '', params: [], nextParamIndex: paramStartIndex };
  }

  const t = tableAlias ? `${tableAlias}.` : '';
  const corpus = `(COALESCE(${t}title, '') || ' ' || COALESCE(${t}artist_name, '') || ' ' || COALESCE(${t}description, '') || ' ' || COALESCE(${t}mal_title, '') || ' ' || COALESCE(${t}youtube_id, ''))`;

  const conditions = [];
  const params = [];
  let paramIndex = paramStartIndex;

  for (const token of rawTokens) {
    const lowerToken = token.toLowerCase();

    if (lowerToken === 'op' || lowerToken === 'opening' || lowerToken === 'openings') {
      // Matches OP, OP1, OP2, [OP], (OP), Opening, Openings, but NOT "pop", "stop", "cooperation"
      conditions.push(`${corpus} ~* $${paramIndex}`);
      params.push(`\\m(op[0-9]*|opening[s]?)\\M`);
      paramIndex++;
    } else if (lowerToken === 'ed' || lowerToken === 'ending' || lowerToken === 'endings') {
      // Matches ED, ED1, ED2, [ED], Ending, Endings, but NOT "red", "bed"
      conditions.push(`${corpus} ~* $${paramIndex}`);
      params.push(`\\m(ed[0-9]*|ending[s]?)\\M`);
      paramIndex++;
    } else if (lowerToken === 'ost' || lowerToken === 'soundtrack' || lowerToken === 'soundtracks') {
      conditions.push(`${corpus} ~* $${paramIndex}`);
      params.push(`\\m(ost|soundtrack[s]?)\\M`);
      paramIndex++;
    } else {
      // Standard token: match via ILIKE with escaped SQL LIKE special characters
      const escaped = escapeLikePattern(token);
      conditions.push(`${corpus} ILIKE $${paramIndex} ESCAPE '\\'`);
      params.push(`%${escaped}%`);
      paramIndex++;
    }
  }

  return {
    clause: conditions.join(' AND '),
    params,
    nextParamIndex: paramIndex,
  };
}
