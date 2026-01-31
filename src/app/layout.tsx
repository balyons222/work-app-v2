import type { Metadata } from "next";
import { Montserrat } from "next/font/google"; 
import "./globals.css";
import Navbar from "../components/Navbar"; 
import Footer from "../components/Footer"; 
import { Toaster } from 'react-hot-toast';

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
      <body className={font.className}>
        <Navbar />
        {children}
        <Footer />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
