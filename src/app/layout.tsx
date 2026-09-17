import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BEL SENTINEL — Blockchain-Based Secure Platform for Identity, Access Control & Digital Asset Management",
  description: "Enterprise-grade blockchain security platform unifying decentralized identity, role-based access control, digital asset lifecycle management, and immutable audit trails. Built with Next.js, Go, Solidity, Supabase, and IPFS.",
  keywords: ["blockchain", "identity", "access control", "digital assets", "security", "RBAC", "DID", "NFT", "IPFS", "audit trail"],
  authors: [{ name: "BEL SENTINEL" }],
  openGraph: {
    title: "BEL SENTINEL — Blockchain Security Platform",
    description: "Secure Identity. Verifiable Access. Immutable Asset Traceability.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} dark`}>
      <body className="min-h-screen bg-[#0a0614] text-[#e8e4f0] antialiased">
        {children}
      </body>
    </html>
  );
}
