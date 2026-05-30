"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = "md",
  className,
  theme,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  theme?: "light" | "dark";
}) {
  const [activeTheme, setActiveTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (theme) {
      setActiveTheme(theme);
      return;
    }

    const detectTheme = () => {
      const current = document.documentElement.dataset.theme as "light" | "dark";
      if (current === "light" || current === "dark") {
        setActiveTheme(current);
      }
    };

    detectTheme();

    const observer = new MutationObserver(() => {
      detectTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [theme]);

  const imageSize =
    size === "sm" ? 96 : size === "lg" ? 200 : 180;

  const logoSrc = activeTheme === "light" 
    ? "/images/kettleslong.svg" 
    : "/images/kettleslongLight.svg";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src={logoSrc}
        alt="Kettles"
        width={imageSize * 3}
        height={Math.round(imageSize * 0.95)}
        className={cn(
          "block object-contain",
          size === "sm" && "h-10 w-auto",
          size === "md" && "h-20 w-auto",
          size === "lg" && "h-[6.5rem] w-auto"
        )}
      />
    </div>
  );
}

