import type { Metadata, Viewport } from "next";
import "./globals.css";
import "react-day-picker/src/style.css";

export const metadata: Metadata = {
  title: "ラポーティアケーキ ご予約",
  description: "LINE 経由のホールケーキご予約フォーム（Team Rapportia デモ）",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
