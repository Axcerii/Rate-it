import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ExternalLink, Gamepad2, Info, Lock, Music, Tv } from '@/components/icons';
import faq from '@/content/faq.json';

export const metadata: Metadata = {
  title: 'FAQ - Questions fréquentes',
  description:
    'Comment lancer ou rejoindre une partie, créer une playlist, faire voter son chat Twitch, et ce que Rate It garde de vos données : les réponses aux questions fréquentes.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ - Questions fréquentes | Rate It',
    description: 'Tout ce qu’il faut savoir pour jouer, créer une playlist ou faire voter son chat Twitch sur Rate It.',
    url: '/faq',
  },
};

// Icons a category of faq.json can ask for with its "icon" field (Info when the name is unknown)
const CATEGORY_ICONS: Record<string, typeof Info> = { Gamepad2, Music, Tv, Lock, Info };

// Section colours of the site, given to the categories in turn
const CATEGORY_COLORS = [
  { bg: '#24B3F1', text: 'text-black' },
  { bg: '#2fc355', text: 'text-black' },
  { bg: '#DD4DCC', text: 'text-white' },
  { bg: '#0AC7B5', text: 'text-black' },
];

// The answers of faq.json accept two bits of markup: **bold** and [label](link)
const INLINE_MARKUP = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

function renderInline(text: string): React.ReactNode[] {
  return text.split(INLINE_MARKUP).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx} className="text-black">{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (!link) return part;
    const [, label, href] = link;
    if (href.startsWith('/')) {
      return <Link key={idx} href={href} className="underline underline-offset-2 hover:text-black font-black text-black">{label}</Link>;
    }
    return (
      <a key={idx} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black inline-flex items-baseline gap-1">
        {label}
        <ExternalLink className="w-3 h-3 self-center shrink-0" />
      </a>
    );
  });
}

// Same text without the markup, for search engines
function toPlainText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.categories.flatMap((category) =>
      category.questions.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer.map(toPlainText).join(' '),
        },
      }))
    ),
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-start bg-transparent px-3 sm:px-6 py-6 sm:py-12 font-sans w-full max-w-full overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <div className="w-full max-w-4xl z-10 flex flex-col gap-6 sm:gap-8">

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-black pb-4">
          <div className="flex items-center gap-3">
            <Info className="w-8 h-8 sm:w-10 sm:h-10 text-[#2fc355] shrink-0" />
            <div>
              <h1 className="text-2xl sm:text-4xl font-title uppercase tracking-wider text-black">
                FAQ
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Les questions qu’on me pose le plus souvent, et leurs réponses
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

        {/* Shortcuts to the categories */}
        <nav aria-label="Catégories de la FAQ" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {faq.categories.map((category, idx) => {
            const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
            return (
              <a
                key={category.id}
                href={`#${category.id}`}
                className={`p-4 border-2 border-black rounded-2xl btn-action-hover ${color.text}`}
                style={{ backgroundColor: color.bg }}
              >
                <span className="block font-title uppercase text-lg leading-tight">{category.title}</span>
                <span className="block text-xs font-bold mt-1">
                  {category.questions.length} question{category.questions.length > 1 ? 's' : ''}
                </span>
              </a>
            );
          })}
        </nav>

        {/* One card per category */}
        {faq.categories.map((category, idx) => {
          const Icon = CATEGORY_ICONS[category.icon] || Info;
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return (
            <section
              key={category.id}
              id={category.id}
              className="info-card p-6 sm:p-8 rounded-2xl sm:rounded-3xl flex flex-col gap-6 text-left scroll-mt-4"
            >
              <div className="flex items-center gap-2 border-b-2 border-black pb-3">
                <Icon className="w-5 h-5" style={{ color: color.bg }} />
                <h2 className="text-lg sm:text-xl font-black uppercase text-black">{category.title}</h2>
              </div>

              <div className="flex flex-col gap-3">
                {category.questions.map((item) => (
                  <details key={item.question} className="group bg-white border-2 border-black rounded-2xl">
                    <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-2xl focus-visible:outline-3 focus-visible:outline-black focus-visible:-outline-offset-3">
                      <h3 className="font-black text-black text-sm sm:text-base">{item.question}</h3>
                      <ChevronDown className="w-4 h-4 text-black transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="flex flex-col gap-2 px-4 pb-4 text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                      {item.answer.map((paragraph, pIdx) => (
                        <p key={pIdx}>{renderInline(paragraph)}</p>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}

        {/* Footer */}
        <div className="flex flex-col items-center gap-4 pt-2 pb-8">
          <p className="text-xs font-bold text-slate-700 text-center">
            Pas trouvé votre réponse ? Écrivez-moi depuis la page{' '}
            <Link href="/cgu" className="underline underline-offset-2 hover:text-black">CGU & Crédits</Link>
            {' '}· <Link href="/confidentialite" className="underline underline-offset-2 hover:text-black">Confidentialité</Link>
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
