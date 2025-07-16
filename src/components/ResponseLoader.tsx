import { useEffect, useState } from "react";

export default function ResponseLoader({ isLoading }: { isLoading: boolean }) {
  const [progress, setProgress] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      setProgress(0);
      
      // Simulate progress until 80% in steps
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(interval);
            return 80; // Stop at 80% until loading completes
          }
          return prev + 10;
        });
      }, 300);
      
      return () => clearInterval(interval);
    } else if (progress > 0) {
      // When loading finishes, jump to 100% then hide
      setProgress(100);
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!showLoader) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[9999] bg-gray-200">
      <div 
        className="h-full transition-all duration-300 ease-linear relative"
        style={{ width: `${progress}%`, backgroundColor: '#e1582e' }}
      >
        {/* Shimmer animation effect when stuck at 80% */}
        {progress === 80 && isLoading && (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
      
      {/* Embedded CSS for the shimmer animation */}
      <style jsx>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .animate-shimmer {
          animation: shimmer 1.5s infinite linear;
        }
      `}</style>
    </div>
  );
}