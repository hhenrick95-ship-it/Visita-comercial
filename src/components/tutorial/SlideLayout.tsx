import { useEffect, useRef, useState, ReactNode } from "react";
import logoLopes from "@/assets/logo-lopes.png";

interface SlideLayoutProps {
  children: ReactNode;
  slideNumber: number;
  totalSlides: number;
  showLogo?: boolean;
}

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

export const SlideLayout = ({ children, slideNumber, totalSlides, showLogo = true }: SlideLayoutProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      const scaleX = parent.clientWidth / SLIDE_WIDTH;
      const scaleY = parent.clientHeight / SLIDE_HEIGHT;
      setScale(Math.min(scaleX, scaleY));
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden flex items-center justify-center">
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        className="absolute slide-content bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white flex flex-col"
      >
        {/* Logo watermark */}
        {showLogo && (
          <img
            src={logoLopes}
            alt="Logo Lopes"
            className="absolute top-10 right-12 h-12 opacity-60"
          />
        )}

        {/* Content area */}
        <div className="flex-1 px-24 pt-20 pb-8 flex flex-col">
          {children}
        </div>

        {/* Footer */}
        <div className="px-24 pb-6 flex items-center justify-between text-base opacity-50">
          <span>LOPES DISTRIBUIDORA — Treinamento do Sistema</span>
          <span>{slideNumber} / {totalSlides}</span>
        </div>
      </div>
    </div>
  );
};
