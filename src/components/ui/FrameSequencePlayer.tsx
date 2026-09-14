"use client";

import React, { useEffect, useRef } from "react";

interface FrameSequencePlayerProps {
  frameCount?: number;
  framePrefix?: string;
  fps?: number;
  mode?: "pingpong" | "loop";
  className?: string;
  paddingRatio?: number; // 0 to 1, padding so flower petals don't clip
}

// Global cache for preloaded HTMLImageElements
const globalImagesCache = new Map<string, HTMLImageElement[]>();

export const FrameSequencePlayer: React.FC<FrameSequencePlayerProps> = ({
  frameCount = 60,
  framePrefix = "/background-remover/",
  fps = 35,
  mode = "pingpong",
  className = "",
  paddingRatio = 0.9,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let isCancelled = false;
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CANVAS_SIZE = 160;
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    const cacheKey = `${framePrefix}_${frameCount}`;

    // Get or initialize image list
    let images = globalImagesCache.get(cacheKey);
    if (!images) {
      images = [];
      for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        const num = String(i).padStart(2, "0");
        img.src = `${framePrefix}${num}.png`;
        images.push(img);
      }
      globalImagesCache.set(cacheKey, images);
    }

    const drawFrame = (index: number) => {
      const img = images![index];
      if (!img || !img.complete || img.naturalWidth === 0) return;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      const maxDim = Math.max(imgW, imgH);
      const scale = (CANVAS_SIZE * paddingRatio) / maxDim;
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const drawX = (CANVAS_SIZE - drawW) / 2;
      const drawY = (CANVAS_SIZE - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
    };

    // Draw frame 0 immediately if already loaded
    if (images[0]?.complete && images[0]?.naturalWidth > 0) {
      drawFrame(0);
    } else {
      images[0].onload = () => {
        if (!isCancelled) drawFrame(0);
      };
    }

    let currentIndex = 0;
    let direction = 1;
    let lastTime = performance.now();
    const frameInterval = 1000 / fps;

    const animate = (now: number) => {
      if (isCancelled) return;

      const elapsed = now - lastTime;
      if (elapsed >= frameInterval) {
        lastTime = now - (elapsed % frameInterval);

        if (mode === "pingpong") {
          currentIndex += direction;
          if (currentIndex >= frameCount - 1) {
            currentIndex = frameCount - 1;
            direction = -1; // Reverse backwards
          } else if (currentIndex <= 0) {
            currentIndex = 0;
            direction = 1; // Reverse forwards
          }
        } else {
          currentIndex = (currentIndex + 1) % frameCount;
        }

        drawFrame(currentIndex);
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
    };
  }, [frameCount, framePrefix, fps, mode, paddingRatio]);

  return <canvas ref={canvasRef} className={className} />;
};

export default FrameSequencePlayer;
