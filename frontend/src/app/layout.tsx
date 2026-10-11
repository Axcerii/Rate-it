import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { SocketProvider } from "@/lib/useSocket";
import DynamicBackground from "@/components/DynamicBackground";
import CookieNotice from "@/components/CookieNotice";
import BannerNotification from "@/components/BannerNotification";

// Body font of the whole site (titles use Cherry Bomb One)
const bodyFont = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
});

const cherryBombOne = localFont({
  src: "./fonts/CherryBombOne-Regular.ttf",
  variable: "--font-cherry-bomb-one",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://rate-it.fr'),
  title: {
    default: "Rate It - Jeu de Notation Musicale & Vote en Direct (Animés, Films, Musiques)",
    template: "%s | Rate It",
  },
  description: "Rejoignez une salle, écoutez les meilleurs génériques d'animés, BO de films et musiques cultes, et notez-les en direct avec vos amis ou votre chat Twitch !",
  keywords: [
    "Rate It",
    "Notation Anime",
    "Noter musiques de film",
    "Jeu de notation musicale",
    "Vote en direct musique",
    "Anime Music Rating",
    "Jeu multijoueur en ligne",
    "Party Game musical",
    "Noter opening anime",
    "Tier list musique en direct",
    "Classement musique entre amis",
    "MyAnimeList Quiz",
    "Jeu interactif Twitch musique",
    "Notation YouTube multijoueur",
  ],
  authors: [{ name: "Rate It Team" }],
  creator: "Rate It",
  publisher: "Rate It",
  applicationName: "Rate It",
  category: "Game",
  icons: {
    icon: "/LOGOS/Favicon.png",
    shortcut: "/LOGOS/Favicon.png",
    apple: "/LOGOS/Favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Rate It",
    title: "Rate It - Jeu de Notation Musicale & Vote en Direct (Animés, Films, Musiques)",
    description: "Qui a les meilleurs goûts musicaux ? Rejoignez une salle et notez en direct les génériques d'animés, musiques de films et morceaux cultes !",
    url: "/",
    images: [
      {
        url: "/LOGOS/RateItLogo.png",
        width: 1200,
        height: 630,
        alt: "Rate It - Jeu de notation et classement de musiques",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rate It - Jeu de Notation Musicale & Vote en Direct",
    description: "Rejoignez la partie en direct et notez les meilleures musiques avec vos amis ou votre chat Twitch !",
    images: ["/LOGOS/RateItLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Rate It",
  url: "https://rate-it.fr",
  description: "Jeu de notation musicale et de classement multijoueur en temps réel. Votez et classez les génériques d'animés, BO de films et musiques cultes avec vos amis ou votre communauté Twitch.",
  applicationCategory: "GameApplication",
  genre: "Music Rating / Party Game",
  operatingSystem: "All",
  browserRequirements: "Requires JavaScript",
  inLanguage: "fr",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bodyFont.variable} ${cherryBombOne.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
      </head>
      <body className="min-h-full flex flex-col text-black">
        <SocketProvider>
          <BannerNotification />
          <CookieNotice />
          <DynamicBackground>
            {children}
          </DynamicBackground>
        </SocketProvider>
      </body>
    </html>
  );
}

