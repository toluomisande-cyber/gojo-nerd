"use client";

import * as React from "react";

export interface FireflyMeadowProps {
  /** Total number of fireflies to simulate */
  count?: number;
  /** Primary firefly core color (hex, rgb, or hsl) */
  fireflyColor?: string;
  /** Outer ambient glow color */
  glowColor?: string;
  /** Movement speed multiplier (default 1.0) */
  speed?: number;
  /** Minimum firefly core radius in pixels */
  minSize?: number;
  /** Maximum firefly core radius in pixels */
  maxSize?: number;
  /** Whether fireflies react to cursor proximity */
  interactive?: boolean;
  /** Optional deep atmospheric background gradient */
  showAtmosphere?: boolean;
  /** Additional container CSS classes */
  className?: string;
  /** Optional nested children (e.g. hero content overlaid on top) */
  children?: React.ReactNode;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  targetAlpha: number;
  blinkSpeed: number;
  angle: number;
  angularVelocity: number;
  glowRadius: number;
}

export function FireflyMeadow({
  count = 55,
  fireflyColor = "#FACC15", // Warm golden glow
  glowColor = "rgba(234, 179, 8, 0.4)",
  speed = 1.0,
  minSize = 1.2,
  maxSize = 3.2,
  interactive = true,
  showAtmosphere = true,
  className = "",
  children,
}: FireflyMeadowProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const mouseRef = React.useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = container.clientWidth);
    let height = (canvas.height = container.clientHeight);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const handleResize = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    // Initialize firefly particle collection
    const fireflies: Firefly[] = Array.from({ length: count }, () => {
      const radius = minSize + Math.random() * (maxSize - minSize);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.7 * speed,
        vy: (Math.random() - 0.5) * 0.7 * speed,
        radius,
        alpha: 0.2 + Math.random() * 0.8,
        targetAlpha: 0.2 + Math.random() * 0.8,
        blinkSpeed: 0.01 + Math.random() * 0.025,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.04,
        glowRadius: radius * (4 + Math.random() * 4),
      };
    });

    // Mouse proximity tracking
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: null, y: null };
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Animation Loop
    let time = 0;
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // Render optional deep atmospheric dusk gradient
      if (showAtmosphere) {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#080F1D");
        bgGrad.addColorStop(0.55, "#0B192C");
        bgGrad.addColorStop(1, "#0A1322");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Soft ambient meadow horizon glow
        const horizonGrad = ctx.createRadialGradient(
          width * 0.5,
          height * 1.1,
          50,
          width * 0.5,
          height * 1.1,
          width * 0.75
        );
        horizonGrad.addColorStop(0, "rgba(22, 101, 52, 0.22)");
        horizonGrad.addColorStop(0.5, "rgba(15, 52, 112, 0.15)");
        horizonGrad.addColorStop(1, "transparent");
        ctx.fillStyle = horizonGrad;
        ctx.fillRect(0, 0, width, height);
      }

      // Update and draw each firefly
      for (let i = 0; i < fireflies.length; i++) {
        const f = fireflies[i];

        // Organic wandering motion (sinusoidal wobble)
        f.angle += f.angularVelocity;
        f.vx += Math.cos(f.angle) * 0.03 * speed;
        f.vy += Math.sin(f.angle) * 0.03 * speed;

        // Apply friction to prevent runaway speeds
        f.vx *= 0.98;
        f.vy *= 0.98;

        // Mouse repulsion
        if (mouseRef.current.x !== null && mouseRef.current.y !== null) {
          const dx = f.x - mouseRef.current.x;
          const dy = f.y - mouseRef.current.y;
          const dist = Math.hypot(dx, dy);
          const maxRepelDist = 110;
          if (dist < maxRepelDist && dist > 0) {
            const force = (1 - dist / maxRepelDist) * 0.45;
            f.vx += (dx / dist) * force;
            f.vy += (dy / dist) * force;
          }
        }

        f.x += f.vx;
        f.y += f.vy;

        // Toroidal screen wrapping (wrap around edges smoothly)
        const margin = 20;
        if (f.x < -margin) f.x = width + margin;
        if (f.x > width + margin) f.x = -margin;
        if (f.y < -margin) f.y = height + margin;
        if (f.y > height + margin) f.y = -margin;

        // Smooth breathing / blinking pulsation
        f.alpha += (f.targetAlpha - f.alpha) * f.blinkSpeed;
        if (Math.abs(f.alpha - f.targetAlpha) < 0.05) {
          f.targetAlpha = 0.1 + Math.random() * 0.9;
        }

        // Render firefly glow
        const currentGlowRadius = f.glowRadius * (0.8 + 0.4 * Math.sin(time * 3 + i));
        const gradient = ctx.createRadialGradient(
          f.x,
          f.y,
          0,
          f.x,
          f.y,
          Math.max(currentGlowRadius, 1)
        );

        gradient.addColorStop(0, fireflyColor);
        gradient.addColorStop(0.25, glowColor);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha));
        ctx.arc(f.x, f.y, currentGlowRadius, 0, Math.PI * 2);
        ctx.fill();

        // Render bright inner core point
        ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.globalAlpha = Math.max(0, Math.min(1, f.alpha * 0.9));
        ctx.arc(f.x, f.y, f.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [count, fireflyColor, glowColor, speed, minSize, maxSize, interactive, showAtmosphere]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[380px] overflow-hidden select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none block"
      />
      {children && <div className="relative z-10 w-full h-full">{children}</div>}
    </div>
  );
}

export default FireflyMeadow;

