"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, CheckCircle2, Sparkles } from "lucide-react";

interface Particle {
  id: number;
  x: number;
  delay: number;
}

interface DownloadProgressProps {
  open: boolean;
  progress: number;
  label?: string;
  onCancel?: () => void;
}

// All styles inline - no external CSS dependencies
const styles = {
  colors: {
    primary: "221 83% 53%",
    primaryGlow: "250 95% 65%",
    success: "142 76% 36%",
    successGlow: "160 84% 45%",
    warning: "38 92% 50%",
    foreground: "222 47% 11%",
    mutedForeground: "215 16% 47%",
    muted: "210 40% 96%",
    card: "0 0% 100%",
    border: "214 32% 91%",
    destructive: "0 84% 60%",
  },
};

const hsl = (value: string) => `hsl(${value})`;
const hsla = (value: string, alpha: number) =>
  `hsla(${value.split(" ").join(", ")}, ${alpha})`;

const DownloadProgress: React.FC<DownloadProgressProps> = ({
  open,
  progress,
  label = "Downloading...",
  onCancel,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const rafRef = useRef<number | null>(null);
  const particleIdRef = useRef(0);

  const spawnParticle = useCallback(() => {
    if (displayProgress > 5 && displayProgress < 100) {
      const newParticle: Particle = {
        id: particleIdRef.current++,
        x: displayProgress,
        delay: Math.random() * 0.2,
      };
      setParticles((prev) => [...prev.slice(-8), newParticle]);
    }
  }, [displayProgress]);

  useEffect(() => {
    if (!open) {
      setDisplayProgress(0);
      setIsComplete(false);
      setParticles([]);
      return;
    }

    const animate = () => {
      setDisplayProgress((prev) => {
        if (prev >= progress) {
          if (progress === 100 && !isComplete) {
            setIsComplete(true);
          }
          return prev;
        }

        const diff = progress - prev;
        const increment = Math.max(0.5, diff * 0.08);
        return Math.min(prev + increment, progress);
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [progress, open, isComplete]);

  useEffect(() => {
    if (!open || isComplete) return;

    const interval = setInterval(spawnParticle, 150);
    return () => clearInterval(interval);
  }, [open, spawnParticle, isComplete]);

  const { colors } = styles;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
            width: 320,
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              borderRadius: 16,
              background: hsl(colors.card),
              border: `1px solid ${hsl(colors.border)}`,
              boxShadow: `0 25px 50px -12px ${hsla(
                colors.primary,
                0.25
              )}, 0 0 30px ${hsla(colors.primaryGlow, 0.15)}`,
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Animated background gradient */}
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0.3,
                background: `linear-gradient(90deg, ${hsla(
                  colors.primary,
                  0.1
                )}, ${hsla(colors.primaryGlow, 0.2)}, ${hsla(
                  colors.primary,
                  0.1
                )})`,
                backgroundSize: "200% 200%",
              }}
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            <div style={{ position: "relative", padding: 20 }}>
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <motion.div
                    style={{ position: "relative" }}
                    animate={
                      isComplete ? { scale: [1, 1.2, 1] } : { rotate: 0 }
                    }
                    transition={{ duration: 0.3 }}
                  >
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{
                          type: "spring",
                          damping: 10,
                          stiffness: 200,
                        }}
                      >
                        <CheckCircle2
                          style={{
                            width: 20,
                            height: 20,
                            color: hsl(colors.success),
                          }}
                        />
                      </motion.div>
                    ) : (
                      <motion.div
                        animate={{ y: [0, -2, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        <Download
                          style={{
                            width: 20,
                            height: 20,
                            color: hsl(colors.primary),
                          }}
                        />
                      </motion.div>
                    )}
                  </motion.div>

                  <div>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: hsl(colors.foreground),
                        margin: 0,
                      }}
                    >
                      {isComplete ? "Download Complete!" : label}
                    </p>
                    <motion.p
                      key={Math.round(displayProgress)}
                      style={{
                        fontSize: 12,
                        color: hsl(colors.mutedForeground),
                        margin: 0,
                      }}
                    >
                      {Math.round(displayProgress)}% complete
                    </motion.p>
                  </div>
                </div>

                {onCancel && !isComplete && (
                  <motion.button
                    onClick={onCancel}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    style={{
                      padding: 6,
                      borderRadius: "50%",
                      background: hsla(colors.muted, 0.5),
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: hsl(colors.mutedForeground),
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = hsla(
                        colors.destructive,
                        0.1
                      );
                      e.currentTarget.style.color = hsl(colors.destructive);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = hsla(
                        colors.muted,
                        0.5
                      );
                      e.currentTarget.style.color = hsl(colors.mutedForeground);
                    }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </motion.button>
                )}
              </div>

              {/* Progress Bar Container */}
              <div
                style={{
                  position: "relative",
                  height: 12,
                  borderRadius: 9999,
                  background: hsl(colors.muted),
                  overflow: "hidden",
                }}
              >
                {/* Animated background pattern */}
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0.5,
                    backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 10px, ${hsla(
                      colors.mutedForeground,
                      0.1
                    )} 10px, ${hsla(colors.mutedForeground, 0.1)} 20px)`,
                  }}
                  animate={{ x: [0, 20] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />

                {/* Progress Fill */}
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: 0,
                    borderRadius: 9999,
                    width: `${displayProgress}%`,
                    background: isComplete
                      ? `linear-gradient(90deg, ${hsl(colors.success)}, ${hsl(
                          colors.successGlow
                        )})`
                      : `linear-gradient(90deg, ${hsl(colors.primary)}, ${hsl(
                          colors.primaryGlow
                        )}, ${hsl(colors.primary)})`,
                    backgroundSize: "200% 100%",
                  }}
                  animate={
                    !isComplete
                      ? {
                          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {/* Shimmer effect */}
                  <motion.div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent)",
                    }}
                    animate={{ x: ["-100%", "200%"] }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      repeatDelay: 0.5,
                    }}
                  />

                  {/* Glow at the edge */}
                  <motion.div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      filter: "blur(8px)",
                      background: isComplete
                        ? hsl(colors.success)
                        : hsl(colors.primaryGlow),
                    }}
                    animate={{
                      opacity: [0.5, 1, 0.5],
                      scale: [0.8, 1.2, 0.8],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>

                {/* Floating Particles */}
                <AnimatePresence>
                  {particles.map((particle) => (
                    <motion.div
                      key={particle.id}
                      style={{
                        position: "absolute",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: hsl(colors.primaryGlow),
                        left: `${particle.x}%`,
                        bottom: "50%",
                      }}
                      initial={{ opacity: 1, y: 0, scale: 1 }}
                      animate={{ opacity: 0, y: -20, scale: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.8,
                        delay: particle.delay,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Completion celebration */}
              <AnimatePresence>
                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <motion.div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 16,
                        paddingTop: 12,
                        borderTop: `1px solid ${hsl(colors.border)}`,
                      }}
                      initial={{ y: 10 }}
                      animate={{ y: 0 }}
                    >
                      <motion.div
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      >
                        <Sparkles
                          style={{
                            width: 16,
                            height: 16,
                            color: hsl(colors.warning),
                          }}
                        />
                      </motion.div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: hsl(colors.success),
                        }}
                      >
                        Ready to use!
                      </span>
                      <motion.div
                        animate={{ rotate: [0, -15, 15, 0] }}
                        transition={{ duration: 0.5, repeat: 2 }}
                      >
                        <Sparkles
                          style={{
                            width: 16,
                            height: 16,
                            color: hsl(colors.warning),
                          }}
                        />
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Confetti burst on completion */}
            <AnimatePresence>
              {isComplete && (
                <>
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      style={{
                        position: "absolute",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background:
                          i % 3 === 0
                            ? hsl(colors.primary)
                            : i % 3 === 1
                            ? hsl(colors.success)
                            : hsl(colors.warning),
                        left: "50%",
                        top: "50%",
                      }}
                      initial={{ opacity: 1, scale: 1 }}
                      animate={{
                        opacity: 0,
                        scale: 0,
                        x: Math.cos((i * 30 * Math.PI) / 180) * 60,
                        y: Math.sin((i * 30 * Math.PI) / 180) * 40,
                      }}
                      transition={{
                        duration: 0.6,
                        delay: i * 0.02,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DownloadProgress;
