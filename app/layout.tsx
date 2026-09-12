import type { Metadata } from "next";
import { Unbounded, Figtree } from "next/font/google";
import "./globals.css";
import { LangProvider } from "@/lib/i18n/context";
import { getLangFromCookies } from "@/lib/i18n/server";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Dramahub — Doramas em Full HD",
  description:
    "K-Dramas, C-Dramas e filmes asiáticos com legendas em português, coreano e inglês.",
};

export default async function RootLayout({
  children,
}: LayoutProps<"/">) {
  const lang = await getLangFromCookies();

  return (
    <html
      lang={lang}
      className={`${unbounded.variable} ${figtree.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text">
        <LangProvider initialLang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
