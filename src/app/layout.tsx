import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "請求書管理システム",
  description: "請求書・見積書を簡単に管理できるシステム",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // パスを取得してサイドバー非表示ページか判定
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";

  // サイドバーを表示しないパスのリスト
  const noSidebarPaths = [
    "/",
    "/login",
    "/signup",
    "/apply",
    "/forgot-password",
    "/reset-password",
  ];

  const shouldShowSidebar = user && !noSidebarPaths.includes(pathname);

  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        {shouldShowSidebar ? (
          <>
            <Sidebar />
            <main className="lg:ml-64 p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
