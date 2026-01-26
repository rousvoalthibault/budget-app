"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

const phrases = [
  "Making it beautiful",
  "Connecting the pieces",
  "Crafting your vision",
  "Adding the magic",
  "Almost there",
];

export default function Home() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  // Rotate phrases every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#020008]">
      {/* Sunset Horizon gradient */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: 0.25,
          background: `radial-gradient(
            ellipse 200% 100% at 50% 100%,
            #020101 0%,
            #0a0402 10%,
            #200a04 18%,
            #501808 24%,
            #a03010 30%,
            #e05020 34%,
            #ff8040 38%,
            #ffb070 42%,
            #ffd0a0 46%,
            #e0a0c0 50%,
            #b060a0 54%,
            #8a3090 58%,
            #6b2080 62%,
            #4a1a6b 68%,
            #2d1054 75%,
            #1a0a3d 84%,
            #0a0020 92%,
            #020008 100%
          )`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-4 px-4 text-center">
        {/* Asterisk with glow effect */}
        <div className="relative flex items-center justify-center">
          {/* Glowing background SVG */}
          <motion.div
            className="absolute blur-md"
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Image
              src="/codewords-asterisk.svg"
              alt=""
              width={40}
              height={40}
              aria-hidden="true"
            />
          </motion.div>

          {/* Main Asterisk SVG */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Image
              src="/codewords-asterisk.svg"
              alt="Loading"
              width={40}
              height={40}
              priority
            />
          </motion.div>
        </div>

        {/* Rotating phrases */}
        <div className="relative h-6 w-72">
          <AnimatePresence mode="wait">
            <motion.p
              key={phraseIndex}
              className="absolute inset-0 flex items-center justify-center font-mono text-sm text-white/80"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              {phrases[phraseIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
