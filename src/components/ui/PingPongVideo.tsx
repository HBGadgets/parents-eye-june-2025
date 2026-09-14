"use client";

import React, { useEffect, useRef } from "react";

interface PingPongVideoProps {
  src: string;
  startTime?: number;
  endTime?: number;
  fps?: number;
  className?: string;
}

// Module-level frame cache to avoid re-capturing frames across components or re-renders
const globalFrameCache = new Map<string, HTMLCanvasElement[]>();

export const PingPongVideo: React.FC<PingPongVideoProps> = ({
  src,
  startTime = 0.5,
  endTime = 1.0,
  fps = 30,
  className = "",
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

    const cacheKey = `${src}_${startTime}_${endTime}_${fps}`;

    const startPingPong = (frames: HTMLCanvasElement[]) => {
      if (frames.length < 2 || isCancelled) return;

      let currentFrame = 0;
      let direction = 1;
      let lastTime = performance.now();
      const frameDuration = 1000 / fps;

      const loop = (now: number) => {
        if (isCancelled) return;

        if (now - lastTime >= frameDuration) {
          lastTime = now;
          currentFrame += direction;

          if (currentFrame >= frames.length - 1) {
            currentFrame = frames.length - 1;
            direction = -1; // Reverse backward (1.0s -> 0.5s)
          } else if (currentFrame <= 0) {
            currentFrame = 0;
            direction = 1; // Reverse forward (0.5s -> 1.0s)
          }

          ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
          ctx.drawImage(frames[currentFrame], 0, 0);
        }

        animId = requestAnimationFrame(loop);
      };

      animId = requestAnimationFrame(loop);
    };

    // If frames are already cached in memory, use them immediately
    if (globalFrameCache.has(cacheKey)) {
      const cached = globalFrameCache.get(cacheKey)!;
      ctx.drawImage(cached[0], 0, 0);
      startPingPong(cached);
      return () => {
        isCancelled = true;
        cancelAnimationFrame(animId);
      };
    }

    // Otherwise, extract frames from the video between startTime and endTime
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";

    const totalDuration = endTime - startTime;
    const totalFrames = Math.max(4, Math.round(totalDuration * fps));
    const step = totalDuration / totalFrames;

    const capturedFrames: HTMLCanvasElement[] = [];
    let captureIndex = 0;
    let hasStarted = false;

    const captureNextFrame = () => {
      if (isCancelled) return;

      const videoWidth = video.videoWidth || 1920;
      const videoHeight = video.videoHeight || 1080;
      const cropSize = Math.min(videoWidth, videoHeight);
      const sx = (videoWidth - cropSize) / 2;
      const sy = (videoHeight - cropSize) / 2;

      const offscreen = document.createElement("canvas");
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      const offCtx = offscreen.getContext("2d");

      if (offCtx) {
        offCtx.drawImage(
          video,
          sx,
          sy,
          cropSize,
          cropSize,
          0,
          0,
          CANVAS_SIZE,
          CANVAS_SIZE
        );
        capturedFrames.push(offscreen);

        // Paint the initial frame immediately so there is no delay
        if (capturedFrames.length === 1) {
          ctx.drawImage(offscreen, 0, 0);
        }
      }

      captureIndex++;
      if (captureIndex <= totalFrames) {
        video.currentTime = startTime + captureIndex * step;
      } else {
        // Cache frames and start ping-pong
        globalFrameCache.set(cacheKey, capturedFrames);
        startPingPong(capturedFrames);
      }
    };

    const handleSeeked = () => {
      if (isCancelled) return;
      captureNextFrame();
    };

    const handleReady = () => {
      if (hasStarted || isCancelled) return;
      hasStarted = true;
      video.currentTime = startTime;
    };

    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("loadeddata", handleReady);
    video.addEventListener("canplay", handleReady);

    if (video.readyState >= 2) {
      handleReady();
    }

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadeddata", handleReady);
      video.removeEventListener("canplay", handleReady);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, startTime, endTime, fps]);

  return <canvas ref={canvasRef} className={className} />;
};

export default PingPongVideo;
