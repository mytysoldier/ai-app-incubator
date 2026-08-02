import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "AI App Incubator | アイデアを実装できるMVPへ",
    template: "%s | AI App Incubator",
  },
  description: "アプリアイデアを実装可能なMVPへ整理する企画支援アプリ",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    title: "AI App Incubator | アイデアを実装できるMVPへ",
    description: "アプリアイデアを実装可能なMVPへ整理する企画支援アプリ",
    siteName: "AI App Incubator",
  },
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
