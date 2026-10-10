import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Cookie, Database, ExternalLink, Film, Layers, Lock, Mail, Music, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Confidentialité',
  description:
    'Ce que Rate It enregistre (des notes anonymes), ce qui reste dans votre navigateur, et ce que YouTube, Twitch, MyAnimeList et AniList reçoivent quand vous jouez.',
  alternates: { canonical: '/confidentialite' },
};

const LAST_UPDATE = '10 octobre 2026';
const CONTACT_EMAIL = 'malezethp@gmail.com';

// Everything the site writes in the visitor's browser (keep in sync with useSocket.tsx and playlists/new)
const BROWSER_STORAGE: { keys: string[]; what: string; why: string; until: string }[] = [
  {
    keys: ['rate_it_player_id'],
    what: 'Un identifiant de joueur tiré au hasard',
    why: 'Vous retrouver dans votre salle après un rafraîchissement ou une coupure réseau.',
    until: 'Tant que vous ne videz pas les données du site',
  },
  {
    keys: ['rate_it_player_name', 'rate_it_host_name'],
    what: 'Votre pseudo',
    why: 'Le pré-remplir la prochaine fois.',
    until: 'Tant que vous ne videz pas les données du site',
  },
  {
    keys: ['rate_it_player_session_id', 'rate_it_host_session_id'],
    what: 'Le code de la salle en cours',
    why: 'Vous y reconnecter automatiquement.',
    until: 'Jusqu’à ce que vous quittiez la salle',
  },
  {
    keys: ['rate_it_host_token', 'rate_it_player_token_…'],
    what: 'Une clé secrète propre à la salle',
    why: 'Empêcher quelqu’un d’autre de prendre votre place d’hôte ou de joueur.',
    until: 'Jusqu’à ce que vous quittiez la salle',
  },
  {
    keys: ['rate_it_playlist_draft'],
    what: 'Le brouillon de la playlist que vous créez',
    why: 'Ne pas tout perdre si l’onglet se ferme.',
    until: 'Jusqu’à l’enregistrement ou l’effacement du brouillon',
  },
  {
    keys: ['rate_it_host_mode_chosen'],
    what: 'Le mode choisi dans le lobby (playlist ou liste d’animés)',
    why: 'Ne pas vous reposer la question à chaque rechargement.',
    until: 'Fermeture de l’onglet',
  },
];

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-black pb-3">
      {icon}
      <h2 className="text-lg sm:text-xl font-black uppercase text-black">{children}</h2>
    </div>
  );
}

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black inline-flex items-baseline gap-1">
      {children}
      <ExternalLink className="w-3 h-3 self-center shrink-0" />
    </a>
  );
}

