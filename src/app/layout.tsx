import type { Metadata, Viewport } from "next";
import { APP_THEME_PREPAINT } from "@/lib/app-theme";
import { Geist_Mono, Inter, Instrument_Serif } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import { ConfirmProvider } from "@/components/confirm";
import "./globals.css";

// Inter as a variable font (all weights from one file); next/font adds a metric-matched fallback.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${BRAND.name}: Visual Website Feedback and QA Tool`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  applicationName: BRAND.name,
  creator: BRAND.name,
  publisher: BRAND.name,
  category: "technology",
  // Canonical URLs are set per page (lib/site.ts → pageMetadata); none here, so unlisted pages aren't marked as copies of "/".
  openGraph: { type: "website", siteName: BRAND.name, locale: "en_US", title: `${BRAND.name}: Visual Website Feedback and QA Tool`, description: BRAND.description },
  twitter: { card: "summary_large_image", title: `${BRAND.name}: Visual Website Feedback and QA Tool`, description: BRAND.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

/**
 * Some browser extensions (Bitdefender: bis_skin_checked, bis_register) tag elements while the page
 * loads, before React hydrates, and React reports the extra attributes as a hydration mismatch. Strip
 * those tags until the page has hydrated (a few seconds after load), then stop watching: after
 * hydration they're harmless. Capped, in case an extension keeps re-adding them.
 */
const EXTENSION_ATTR_GUARD = `(function(){var a=['bis_skin_checked','bis_register'],n=0,o=new MutationObserver(function(l){for(var i=0;i<l.length;i++){l[i].target.removeAttribute(l[i].attributeName);if(++n>50000)o.disconnect()}});o.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:a});addEventListener('load',function(){setTimeout(function(){o.disconnect()},5000)})})();`;

// Runs before paint: mark that JS is on (scroll reveals only hide content when it is).
const jsScript = `${EXTENSION_ATTR_GUARD}document.documentElement.classList.add('js');${APP_THEME_PREPAINT}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Dark by default (the marketing site is dark-only); the app can switch to light (see app-theme).
    <html lang="en" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsScript }} />
      </head>
      <body className={`${inter.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
