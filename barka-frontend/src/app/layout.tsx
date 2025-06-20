import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"

const geistSans = localFont({
  src: "./fonts/Geist-Regular.ttf",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/Geist-Bold.ttf",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const supplyBold = localFont({
  src: "./fonts/Supply-Bold.otf",
  variable: "--font-supply-bold",
  weight: "100 900",
});

const supplyRegular = localFont({
  src: "./fonts/Supply-Regular.otf",
  variable: "--font-supply-regular",
  weight: "100 900",
});

const supplyMedium = localFont({
  src: "./fonts/Supply-Medium.otf",
  variable: "--font-supply-medium",
  weight: "100 900",
});

const supplyLight = localFont({
  src: "./fonts/Supply-Light.otf",
  variable: "--font-supply-light",
  weight: "100 900",
});



export const metadata: Metadata = {
  title: "Barka | AI Onboarding Agent for Design & Software Agencies",
  description: "Barka helps design agencies and software agencies streamline client onboarding with AI-powered automation.",
  icons: {
    icon: '/barka-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${supplyBold.variable} ${supplyRegular.variable} ${supplyMedium.variable} ${supplyLight.variable} antialiased bg-black`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
