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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else if (isIOS) {
      alert("To install the app on iOS, tap the share icon at the bottom of the screen and select 'Add to Home Screen'.");
    } else {
      alert("App can be installed from your browser settings or it is already installed.");
    }
  };

  // Always show button to ensure requirement is met, handle click appropriately based on state
  return (
    <div className="flex justify-center my-12 relative z-50">
      <button
        onClick={handleInstallClick}
        className="group flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-full shadow-xl transition-all duration-300 transform hover:scale-105"
      >
        <Download className="w-6 h-6 animate-bounce group-hover:animate-none" />
        <span className="text-lg">Download App</span>
      </button>
    </div>
  );
}
