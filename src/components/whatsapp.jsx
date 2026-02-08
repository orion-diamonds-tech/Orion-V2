import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";

export function WhatsAppButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("main-content");

    const handleScroll = () => {
      if (!hero) return;
      const heroBottom = hero.getBoundingClientRect().bottom;
      setIsVisible(heroBottom < 0); // Show only after hero is out of view
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Delay unmount to allow fade-out animation
  useEffect(() => {
    if (isVisible) setShouldRender(true);
    else {
      const timeout = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [isVisible]);

  return (
    shouldRender && (
      <a
        href="https://wa.me/918380043510?text=Hi%20there!%20I%20need%20some%20help%20with%20a%20product%20on%20your%20website."
        target="_blank"
        rel="noopener noreferrer"
        className={`fixed bottom-6 right-6 flex items-center justify-center gap-2 bg-[#075E54] text-white px-6 py-3 rounded-full text-lg font-semibold shadow-lg hover:bg-green-600 hover:scale-105 transition-all duration-300
          sm:px-4 sm:py-2 sm:text-sm sm:gap-1 sm:bottom-4 sm:right-4
          transform transition-opacity duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
      >
        <FaWhatsapp className="w-6 h-6 sm:w-4 sm:h-4" />
        <span className="sm:hidden md:inline">Let us help you out</span>
      </a>
    )
  );
}
