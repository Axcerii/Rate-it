import React from 'react';

// Hand-drawn icons of the site (frontend/public/icons), exposed under the names of the generic
// lucide-react icons they replace: a file only has to import from '@/components/icons' instead.
//
// The drawings are black on a transparent background. They are used as a mask over a block filled
// with the current text colour, so an icon takes the colour of its text exactly like the generic
// ones did (text-white, text-slate-400, hover colours...) without one filter per colour.

type IconProps = Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>;

// Drawings that read too small once fitted in their box are shown bigger than it, without moving
// anything around them. To adjust one, change its number below: 1 = the box, 1.35 = 35% bigger.
const BIGGER = 1.35;

// rotation: degrees, for the drawings reused in several directions (one arrow for the four of them)
// scale: see BIGGER
function icon(file: string, { rotation = 0, scale = 1 }: { rotation?: number; scale?: number } = {}) {
  const transform = [rotation ? `rotate(${rotation}deg)` : '', scale !== 1 ? `scale(${scale})` : ''].filter(Boolean).join(' ');
  const url = `url("/Icons/${encodeURIComponent(file)}.png")`;
  const Icon = ({ className = '', style, ...rest }: IconProps) => (
    <span
      aria-hidden="true"
      {...rest}
      className={`rate-icon ${className}`}
      style={{
        WebkitMaskImage: url,
        maskImage: url,
        // `transform`, not the `rotate` / `scale` utilities: a caller can still turn or resize the icon with its own classes
        ...(transform ? { transform } : null),
        ...style,
      }}
    />
  );
  Icon.displayName = `Icon(${file})`;
  return Icon;
}

// --- Drawn as such ---
export const AlertTriangle = icon('AlertTriangle');
export const ArrowUpDown = icon('ArrowUpDown');
export const BarChart2 = icon('BarChart2');
export const Calendar = icon('Calendar');
export const Check = icon('Check');
export const CheckCircle2 = icon('CheckCircle2');
export const ChevronDown = icon('ChevronDown');
export const ChevronLeft = icon('ChevronLeft');
export const Clock = icon('Clock');
export const Cookie = icon('Cookie');
export const Copy = icon('Copy');
export const Crown = icon('Crown');
export const Database = icon('Database');
export const Download = icon('Download');
export const ExternalLink = icon('ExternalLink');
export const Eye = icon('Eye', { scale: BIGGER });
export const EyeOff = icon('EyeOff', { scale: BIGGER });
export const FastForward = icon('FastForward');
export const FileEdit = icon('FileEdit');
export const Film = icon('Film', { scale: BIGGER });
export const Filter = icon('Filter');
export const Folder = icon('Folder');
export const FolderX = icon('Folder X');
export const Gamepad2 = icon('Gamepad2');
export const Ghost = icon('Ghost');
export const Heart = icon('Heart');
export const Home = icon('Home');
export const Info = icon('Info');
export const Key = icon('Key');
export const LayoutList = icon('LayoutList');
export const ListPlus = icon('ListPlus');
export const Loader2 = icon('Loader');
export const Lock = icon('Lock');
export const LogOut = icon('LogOut', { scale: BIGGER });
export const Mail = icon('Mail');
export const Minus = icon('Minus');
export const Music = icon('Music');
export const Play = icon('Play');
export const Plus = icon('Plus');
export const QrCode = icon('QR Code');
export const Radio = icon('Radio');
export const Scale = icon('Scale');
export const Search = icon('Search');
export const Share2 = icon('Share2', { scale: BIGGER });
export const ShieldAlert = icon('ShieldAlert');
export const Shuffle = icon('Shuffle', { scale: BIGGER });
export const SkipForward = icon('SkipForward');
export const SlidersHorizontal = icon('SlidersHorizontal');
export const Star = icon('Star');
export const Tag = icon('Tag');
export const ThumbsUp = icon('ThumbsUp');
export const Tv = icon('Tv', { scale: BIGGER });
export const User = icon('User');
export const UserX = icon('UserX');
export const Users = icon('Users', { scale: BIGGER });
export const X = icon('X');
// The bass clef, saved under this file name
export const Music2 = icon('rate-it-resultats');

// --- One arrow drawing, turned ---
export const ArrowRight = icon('RightArrow');
export const ArrowDown = icon('RightArrow', { rotation: 90 });
export const ArrowLeft = icon('RightArrow', { rotation: 180 });
export const ArrowUp = icon('RightArrow', { rotation: -90 });

// --- No drawing of their own: the closest one ---
export const AlertOctagon = AlertTriangle;
export const Layers = Tag; // categories
export const MonitorPlay = Tv;
export const ListMusic = Music;
export const ImageIcon = Share2; // "share the results" button
export const Sliders = SlidersHorizontal;
export const Sparkles = Star;
export const Wand2 = Star;
export const Shield = ShieldAlert;
export const ShieldCheck = CheckCircle2;
export const Pencil = FileEdit;
export const PlusCircle = Plus;
export const RefreshCw = Loader2;
export const Trash2 = X;
export const XCircle = X;
