import Image from "next/image";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Agency background image */}
      <div className="hidden md:flex md:w-1/2 bg-cover bg-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/90"></div>
        <div className="absolute top-10 left-10 z-10">
          <Image
            src="/barka-logo.svg"
            alt="Barka"
            width={200}
            height={200}
            priority
            className="Barka-logo"
          />
        </div>
        <div className="absolute bottom-10 left-10 text-white z-10 max-w-md">
          <h2 className="text-3xl font-bold mb-2">
            Streamline Your Client Onboarding
          </h2>
          <p className="text-gray-300">
            Barka helps design and software agencies transform their client
            onboarding experience with AI-powered automation.
          </p>
        </div>
        <Image
          height={1080}
          width={1920}
          src="/city-night.jpg"
          alt="Design agency workspace"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right side - Auth form */}
      <div className="w-full md:w-1/2 bg-black flex flex-col items-center justify-center p-8">
        <div className="md:hidden mb-8">
          <Image
            src="/barka-logo.png"
            alt="Barka"
            width={120}
            height={40}
            priority
            className="Barka-logo"
          />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
