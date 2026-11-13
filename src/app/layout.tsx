import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { BRAND } from "@/lib/brand";
import { SITE_URL } from "@/lib/site";
import { ConfirmProvider } from "@/components/confirm";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
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
  themeColor: "#05070d",
  colorScheme: "dark",
};

// Runs before paint: mark that JS is on (scroll reveals only hide content when it is).
const jsScript = `document.documentElement.classList.add('js')`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // The site and the app are dark-only.
    <html lang="en" data-theme="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: jsScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
