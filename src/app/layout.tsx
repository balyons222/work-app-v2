import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/src/components/Navbar";
import Footer from "@/src/components/Footer";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gig Marketplace",
  description: "Find your next gig",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      {/* 2. Add flex classes to body so footer stays at bottom */}
      <body className={`${inter.className} flex flex-col min-h-screen`}>
       
       <Toaster position="bottom-right" />

        <Navbar />
        
        {/* Main content grows to fill space */}
        <main className="flex-grow">
          {children}
        </main>
        
        {/* 3. Add Footer here */}
        <Footer />
  
      </body>
    </html>
  );
}
