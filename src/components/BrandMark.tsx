"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const imageSize =
    size === "sm" ? 96 : size === "lg" ? 200 : 180;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/kettleslongLight.svg"
        alt="Kettles"
        width={imageSize * 3}
        height={Math.round(imageSize * 0.95)}
        className={cn(
          "block object-contain",
          size === "sm" && "h-14 w-auto",
          size === "md" && "h-20 w-auto",
          size === "lg" && "h-[6.5rem] w-auto"
        )}
      />
    </div>
  );
}
