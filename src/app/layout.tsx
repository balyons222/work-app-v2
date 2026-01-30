import type { Metadata } from "next";
// 1. CHANGE THIS LINE: Import Montserrat instead of Inter
import { Montserrat } from "next/font/google"; 
import "./globals.css";
import Navbar from "@/components/Navbar"; // (Adjust path if needed)
import Footer from "@/components/Footer"; // (Adjust path if needed)
import { Toaster } from 'react-hot-toast';

// 2. CHANGE THIS LINE: Configure the new font
const font = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FxD Events",
  description: "F x D = WORK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 3. CHANGE THIS LINE: Apply the font class to the body */}
      <body className={font.className}>
        <Navbar />
        {children}
        <Footer />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
