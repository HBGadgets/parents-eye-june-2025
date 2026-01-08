import { useEffect, useRef, useState } from "react";

export const useSmoothSocketSpeed = (
  actualSpeed: number | undefined,
  updateInterval = 10000,
  category: "idle" | "stopped" | "running" | "overspeed" | string | undefined
) => {
  const [displaySpeed, setDisplaySpeed] = useState<number | null>(null);

  const startSpeedRef = useRef(0);
  const targetSpeedRef = useRef(0);
  const startTimeRef = useRef(0);

  const rafRef = useRef<number | null>(null);
  const wobbleIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  // 🚀 Handle new socket speed
  useEffect(() => {
    if (actualSpeed === undefined || actualSpeed < 0) return;

    // 🟢 FIRST VALUE → set immediately (NO animation)
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setDisplaySpeed(actualSpeed);
      startSpeedRef.current = actualSpeed;
      targetSpeedRef.current = actualSpeed;
      return;
    }

    // Stop wobble
    if (wobbleIntervalRef.current) {
      clearInterval(wobbleIntervalRef.current);
      wobbleIntervalRef.current = null;
    }

    // Stop animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    startSpeedRef.current = displaySpeed ?? actualSpeed;
    targetSpeedRef.current = actualSpeed;
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / updateInterval, 1);

      const next =
        startSpeedRef.current +
        (targetSpeedRef.current - startSpeedRef.current) * progress;

      setDisplaySpeed(next);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        startWobble();
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [actualSpeed, updateInterval]);

  // 🔁 Idle wobble AFTER reaching target
  const startWobble = () => {
    if (category === "idle" || category === "stopped") return;
    if (wobbleIntervalRef.current) return;

    wobbleIntervalRef.current = setInterval(() => {
      setDisplaySpeed(() => {
        const direction = Math.random() < 0.5 ? -1 : 1;
        const magnitude = Math.floor(Math.random() * 2) + 1.5; // ±2–3
        return Math.max(0, targetSpeedRef.current + direction * magnitude);
      });
    }, 1500);
  };

  // 🧹 Cleanup
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (wobbleIntervalRef.current) clearInterval(wobbleIntervalRef.current);
    };
  }, []);

  return displaySpeed ?? actualSpeed ?? 0;
};
