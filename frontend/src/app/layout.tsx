import type { Metadata } from "next";
import { Exo, DynaPuff } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/lib/useSocket";
import DynamicBackground from "@/components/DynamicBackground";

const exo = Exo({
  variable: "--font-exo",
  subsets: ["latin"],
});

const dynapuff = DynaPuff({
  variable: "--font-dynapuff",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rate It - Anime Intro Rating Game",
  description: "Play with friends, vote on anime openings and endings, and see who has the best taste!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${exo.variable} ${dynapuff.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-black">
        <SocketProvider>
          <DynamicBackground>
            {children}
          </DynamicBackground>
        </SocketProvider>
      </body>
    </html>
  );
}

