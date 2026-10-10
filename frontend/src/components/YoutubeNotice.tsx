// Shown under every embedded YouTube player (YouTube API Services policies: link to YouTube's terms)
export default function YoutubeNotice({ className = '' }: { className?: string }) {
  const link = 'underline underline-offset-2 hover:text-black';

  return (
    <p className={`text-[10px] sm:text-[11px] font-bold text-slate-600 leading-snug ${className}`}>
      Vidéo lue par le lecteur YouTube, en mode confidentialité renforcée. La regarder ici vaut acceptation des{' '}
      <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className={link}>
        conditions de YouTube
      </a>
      .{' '}
      <a href="/confidentialite" target="_blank" rel="noopener noreferrer" className={link}>
        Ce que ça implique
      </a>
    </p>
  );
}