export default function ConfidentialitePage() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-start bg-transparent px-3 sm:px-6 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-4xl z-10 flex flex-col gap-6 sm:gap-8">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-[#DD4DCC] shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-4xl font-title uppercase tracking-wider text-black">
                Confidentialité
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Ce que le site sait de vous, ce qu’il garde, et ce qui part chez les autres
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 self-start sm:self-auto shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l’accueil</span>
          </Link>
        </div>

        {/* The short version */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-4 bg-[#2fc355] border-2 border-black rounded-2xl text-black">
            <span className="block font-title uppercase text-lg leading-tight">Pas de compte</span>
            <span className="block text-xs font-bold mt-1">Ni e-mail, ni mot de passe. Un pseudo suffit, et il peut être n’importe quoi.</span>
          </div>
          <div className="p-4 bg-[#24B3F1] border-2 border-black rounded-2xl text-black">
            <span className="block font-title uppercase text-lg leading-tight">Pas de pub</span>
            <span className="block text-xs font-bold mt-1">Rate It n’affiche aucune publicité et ne vend rien à personne. Celles de YouTube ne dépendent pas de moi.</span>
          </div>
          <div className="p-4 bg-[#DD4DCC] border-2 border-black rounded-2xl text-white">
            <span className="block font-title uppercase text-lg leading-tight">Pas de pistage</span>
            <span className="block text-xs font-bold mt-1">Aucun outil de mesure d’audience, aucun profil, aucun suivi d’un site à l’autre.</span>
          </div>
        </div>

        {/* Section 1: Server side */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left">
          <SectionTitle icon={<Database className="w-5 h-5 text-[#24B3F1]" />}>1. Ce que le serveur enregistre</SectionTitle>

          <div className="flex flex-col gap-5 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">Pendant la partie</h3>
              <p>
                Une salle contient les pseudos des joueurs, leurs notes et la liste des vidéos. Elle vit en mémoire sur le serveur
                et s’efface toute seule <strong>deux heures après la dernière action</strong>, ou tout de suite si l’hôte la ferme.
                C’est le seul endroit où votre pseudo existe côté serveur. Même chose pour les viewers Twitch qui votent dans le chat
                d’un hôte : leur pseudo Twitch ne sert qu’à compter une note par personne, le temps de la partie.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">Après la partie : les notes</h3>
              <p>
                Les notes sont conservées pour afficher la moyenne historique d’un titre et les statistiques des playlists,
                mais <strong>sans aucun nom</strong> : ni pseudo de joueur, ni pseudo Twitch. Il reste la note, la vidéo, la playlist,
                le code de la salle et la date. Rien là-dedans ne permet de dire qui a voté quoi, pas même à moi.
              </p>
              <p className="mt-1">
                Jusqu’en octobre 2026, le pseudo était enregistré avec chaque note alors qu’il ne servait à rien. Ces pseudos ont été effacés.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">Les playlists</h3>
              <p>
                Une playlist créée sur le site (nom, description, titres) est publique et n’est rattachée à personne :
                le site ne sait pas qui l’a créée. Seul le code secret remis à la création permet de la modifier.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">Votre adresse IP</h3>
              <p>
                Elle sert, le temps de votre visite, à bloquer les abus (trop de requêtes, tentatives de connexion à l’administration).
                Elle n’est rattachée ni à vos notes ni à votre pseudo. Comme sur n’importe quel site, elle apparaît dans les
                journaux techniques du serveur.
              </p>
            </div>

            <p className="p-3 bg-white border-2 border-black rounded-xl text-slate-800">
              Ces traitements reposent sur mon intérêt légitime à faire fonctionner le jeu, à afficher ses statistiques et à le protéger.
              Rien n’est transmis ni vendu à qui que ce soit. Tout est stocké sur un serveur loué à OVH, à Strasbourg.
            </p>
          </div>
        </div>

        {/* Section 2: Browser side */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left">
          <SectionTitle icon={<Cookie className="w-5 h-5 text-amber-500" />}>2. Ce qui reste dans votre navigateur</SectionTitle>

          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
            Rate It ne dépose <strong>aucun cookie</strong> chez les joueurs et les hôtes. Il range en revanche quelques informations
            dans le stockage local du navigateur, uniquement pour que le jeu fonctionne. Elles ne servent ni à vous suivre ni à
            faire de la publicité, et c’est pour cette raison que le site ne vous demande pas d’accord pour elles.
          </p>

          <div className="flex flex-col gap-2.5">
            {BROWSER_STORAGE.map((item) => (
              <div key={item.keys[0]} className="p-3 sm:p-4 bg-white border-2 border-black rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-4 text-xs font-bold text-slate-700">
                <div className="sm:col-span-4">
                  <span className="block font-black text-black text-xs sm:text-sm">{item.what}</span>
                  <span className="block mt-1 font-mono text-[10px] text-slate-500 break-all">{item.keys.join(' · ')}</span>
                </div>
                <p className="sm:col-span-5 leading-relaxed">{item.why}</p>
                <p className="sm:col-span-3 leading-relaxed text-slate-500 sm:text-right">{item.until}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-2 border-black rounded-2xl text-xs font-bold text-slate-700 leading-relaxed">
            <h3 className="font-black text-black text-xs uppercase mb-1">Et l’administrateur ?</h3>
            <p>
              Le seul cookie du site s’appelle <code className="font-mono">rate_it_admin</code>. Il n’est posé que sur le navigateur de
              l’administrateur, après sa connexion, et expire au bout de douze heures. Si vous n’administrez pas Rate It, vous ne le
              verrez jamais.
            </p>
          </div>

          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            Pour tout effacer : videz les données du site depuis les réglages de votre navigateur. Vous repartirez avec un nouvel
            identifiant de joueur à la prochaine visite.
          </p>
        </div>

        {/* Section 3: Third parties */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left">
          <SectionTitle icon={<Film className="w-5 h-5 text-red-600" />}>3. Ce qui part chez les autres</SectionTitle>

          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
            Rate It n’héberge aucune vidéo. Pour jouer, votre navigateur parle donc directement à d’autres services,
            qui appliquent leurs propres règles.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* YouTube Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-black text-sm uppercase">YouTube (Google)</h3>
              </div>
              <div className="text-xs font-bold text-slate-600 leading-relaxed flex flex-col gap-1.5">
                <p>
                  Rate It utilise les services d’API YouTube : les vidéos sont lues par le lecteur YouTube intégré, et les miniatures
                  des playlists et du classement sont chargées depuis YouTube. Dès qu’un lecteur ou une miniature s’affiche, Google
                  reçoit votre adresse IP et des informations sur votre navigateur, et peut déposer ses propres cookies ou traceurs.
                </p>
                <p>
                  Le lecteur est chargé en <strong>mode confidentialité renforcée</strong> (<code className="font-mono">youtube-nocookie.com</code>) :
                  d’après Google, ce que vous regardez ici n’influence pas vos recommandations YouTube et les publicités affichées
                  ne sont pas personnalisées. Ces publicités, quand il y en a, sont celles de YouTube : je ne les choisis pas et
                  n’en tire aucun revenu.
                </p>
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-slate-800">
                  <OutLink href="http://www.google.com/policies/privacy">Règles de confidentialité de Google</OutLink>
                  <OutLink href="https://www.youtube.com/t/terms">Conditions d’utilisation de YouTube</OutLink>
                </p>
              </div>
            </div>

            {/* Twitch Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-black text-sm uppercase">Twitch</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Quand un hôte relie sa chaîne, le serveur de Rate It lit les messages publics de son chat pour y repérer les notes
                (de 1 à 5). Aucun message n’est conservé, et les notes sont enregistrées sans le pseudo de leur auteur.
                Votre navigateur, lui, ne contacte pas Twitch.
              </p>
            </div>

            {/* Anime lists Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-black text-sm uppercase">MyAnimeList & AniList</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Si vous importez une liste d’animés, le pseudo que vous saisissez est envoyé par le serveur à MyAnimeList ou AniList
                pour lire la liste publique correspondante. Ce pseudo n’est pas enregistré.
              </p>
            </div>
          </div>

          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            Google et Twitch sont des entreprises américaines : les données qu’elles reçoivent peuvent être traitées hors de l’Union européenne.
            Les polices d’écriture du site sont, elles, servies depuis Rate It : aucun appel à Google Fonts.
          </p>
        </div>

        {/* Section 4: Rights */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-5 text-left">
          <SectionTitle icon={<Scale className="w-5 h-5 text-[#2fc355]" />}>4. Vos droits</SectionTitle>

          <div className="flex flex-col gap-3 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
            <p>
              Vous pouvez me demander ce que le site conserve à votre sujet, le faire corriger ou le faire supprimer, et vous opposer
              à sa conservation. En pratique il n’y a presque rien à chercher : les notes sont anonymes, et votre pseudo disparaît
              avec la salle, deux heures au plus après la partie.
            </p>
            <p>
              Ce qui peut rester à votre nom, c’est ce que vous avez écrit vous-même dans une playlist publique (son titre, sa description).
              Envoyez-moi son code et je la corrige ou la supprime. Je suis le seul responsable de ce traitement, et je réponds dans un délai d’un mois.
            </p>
          </div>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="p-4 bg-white border-2 border-black rounded-2xl flex items-center justify-between gap-3 btn-action-hover group text-black sm:max-w-md"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 bg-[#24B3F1] text-black border-2 border-black rounded-xl flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left min-w-0">
                <span className="block text-[10px] font-black uppercase text-slate-500">Une demande, une question</span>
                <span className="block text-xs sm:text-sm font-black text-black group-hover:text-[#24B3F1] transition-colors truncate">
                  {CONTACT_EMAIL}
                </span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black shrink-0" />
          </a>

          <p className="text-xs font-bold text-slate-600 leading-relaxed">
            Si ma réponse ne vous convient pas, vous pouvez saisir la CNIL : <OutLink href="https://www.cnil.fr/fr/plaintes">cnil.fr/fr/plaintes</OutLink>
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 pt-2 pb-8">
          <p className="text-[11px] font-bold text-slate-700 text-center">
            Dernière mise à jour : {LAST_UPDATE} · <Link href="/cgu" className="underline underline-offset-2 hover:text-black">CGU & Crédits</Link>
          </p>
          <Link
            href="/"
            className="px-8 py-3.5 bg-[#24B3F1] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à l’accueil</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
