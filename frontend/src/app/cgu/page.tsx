'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, Film, ExternalLink, ArrowLeft, Heart, Layers, Music, Info, Mail } from 'lucide-react';

export default function CGUPage() {
  const router = useRouter();

  return (
    <div className="relative flex flex-col flex-1 items-center justify-start bg-transparent px-3 sm:px-6 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-4xl z-10 flex flex-col gap-6 sm:gap-8">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10 text-[#24B3F1] shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-4xl font-black font-title uppercase tracking-wider text-black">
                CGU & Crédits
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Conditions Générales d'Utilisation, Mentions Légales et Remerciements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 text-black border-2 border-black font-black text-xs uppercase rounded-xl btn-action-hover inline-flex items-center justify-center gap-2 self-start sm:self-auto shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>
        </div>

        {/* Section 1: Conditions Générales d'Utilisation */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <Info className="w-5 h-5 text-[#24B3F1]" />
            <h2 className="text-lg sm:text-xl font-black uppercase text-black">
              1. Conditions Générales d'Utilisation (CGU)
            </h2>
          </div>

          <div className="flex flex-col gap-5 text-xs sm:text-sm font-bold text-slate-800 leading-relaxed">
            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 1 — Objet du Service
              </h3>
              <p className="text-slate-700">
                <strong>Rate It</strong> est une plateforme de divertissement en ligne gratuite permettant à des utilisateurs d'écouter, de noter en temps réel et de classer des extraits musicaux, génériques d'animés, bandes originales de films/séries ou morceaux musicaux issus de la plateforme YouTube.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 2 — Accès au Service & Gratuité
              </h3>
              <p className="text-slate-700">
                L'accès à Rate It est entièrement <strong>gratuit</strong> et ouvert à tous sans obligation de création de compte ou de carte bancaire. Chaque joueur peut créer ou rejoindre une salle simplement à l'aide d'un pseudonyme et d'un code de salle à 6 caractères ou d'un lien d'invitation.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 3 — Règles de Conduite & Fair-Play
              </h3>
              <p className="text-slate-700">
                Les utilisateurs s'engagent à adopter un comportement respectueux :
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                <li>Ne pas utiliser de pseudonymes offensants, injurieux, haineux, discriminatoires ou contraires aux lois en vigueur.</li>
                <li>Ne pas tenter de perturber le bon fonctionnement technique du service, des serveurs WebSocket ou des bases de données.</li>
                <li>L'administrateur se réserve le droit de modérer, supprimer des salons ou des playlists qui enfreindraient ces principes.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 4 — Propriété Intellectuelle & Contenus Tiers
              </h3>
              <p className="text-slate-700">
                Rate It <strong>n'héberge, ne stocke et ne télécharge aucun fichier vidéo ou audio</strong> sur ses propres serveurs.
              </p>
              <p className="text-slate-700 mt-1">
                Toutes les vidéos diffusées sont lues directement depuis les serveurs de <strong>YouTube</strong> via le lecteur officiel intégré (YouTube IFrame Player API) conformément aux Conditions d'Utilisation de YouTube. Les droits d'auteur des œuvres musicales, animés, films et visuels demeurent l'entière propriété exclusive de leurs auteurs, artistes, compositeurs, studios d'animation et maisons de disques respectifs.
              </p>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 5 — Données Personnelles & Confidentialité (RGPD)
              </h3>
              <p className="text-slate-700">
                Rate It respecte votre vie privée :
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-700">
                <li><strong>Aucune donnée personnelle sensible</strong> n'est collectée, conservée ni commercialisée à des tiers.</li>
                <li>L'application utilise uniquement le stockage local de votre navigateur (<code>localStorage</code>) pour mémoriser votre pseudonyme et vos préférences de session locale.</li>
                <li>Aucun traceur publicitaire intrusif n'est utilisé.</li>
              </ul>
            </div>

            <div>
              <h3 className="font-black text-black text-sm sm:text-base uppercase mb-1">
                Article 6 — Disponibilité & Responsabilité
              </h3>
              <p className="text-slate-700">
                Le service est fourni « tel quel », sans garantie d'accessibilité permanente ou ininterrompue. L'équipe de Rate It ne saurait être tenue responsable en cas d'indisponibilité momentanée des API tierces (YouTube, MyAnimeList, Twitch).
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Crédits & Remerciements */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg sm:text-xl font-black uppercase text-black">
              2. Crédits & Remerciements
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Project Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-black text-sm uppercase">Projet & Conception</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                <strong>Rate It</strong> a été développé avec passion pour offrir une expérience de jeu interactive, fluide et conviviale pour les soirées entre amis et les communautés de streaming.
              </p>
            </div>

            {/* YouTube Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-red-600" />
                <h3 className="font-black text-black text-sm uppercase">YouTube API & Lecteur</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Diffusion vidéo intégrée via l'API officielle YouTube IFrame Player & oEmbed. YouTube est une marque déposée de Google LLC.
              </p>
            </div>

            {/* MyAnimeList Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-black text-sm uppercase">MyAnimeList (MAL)</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Métadonnées, liaisons des animés et synchronisation optionnelle des listes de profils d'utilisateurs via MyAnimeList.
              </p>
            </div>

            {/* Twitch Card */}
            <div className="p-4 bg-white border-2 border-black rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-purple-600" />
                <h3 className="font-black text-black text-sm uppercase">Twitch Interactive Chat</h3>
              </div>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                Module de vote en direct pour les spectateurs et viewers Twitch via le protocole IRC officiel de Twitch.
              </p>
            </div>
          </div>

          {/* Resources & Open Source */}
          <div className="p-4 bg-slate-50 border-2 border-black rounded-2xl flex flex-col gap-2 text-xs font-bold text-slate-700">
            <h3 className="font-black text-black text-xs uppercase">Ressources Typographiques & Graphiques</h3>
            <p>
              • <strong>Typographies</strong> : Polices Google Fonts (<em>Exo</em> & <em>DynaPuff</em>).
              <br />
              • <strong>Icônes</strong> : <em>Lucide Icons</em> sous licence MIT.
              <br />
              • <strong>Identité Visuelle & Logo</strong> : Créations graphiques originales par le développeur du site Rate-It utilisant quelques images de bibliothèques.
              <br />
              • <strong> Développement & IA Générative </strong> : Rate-it a été entièrement développé par une seule personne dont c'est le métier. L'intelligence artificielle générative a été utilisée pour faciliter et accélérer le processus. Je comprends que cela puisse poser un problème d'éthique, je garantis, cependant, qu'aucune IA n'a été employée pour la création du contenu multimédia, des assets visuels, de la charte graphique, de la DA, du webdesign, ni même pour les playlists et la sélection des musiques. Tout cela provient directement des mains d'un développeur aux goûts douteux.
              <br />
              • <strong> Bibliothèque d'images </strong> : SVG de la chaîne "Join" : <a href="https://fr.vecteezy.com/art-vectoriel/29109029-noir-metal-chaine-sur-blanc-contexte" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">par MG Design</a>
              <br />
              SVG du chapeau de paille : <a href="https://fr.vecteezy.com/art-vectoriel/75407813-luffy-casquette-de-un-piece-film" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">par Eternalsof Design</a>
              <br />
              SVG de Video Player, Notation : <a href="https://undraw.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">undraw.co</a>
            </p>
          </div>
        </div>

        {/* Section 3: Contact & Retours */}
        <div className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-5 text-left">
          <div className="flex items-center gap-2 border-b-2 border-black pb-3">
            <Mail className="w-5 h-5 text-[#24B3F1]" />
            <h2 className="text-lg sm:text-xl font-black uppercase text-black">
              3. Contact & Retours
            </h2>
          </div>

          <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
            Pour me contacter, pour tout et n'importe quoi, voici mes canaux :
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Twitter Contact */}
            <a
              href="https://twitter.com/ryrynoceros"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 bg-white border-2 border-black rounded-2xl flex items-center justify-between gap-3 btn-action-hover group text-black"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#1DA1F2] text-white rounded-xl flex items-center justify-center font-black text-sm shrink-0 border border-black shadow-sm">
                  <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z" />
                  </svg>
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[10px] font-black uppercase text-slate-500">Twitter</span>
                  <span className="block text-xs sm:text-sm font-black text-black group-hover:text-[#1DA1F2] transition-colors truncate">
                    @ryrynoceros
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black shrink-0" />
            </a>

            {/* Email Contact */}
            <a
              href="mailto:malezethp@gmail.com"
              className="p-4 bg-white border-2 border-black rounded-2xl flex items-center justify-between gap-3 btn-action-hover group text-black"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#24B3F1] text-black border-2 border-black rounded-xl flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="text-left min-w-0">
                  <span className="block text-[10px] font-black uppercase text-slate-500">Courrier électronique</span>
                  <span className="block text-xs sm:text-sm font-black text-black group-hover:text-[#24B3F1] transition-colors truncate">
                    malezethp@gmail.com
                  </span>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-black shrink-0" />
            </a>
          </div>
        </div>

        {/* Bottom Return Button */}
        <div className="flex justify-center pt-2 pb-8">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-8 py-3.5 bg-[#24B3F1] text-black border-2 border-black font-black text-xs sm:text-sm uppercase rounded-xl btn-action-hover inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retourner à l'accueil</span>
          </button>
        </div>

      </div>
    </div>
  );
}
