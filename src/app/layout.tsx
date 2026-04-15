import type { Metadata } from "next";
import { Inter, Geist_Mono, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Next Level Mock - AI Interview Practice",
  description: "Sharpen your technical interview skills with AI-powered mock interviews on Next Level Mock",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Clash Display — geometric display font for readiness scores and page titles */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/clash-display@0.1.0/index.css"
        />
        {/* Theme boot — set data-theme before paint to avoid light->dark flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nlm-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
