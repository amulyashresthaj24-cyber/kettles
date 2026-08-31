"use client";

import React, { useEffect, useRef, useState, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedGradientBackgroundProps {
    className?: string;
    children?: React.ReactNode;
    intensity?: "subtle" | "medium" | "strong";
}

interface Beam {
    x: number;
    y: number;
    width: number;
    length: number;
    angle: number;
    speed: number;
    opacity: number;
    hue: number;
    pulse: number;
    pulseSpeed: number;
}

function createBeam(width: number, height: number): Beam {
    const angle = -35 + Math.random() * 10;
    return {
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height * 1.5 - height * 0.25,
        width: 30 + Math.random() * 60,
        length: height * 2.5,
        angle: angle,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: 190 + Math.random() * 70,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
    };
}

const opacityMap = {
    subtle: 0.7,
    medium: 0.85,
    strong: 1,
};

export const BeamsBackground = forwardRef<HTMLDivElement, AnimatedGradientBackgroundProps>(
    ({ className, children, intensity = "strong" }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const beamsRef = useRef<Beam[]>([]);
        const MINIMUM_BEAMS = 20;

        // Follow the shared app theme (flowmate-theme). Beams are a cyan wash
        // tuned for a dark canvas; on light we soften them and flip the tint.
        const [theme, setTheme] = useState<"light" | "dark">("dark");
        useEffect(() => {
            const read = () =>
                setTheme(window.localStorage.getItem("flowmate-theme") === "light" ? "light" : "dark");
            read();
            window.addEventListener("flowmate-theme-changed", read);
            return () => window.removeEventListener("flowmate-theme-changed", read);
        }, []);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const updateCanvasSize = () => {
                const dpr = window.devicePixelRatio || 1;
                canvas.width = window.innerWidth * dpr;
                canvas.height = window.innerHeight * dpr;
                canvas.style.width = `${window.innerWidth}px`;
                canvas.style.height = `${window.innerHeight}px`;
                ctx.scale(dpr, dpr);

                const totalBeams = MINIMUM_BEAMS * 1.5;
                beamsRef.current = Array.from({ length: totalBeams }, () =>
                    createBeam(canvas.width, canvas.height)
                );
            };

            function drawBeam(ctx: CanvasRenderingContext2D, beam: Beam) {
                ctx.save();
                ctx.translate(beam.x, beam.y);
                ctx.rotate((beam.angle * Math.PI) / 180);

                const light = theme === "light";

                // Calculate pulsing opacity. Dark: bright cyan rays added onto
                // black. Light: deeper blue rays multiplied into white — they
                // need more presence (lower lightness reads, so push opacity up).
                const pulsingOpacity =
                    beam.opacity *
                    (0.8 + Math.sin(beam.pulse) * 0.2) *
                    opacityMap[intensity] *
                    (light ? 1.6 : 1);

                // White-mode variant: bias the cyan→blue hue toward brand blue,
                // raise saturation, drop lightness hard so the beam reads as a
                // saturated blue ray multiplied into the white canvas instead of
                // a faint wash.
                const hue = light ? 214 + (beam.hue - 190) * 0.45 : beam.hue;
                const sat = light ? 90 : 85;
                const lum = light ? 48 : 65;
                const c = (a: number) => `hsla(${hue}, ${sat}%, ${lum}%, ${a})`;

                const gradient = ctx.createLinearGradient(0, 0, 0, beam.length);

                // Enhanced gradient with multiple color stops
                gradient.addColorStop(0, c(0));
                gradient.addColorStop(0.1, c(pulsingOpacity * 0.5));
                gradient.addColorStop(0.4, c(pulsingOpacity));
                gradient.addColorStop(0.6, c(pulsingOpacity));
                gradient.addColorStop(0.9, c(pulsingOpacity * 0.5));
                gradient.addColorStop(1, c(0));

                ctx.fillStyle = gradient;
                ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
                ctx.restore();
            }

            // Static beams: draw a single frame, no rAF loop. Zero ongoing
            // CPU/GPU — the beams never move, so there is nothing to animate.
            function renderFrame() {
                if (!canvas || !ctx) return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.filter = "blur(35px)";
                // Light: multiply so blue rays sink into the white page as soft
                // tinted shadows. Dark: default add-over for glowing cyan beams.
                ctx.globalCompositeOperation = theme === "light" ? "multiply" : "source-over";
                beamsRef.current.forEach((beam) => drawBeam(ctx, beam));
                ctx.globalCompositeOperation = "source-over";
            }

            // Repaint on resize — updateCanvasSize rebuilds the beam set and
            // clears the canvas, so we redraw the single static frame after.
            const onResize = () => {
                updateCanvasSize();
                renderFrame();
            };
            updateCanvasSize();
            renderFrame();
            window.addEventListener("resize", onResize);

            return () => {
                window.removeEventListener("resize", onResize);
            };
        }, [intensity, theme]);

        return (
            <div
                ref={ref}
                className={cn(
                    "relative min-h-screen w-full overflow-visible",
                    theme === "light" ? "bg-white" : "bg-neutral-950",
                    className
                )}
            >
                {/* Fixed to the viewport so the beams stay pinned while content
                    scrolls over them — a sticky parallax backdrop across every
                    section. Static (no rAF), so a fixed full-screen layer is cheap
                    (GPU-composited, no scroll repaint). */}
                <canvas
                    ref={canvasRef}
                    className="fixed inset-0 z-0 pointer-events-none"
                    style={{ filter: "blur(15px)" }}
                />

                {/* Static tint instead of an infinitely-animated full-page
                    backdrop-filter — the blur(50px) pulse forced a repaint of the
                    entire landing page every frame. A plain gradient gives the same
                    softening at zero ongoing cost. */}
                <div className={cn("fixed inset-0 z-0 pointer-events-none", theme === "light" ? "bg-white/5" : "bg-neutral-950/10")} />

                {children ? (
                    children
                ) : (
                    <div className="relative z-10 flex h-screen w-full items-center justify-center">
                        <div className="flex flex-col items-center justify-center gap-6 px-4 text-center">
                            <motion.h1
                                className="text-6xl md:text-7xl lg:text-8xl font-semibold text-white tracking-tighter"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                Beams
                                <br />
                                Background
                            </motion.h1>
                            <motion.p
                                className="text-lg md:text-2xl lg:text-3xl text-white/70 tracking-tighter"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                For your pleasure
                            </motion.p>
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

BeamsBackground.displayName = "BeamsBackground";
