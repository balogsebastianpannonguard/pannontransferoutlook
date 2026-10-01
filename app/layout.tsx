import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Playfair_Display, Roboto } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-custom-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-outlook",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Pannon Transfer · Naptár",
  description:
    "Pannon Transfer diszpécseri naptár Outlook-stílusban: utak, sofőrök és járművek egy helyen.",
  applicationName: "PT Naptár",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PT Naptár",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f6cbd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body
        className={`${geistMono.variable} ${inter.variable} ${playfair.variable} ${roboto.variable} antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
