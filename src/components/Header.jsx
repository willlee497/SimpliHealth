"use client";
import React, { useEffect, useState } from "react";


export default function Header() {
  const [lastScrollY, setLastScrollY] = useState(0);
  const [hideHeader, setHideHeader] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        // scrolling down
        setHideHeader(true);
      } else {
        // scrolling up
        setHideHeader(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      className={`w-full sticky top-0 z-[200] bg-white text-black transition-transform duration-300 ${
        hideHeader ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="flex items-center space-x-2 px-4 bg-lime-900 justify-center">
        <img className="inline-block w-auto h-[2.5rem] md:h-[3rem] p-1" src = '/logoWhite.png' alt = 'SimpliHealth Logo'/> 
        <h1 className="text-white">SimpliHealth</h1>
      </div>
    </header>
  );
}