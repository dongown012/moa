import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
});

const TITLE = "모아 — 소셜섹터 인덱스";
const DESCRIPTION =
  "비영리·사회적경제 뉴스, 채용, 지원사업, 행사, 교육을 매일 한 페이지로 모아 원문으로 연결합니다.";

export const metadata: Metadata = {
  metadataBase: new URL("https://moa-social.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    siteName: "모아",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  verification: {
    google: "D3L243bt85dYZf7y8hI-2hY3IDrku_xo_EzXpLnPhNU",
    other: { "naver-site-verification": "019cf1074c9c049a688b3d1c98cb6d5b22aca5cc" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={plexMono.variable}>
      <head>
        {/* SUIT Variable — 국문 가변 폰트 (CDN) */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
