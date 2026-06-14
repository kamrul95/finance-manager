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
      <body className={`${geist.className} antialiased bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white`}>
        {children}
      </body>
    </html>
  );
}
