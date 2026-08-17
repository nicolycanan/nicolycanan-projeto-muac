import type { Metadata } from "next";

// Self-hosted via @fontsource (npm) rather than next/font/google, so the
// build has no runtime dependency on fonts.googleapis.com.
//
// Handwritten display face — closest available match to the brand's
// hand-lettered identity (the source .zip did not include the actual
// font file, only mockups + artwork). Swap this for the real face later
// by dropping the .woff2 in /public/fonts and pointing --font-hand at it
// in globals.css — nothing else in the codebase needs to change.
import "@fontsource/schoolbell/400.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/work-sans/400.css";
import "@fontsource/work-sans/500.css";
import "@fontsource/work-sans/600.css";
import "./globals.css";
import { ThemeProvider, themeInitScript } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const siteUrl = "https://muac.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "MUAC",
    template: "%s — MUAC",
  },
  description:
    "Isso não é um editorial, é um acervo pessoal no qual decidi compartilhar com o mundo. Um arquivo digital de pessoas, música e histórias, por Nicoly.",
  openGraph: {
    title: "MUAC",
    description: "Um arquivo digital pessoal — pessoas, música, histórias.",
    url: siteUrl,
    siteName: "MUAC",
    images: ["/images/carpa.png"],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MUAC",
    description: "Um arquivo digital pessoal — pessoas, música, histórias.",
    images: ["/images/carpa.png"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <a href="#main" className="skip-link">
            Pular para o conteúdo
          </a>
          <div className="grain" aria-hidden="true" />
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
