"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

export function InstallAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if device is iOS
    const checkIsIOS = () => {
      return (
        ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(navigator.platform) ||
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
      );
    };
    setIsIOS(checkIsIOS());

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    const link = document.createElement("a");
    link.href = "/Orbit Sheet - All education materials in one place.apk";
    link.download = "OrbitSheet.apk"; // optional rename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Always show button to ensure requirement is met, handle click appropriately based on state
  return (
    <div className="flex justify-center my-12 relative z-50">
      <button
        onClick={handleInstallClick}
        className="group flex items-center gap-3 bg-gradient-to-r from-green-300 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <Download className="w-6 h-6 animate-bounce group-hover:animate-none" />
        <span className="text-lg">Download App</span>
      </button>
    </div>
  );
}
