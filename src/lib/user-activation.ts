let resolveActivation: () => void;
export const userActivated = new Promise<void>(
  (res) => (resolveActivation = res)
);

if (typeof window !== "undefined") {
  const activate = () => {
    resolveActivation();
  };
  ["click", "keydown", "pointerdown", "touchstart"].forEach((evt) =>
    window.addEventListener(evt, activate, { once: true, passive: true })
  );
}
