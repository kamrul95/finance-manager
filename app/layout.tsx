import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Manager",
  description: "Personal finance manager — track income, expenses, budgets, and goals",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body className={`${geist.className} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white`}>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`
        }} />
      </body>
    </html>
  );
}
