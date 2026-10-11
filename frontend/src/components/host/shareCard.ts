import type { GameSession, VideoResult } from '../../../../shared/types';

// Shareable picture of the results of a game, drawn on a canvas: no server round trip and no dependency

export interface ShareCardEntry {
  rank: number;
  title: string;
  artistName?: string;
  youtubeId: string;
  score: number;
  votesCount: number;
}

export interface ShareCardData {
  // Twitch channel first, then the pseudo of the host, then nothing
  name: string | null;
  nameKind: 'twitch' | 'host' | null;
  // Which votes the picture is about: the Twitch chat as soon as it voted, the room otherwise
  source: 'twitch' | 'room';
  top: ShareCardEntry[];
  worst: ShareCardEntry | null;
  average: number;
  ratedCount: number;
}

export function buildShareCardData(session: GameSession, hostCustomName: string): ShareCardData {
  const results: VideoResult[] = Object.values(session.results || {});
  const source: 'twitch' | 'room' = results.some((r) => (r.twitchVotesCount ?? 0) > 0) ? 'twitch' : 'room';

  const score = (r: VideoResult) => (source === 'twitch' ? r.twitchAverage ?? 0 : r.average ?? 0);
  const otherScore = (r: VideoResult) => (source === 'twitch' ? r.average ?? 0 : r.twitchAverage ?? 0);
  const votes = (r: VideoResult) => (source === 'twitch' ? r.twitchVotesCount ?? 0 : r.votesCount ?? 0);

  // A video nobody rated has no place in a ranking (it would always be "the worst one")
  const ranked = results
    .filter((r) => votes(r) > 0)
    .sort((a, b) => score(b) - score(a) || otherScore(b) - otherScore(a) || String(a.title || '').localeCompare(String(b.title || '')))
    .map((r, i) => ({
      rank: i + 1,
      title: r.title,
      artistName: r.artistName,
      youtubeId: r.youtubeId,
      score: score(r),
      votesCount: votes(r),
    }));

  const hostName = (session.players?.[session.hostPlayerId || '']?.name || hostCustomName || '').trim();
  const hasHostName = hostName !== '' && hostName.toUpperCase() !== 'HOST';

  return {
    name: session.twitchChannel || (hasHostName ? hostName : null),
    nameKind: session.twitchChannel ? 'twitch' : hasHostName ? 'host' : null,
    source,
    top: ranked.slice(0, 4),
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    average: ranked.length > 0 ? ranked.reduce((acc, r) => acc + r.score, 0) / ranked.length : 0,
    ratedCount: ranked.length,
  };
}

const WIDTH = 1080;
const PAD = 50;
const INNER = WIDTH - PAD * 2;
const TITLE_FONT = "'Cherry Bomb One', cursive";
const SITE_HOST = new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rate-it.fr').host;

type RowSize = 'big' | 'mid' | 'small';

const ROW_SIZES: Record<RowSize, { h: number; margin: number; badge: number; title: number; titleLines: number; artist: number; score: number }> = {
  big: { h: 220, margin: 22, badge: 44, title: 34, titleLines: 2, artist: 24, score: 64 },
  mid: { h: 150, margin: 18, badge: 38, title: 30, titleLines: 1, artist: 22, score: 54 },
  small: { h: 130, margin: 16, badge: 34, title: 28, titleLines: 1, artist: 20, score: 48 },
};

const PODIUM = [
  { size: 'big' as RowSize, bg: '#DCB253', label: '1ère place', disk: '/HOST/DiskOr.png' },
  { size: 'mid' as RowSize, bg: '#C4C4C4', label: '2ème place', disk: '/HOST/DiskArgent.png' },
  { size: 'mid' as RowSize, bg: '#CE8946', label: '3ème place', disk: '/HOST/DiskBronze.png' },
  { size: 'small' as RowSize, bg: '#FAF6EB', label: 'Mention honorable', disk: null },
];

function loadImage(src: string, crossOrigin = false): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// i.ytimg.com sends CORS headers, which keeps the canvas exportable. Not the URL used by the <img> tags
// of the page (img.youtube.com): the browser could serve it from its cache without those headers.
const loadThumbnail = (youtubeId: string) => loadImage(`https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/mqdefault.jpg`, true);

function roundedPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Box with the black outline of the site
function drawBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill;
  roundedPath(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#000';
  ctx.stroke();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let current = '';
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    const candidate = current ? `${current} ${words[i]}` : words[i];
    if (!current || ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    if (lines.length === maxLines - 1) {
      // Last line allowed: everything left goes on it, cut with an ellipsis
      current = words.slice(i).reduce((acc, word) => `${acc} ${word}`, current);
      break;
    }
    lines.push(current);
    current = words[i];
  }
  lines.push(current);
  return lines.map((line) => fitText(ctx, line, maxWidth));
}

function drawRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  entry: ShareCardEntry,
  options: {
    size: RowSize;
    bg: string;
    label: string;
    bodyFont: string;
    thumbnail: HTMLImageElement | null;
    disk?: HTMLImageElement | null;
    crown?: HTMLImageElement | null;
    scoreColor?: string;
    grayThumbnail?: boolean;
  }
) {
  const { h, margin, badge, title, titleLines, artist, score } = ROW_SIZES[options.size];
  const w = INNER;
  const radius = 28;

  drawBlock(ctx, x, y, w, h, radius, options.bg);

  // Vinyl disk cut by the bottom right corner, as on the podium cards of the leaderboard
  let diskReserve = 0;
  if (options.disk) {
    const d = h * 0.8;
    diskReserve = d * 0.45;
    ctx.save();
    roundedPath(ctx, x + 3, y + 3, w - 6, h - 6, radius - 3);
    ctx.clip();
    ctx.drawImage(options.disk, x + w - d * 0.55, y + h - d * 0.55, d, d * (options.disk.height / options.disk.width));
    ctx.restore();
  }

  // Thumbnail
  const th = h - margin * 2;
  const tw = Math.round((th * 16) / 9);
  const tx = x + margin;
  const ty = y + margin;
  ctx.save();
  roundedPath(ctx, tx, ty, tw, th, 16);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(tx, ty, tw, th);
  if (options.thumbnail) {
    const img = options.thumbnail;
    const scale = Math.max(tw / img.width, th / img.height);
    if (options.grayThumbnail) ctx.filter = 'grayscale(1) contrast(0.9)';
    ctx.drawImage(img, tx + (tw - img.width * scale) / 2, ty + (th - img.height * scale) / 2, img.width * scale, img.height * scale);
  }
  ctx.restore();
  roundedPath(ctx, tx, ty, tw, th, 16);
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#000';
  ctx.stroke();

  // Score, right aligned
  const scoreRight = x + w - diskReserve - 26;
  const scoreBaseline = y + h / 2 + score * 0.3 - 6;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.fillStyle = options.scoreColor || '#000';
  ctx.font = `700 ${Math.round(score * 0.42)}px ${options.bodyFont}`;
  const outOfWidth = ctx.measureText('/5').width;
  ctx.fillText('/5', scoreRight, scoreBaseline);
  ctx.font = `900 ${score}px ${options.bodyFont}`;
  const scoreText = entry.score.toFixed(2);
  const scoreWidth = ctx.measureText(scoreText).width + outOfWidth + 4;
  ctx.fillText(scoreText, scoreRight - outOfWidth - 4, scoreBaseline);
  ctx.font = `700 ${Math.round(score * 0.34)}px ${options.bodyFont}`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillText(`${entry.votesCount} ${entry.votesCount === 1 ? 'vote' : 'votes'}`, scoreRight, scoreBaseline + score * 0.5);

  // Rank badge and label
  const left = tx + tw + 22;
  const textWidth = scoreRight - scoreWidth - 20 - left;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#000';
  roundedPath(ctx, left, ty, badge * 1.25, badge, 10);
  ctx.fill();
  ctx.fillStyle = '#FAF6EB';
  ctx.font = `900 ${Math.round(badge * 0.56)}px ${options.bodyFont}`;
  ctx.textAlign = 'center';
  ctx.fillText(`#${entry.rank}`, left + badge * 0.625, ty + badge * 0.7);
  if (options.crown) {
    const c = badge * 0.9;
    ctx.save();
    ctx.translate(left + badge * 1.25, ty + 6);
    ctx.rotate(0.26);
    ctx.drawImage(options.crown, -c / 2, -c * 0.7, c, c);
    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.font = `900 ${Math.round(badge * 0.46)}px ${options.bodyFont}`;
  const label = fitText(ctx, options.label.toUpperCase(), textWidth - badge * 1.25 - 40);
  const labelX = left + badge * 1.25 + 14;
  const labelWidth = ctx.measureText(label).width + 24;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  roundedPath(ctx, labelX, ty + badge * 0.1, labelWidth, badge * 0.8, 9);
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#000';
  ctx.stroke();
  ctx.fillStyle = '#000';
  ctx.fillText(label, labelX + 12, ty + badge * 0.66);

  // Title and artist
  ctx.font = `900 ${title}px ${options.bodyFont}`;
  const lines = wrapText(ctx, entry.title || 'Sans titre', textWidth, titleLines);
  let baseline = ty + badge + 12 + title * 0.85;
  for (const line of lines) {
    ctx.fillText(line, left, baseline);
    baseline += title * 1.15;
  }
  if (entry.artistName) {
    ctx.font = `700 ${artist}px ${options.bodyFont}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillText(fitText(ctx, entry.artistName, textWidth), left, baseline - title * 0.15 + artist * 0.35);
  }
}

// Draws the tile as if it had been snapped in two: each half is cut along the same crack,
// then pushed apart and tilted its own way
function drawBroken(ctx: CanvasRenderingContext2D, tile: HTMLCanvasElement, x: number, y: number) {
  const w = tile.width;
  const h = tile.height;
  const crack = [
    [0.56, 0], [0.52, 0.18], [0.6, 0.34], [0.53, 0.52], [0.61, 0.7], [0.55, 0.86], [0.58, 1],
  ].map(([px, py]) => [px * w, py * h]);
  const halves = [
    { corners: [[0, 0], [0, h]], dx: -9, dy: 5, rotation: -0.02 },
    { corners: [[w, 0], [w, h]], dx: 11, dy: -3, rotation: 0.028 },
  ];

  for (const half of halves) {
    ctx.save();
    ctx.translate(x + w / 2 + half.dx, y + h / 2 + half.dy);
    ctx.rotate(half.rotation);
    ctx.translate(-w / 2, -h / 2);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(half.corners[0][0], half.corners[0][1]);
    for (const [px, py] of crack) ctx.lineTo(px, py);
    ctx.lineTo(half.corners[1][0], half.corners[1][1]);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(tile, 0, 0);
    ctx.restore();

    // Raw edge of the break
    ctx.beginPath();
    crack.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
    ctx.lineWidth = 6;
    ctx.lineJoin = 'miter';
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
  }
}

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.5;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// Triangle pattern of the site background (same path as DynamicBackground.tsx)
const PATTERN_PATH =
  'M35.569-17.373 22.959 4.468l-12.61-21.841Zm0 29.442-12.61 21.84-12.61-21.84Zm25-14.721-12.61 21.841-12.61-21.841zm0 29.441-12.61 21.842-12.61-21.842Zm-33.478 0L39.7 4.95l12.61 21.84zM10.569-2.652l-12.61 21.841-12.61-21.841Zm0 29.441-12.61 21.842-12.61-21.842Zm-33.478 0L-10.3 4.95l12.61 21.84zm25-14.72L14.7-9.773l12.61 21.842zm0 29.441L14.7 19.67l12.61 21.841z';
const PATTERN_TILE = { width: 50, height: 29.442, scale: 4 };

function drawBackground(ctx: CanvasRenderingContext2D, height: number) {
  ctx.fillStyle = '#24B3F1';
  ctx.fillRect(0, 0, WIDTH, height);

  const { width: tileW, height: tileH, scale } = PATTERN_TILE;
  const path = new Path2D(PATTERN_PATH);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 1;
  ctx.scale(scale, scale);
  for (let ty = 0; ty * scale < height; ty += tileH) {
    for (let tx = 0; tx * scale < WIDTH; tx += tileW) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.beginPath();
      ctx.rect(0, 0, tileW, tileH);
      ctx.clip();
      ctx.stroke(path);
      ctx.restore();
    }
  }
  ctx.restore();

  ctx.lineWidth = 16;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(8, 8, WIDTH - 16, height - 16);
}

export async function renderShareCard(data: ShareCardData): Promise<HTMLCanvasElement> {
  const bodyFont = getComputedStyle(document.body).fontFamily || 'sans-serif';
  await Promise.all([
    document.fonts.load(`48px ${TITLE_FONT}`),
    document.fonts.load(`900 32px ${bodyFont}`),
    document.fonts.load(`700 32px ${bodyFont}`),
  ]).catch(() => {});

  const [logo, crown, disks, thumbnails, worstThumbnail] = await Promise.all([
    loadImage('/LOGOS/RateItLogo.png'),
    loadImage('/HOST/Couronne.png'),
    Promise.all(data.top.map((_, i) => (PODIUM[i].disk ? loadImage(PODIUM[i].disk as string) : null))),
    Promise.all(data.top.map((entry) => loadThumbnail(entry.youtubeId))),
    data.worst ? loadThumbnail(data.worst.youtubeId) : null,
  ]);

  // Layout pass: the height of the picture follows what there is to show
  const GAP = 20;
  const headerBottom = 208;
  const nameHeight = data.name ? 64 + 26 : 0;
  const rowsHeight = data.top.reduce((acc, _, i) => acc + ROW_SIZES[PODIUM[i].size].h + GAP, 0);
  // The two halves of the broken tile are tilted: they need more room than a straight row
  const worstHeight = data.worst ? ROW_SIZES.small.h + GAP + 28 : 0;
  const averageHeight = 150;
  const height = headerBottom + nameHeight + rowsHeight + worstHeight + averageHeight + 100;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible sur ce navigateur');

  drawBackground(ctx, height);

  // Header: logo
  if (logo) ctx.drawImage(logo, (WIDTH - 340) / 2, 28, 340, 170);

  let y = headerBottom;

  // Streamer (or host) name
  if (data.name) {
    const isTwitch = data.nameKind === 'twitch';
    ctx.font = `900 34px ${bodyFont}`;
    ctx.textBaseline = 'alphabetic';
    const text = fitText(ctx, isTwitch ? `twitch.tv/${data.name}` : data.name, INNER - 160);
    const iconWidth = 44;
    const pillWidth = ctx.measureText(text).width + iconWidth + 60;
    const pillX = (WIDTH - pillWidth) / 2;
    drawBlock(ctx, pillX, y, pillWidth, 64, 32, isTwitch ? '#9146FF' : '#FFFFFF');
    if (isTwitch) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(pillX + 44, y + 32, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (crown) {
      ctx.drawImage(crown, pillX + 22, y + 10, 44, 44);
    }
    ctx.fillStyle = isTwitch ? '#FFFFFF' : '#000000';
    ctx.textAlign = 'left';
    ctx.fillText(text, pillX + 30 + iconWidth, y + 44);
    y += nameHeight;
  }

  // Top 4
  data.top.forEach((entry, i) => {
    const podium = PODIUM[i];
    drawRow(ctx, PAD, y, entry, {
      size: podium.size,
      bg: podium.bg,
      label: podium.label,
      bodyFont,
      thumbnail: thumbnails[i],
      disk: disks[i],
      crown: i === 0 ? crown : null,
    });
    y += ROW_SIZES[podium.size].h + GAP;
  });

  // Worst rating, broken in two
  if (data.worst) {
    const rowHeight = ROW_SIZES.small.h;
    const tile = document.createElement('canvas');
    tile.width = INNER + 6;
    tile.height = rowHeight + 6;
    const tileCtx = tile.getContext('2d');
    if (tileCtx) {
      drawRow(tileCtx, 3, 3, data.worst, {
        size: 'small',
        bg: '#FFB3B3',
        label: 'Pire note',
        bodyFont,
        thumbnail: worstThumbnail,
        scoreColor: '#990000',
        grayThumbnail: true,
      });
      drawBroken(ctx, tile, PAD - 3, y + 8);
    }
    y += worstHeight;
  }

  // Average
  const isTwitchSource = data.source === 'twitch';
  drawBlock(ctx, PAD, y, INNER, averageHeight, 28, '#1B1B1B');
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let labelX = PAD + 36;
  if (isTwitchSource) {
    ctx.fillStyle = '#9146FF';
    ctx.beginPath();
    ctx.arc(labelX + 11, y + 44, 11, 0, Math.PI * 2);
    ctx.fill();
    labelX += 34;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 30px ${bodyFont}`;
  ctx.fillText(isTwitchSource ? 'MOYENNE DU CHAT TWITCH' : 'MOYENNE DE LA ROOM', labelX, y + 55);

  const starRadius = 26;
  const starStep = 62;
  const starsX = PAD + 36 + starRadius;
  const starsY = y + 102;
  for (let i = 0; i < 5; i++) {
    const fill = Math.min(1, Math.max(0, data.average - i));
    const cx = starsX + i * starStep;
    starPath(ctx, cx, starsY, starRadius);
    ctx.fillStyle = '#3F3F46';
    ctx.fill();
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - starRadius, starsY - starRadius, starRadius * 2 * fill, starRadius * 2);
      ctx.clip();
      starPath(ctx, cx, starsY, starRadius);
      ctx.fillStyle = '#FEEC66';
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = '#A1A1AA';
  ctx.font = `700 22px ${bodyFont}`;
  ctx.fillText(
    `sur ${data.ratedCount} ${data.ratedCount === 1 ? 'titre noté' : 'titres notés'}`,
    starsX + 5 * starStep - starRadius + 14,
    starsY + 8
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 40px ${bodyFont}`;
  const outOfWidth = ctx.measureText('/5').width;
  ctx.fillText('/5', PAD + INNER - 36, y + 106);
  ctx.fillStyle = '#FEEC66';
  ctx.font = `96px ${TITLE_FONT}`;
  ctx.fillText(data.average.toFixed(2), PAD + INNER - 36 - outOfWidth - 10, y + 108);
  y += averageHeight;

  // Footer
  ctx.textAlign = 'center';
  ctx.font = `40px ${TITLE_FONT}`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#000';
  ctx.strokeText(SITE_HOST, WIDTH / 2, y + 66);
  ctx.fillStyle = '#FEEC66';
  ctx.fillText(SITE_HOST, WIDTH / 2, y + 66);

  return canvas;
}
