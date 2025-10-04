// Offline Indicator Component with Tailwind CSS
export const OfflineIndicator = ({ isOffline }: { isOffline: boolean }) => {
  if (!isOffline) return null;

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-[1000] animate-slideDownFadeIn">
      <div className="bg-gradient-to-br from-red-600 to-red-700 text-white px-6 py-3 rounded-b-xl shadow-lg shadow-red-500/30 flex items-center gap-3 font-medium text-sm relative overflow-hidden">
        {/* Icon Wrapper */}
        <div className="w-6 h-6 flex items-center justify-center bg-white/20 rounded-full animate-iconPulse">
          <svg
            className="w-4 h-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23"></line>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
        </div>

        {/* Text */}
        <span className="font-semibold tracking-wide">Vehicle Offline</span>

        {/* Pulse Effect */}
        <div className="absolute inset-0 bg-white/10 animate-pulseWave pointer-events-none"></div>
      </div>
    </div>
  );
};
