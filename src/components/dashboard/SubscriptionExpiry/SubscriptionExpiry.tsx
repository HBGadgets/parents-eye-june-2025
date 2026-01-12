import React, { useState, useEffect, useCallback } from "react";
import { X, AlertTriangle, Calendar, Clock } from "lucide-react";
import { SubscriptionExpiration } from "@/interface/modal";

// =============================
// TYPES
// =============================

interface SubscriptionExpiryProps {
  isOpen?: boolean;
  onClose?: () => void;
  branches?: SubscriptionExpiration[];
  onRenew?: () => void;
}

// =============================
// MAIN COMPONENT
// =============================
export const SubscriptionExpiry: React.FC<SubscriptionExpiryProps> = ({
  isOpen: controlledIsOpen,
  onClose,
  branches = [],
  onRenew,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (controlledIsOpen !== undefined) setIsOpen(controlledIsOpen);
  }, [controlledIsOpen]);

  const handleClose = () => {
    // Start closing animation
    setIsClosing(true);

    // Wait for animation to complete before actually closing
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      onClose?.();
    }, 300); // Match this with CSS animation duration
  };

  const handleRenew = () => {
    onRenew?.();
    handleClose();
  };

  const branchStatus = (remainingDays: number) => {
    if (remainingDays <= 15) {
      return "critical";
    } else {
      return "warning";
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "critical":
        return {
          bgColor: "bg-red-50/80",
          borderColor: "border-l-4 border-red-400/80",
          textColor: "text-red-600",
          iconColor: "text-red-400",
          badgeBg: "bg-red-100/80",
          badgeText: "text-red-700",
        };
      case "warning":
        return {
          bgColor: "bg-amber-50/70",
          borderColor: "border-l-4 border-amber-400/80",
          textColor: "text-amber-700",
          iconColor: "text-amber-500",
          badgeBg: "bg-amber-100/80",
          badgeText: "text-amber-700",
        };
      default:
        return {
          bgColor: "bg-blue-50/80",
          borderColor: "border-l-4 border-blue-400/80",
          textColor: "text-blue-700",
          iconColor: "text-blue-400",
          badgeBg: "bg-blue-100/80",
          badgeText: "text-blue-700",
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay container - Responsive positioning and sizing */}
      <div
        className="fixed z-50 pointer-events-none responsive-popup-container"
        aria-hidden={!isOpen}
      >
        <div
          className={`
            bg-white/95 backdrop-blur-lg rounded-lg shadow-2xl overflow-hidden 
            pointer-events-auto transform transition-all duration-300 border border-gray-200
            responsive-popup
            ${isClosing ? "animate-slideOutRight" : "animate-fadeInSlideIn"}
          `}
        >
          {/* ======== HEADER (solid light yellow) ======== */}
          <div className="bg-yellow-400 px-3 sm:px-4 py-2 flex items-center justify-between backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="bg-white/80 rounded-full p-1 shadow-sm flex-shrink-0">
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-bold text-gray-800 truncate">
                  Subscription Expiry Alert
                </h2>
                <p className="text-xs text-gray-700 truncate">
                  {branches.length}{" "}
                  {branches.length === 1 ? "branch" : "branches"} expiring soon
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-700 hover:bg-white/25 rounded-full p-1 transition-colors duration-200 flex-shrink-0 ml-2"
              aria-label="Close"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 overflow-y-auto responsive-popup-content bg-white/80 backdrop-blur-sm">
            <div className="space-y-2">
              {branches.map((branch, index) => {
                const status = branchStatus(branch.remainingDays);
                const config = getStatusConfig(status);
                return (
                  <div
                    key={`${branch.mobileNo}-${index}`}
                    className={`${config.bgColor} ${config.borderColor} rounded-md p-3 transition-all duration-200 hover:shadow-sm backdrop-blur-sm`}
                  >
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3
                            className={`font-semibold text-sm ${config.textColor} truncate flex-1 min-w-0`}
                          >
                            School: {branch?.schoolName}
                          </h3>
                          <span
                            className={`${config.badgeBg} ${config.badgeText} text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0`}
                          >
                            {branch?.remainingDays}{" "}
                            {branch?.remainingDays === 1 ? "day" : "days"} left
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-gray-700">
                          <div>
                            <p
                              className={`font-semibold text-xs ${config.textColor} truncate flex-1 min-w-0`}
                            >
                              Branch: {branch?.branchName}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                            <span className="font-semibold text-xs flex-shrink-0">
                              Expires:
                            </span>
                            <span className="text-xs flex-1 min-w-0">
                              {formatDate(branch?.subscriptionExpirationDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`${config.iconColor} flex-shrink-0`}>
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .animate-fadeInSlideIn {
          animation: slideInRight 0.3s ease-out forwards;
        }

        .animate-slideOutRight {
          animation: slideOutRight 0.3s ease-out forwards;
        }

        /* Responsive styles for different screen sizes */
        .responsive-popup-container {
          bottom: 1rem;
          right: 1rem;
          width: calc(100vw - 2rem);
          max-width: 400px;
        }

        .responsive-popup {
          width: 100%;
          max-height: min(65vh, 500px);
        }

        .responsive-popup-content {
          max-height: min(calc(65vh - 80px), 420px);
        }

        /* 16:10 resolution optimization (1920x1200, 2560x1600, etc.) */
        @media (min-width: 1920px) and (min-height: 1000px) {
          .responsive-popup-container {
            bottom: 1.5rem;
            right: 1.5rem;
            max-width: 450px;
          }

          .responsive-popup {
            max-height: min(70vh, 600px);
          }

          .responsive-popup-content {
            max-height: min(calc(70vh - 80px), 520px);
          }
        }

        /* Large desktop screens */
        @media (min-width: 2560px) {
          .responsive-popup-container {
            bottom: 2rem;
            right: 2rem;
            max-width: 500px;
          }
        }

        /* Tablet and smaller desktop */
        @media (max-width: 1024px) {
          .responsive-popup-container {
            max-width: 380px;
          }
        }

        /* Mobile devices */
        @media (max-width: 768px) {
          .responsive-popup-container {
            bottom: 0.5rem;
            right: 0.5rem;
            width: calc(100vw - 1rem);
            max-width: none;
          }

          .responsive-popup {
            max-height: min(80vh, 400px);
          }

          .responsive-popup-content {
            max-height: min(calc(80vh - 80px), 320px);
          }
        }

        /* Small mobile devices */
        @media (max-width: 480px) {
          .responsive-popup-container {
            bottom: 0.25rem;
            right: 0.25rem;
            width: calc(100vw - 0.5rem);
          }

          .responsive-popup {
            max-height: min(85vh, 350px);
          }

          .responsive-popup-content {
            max-height: min(calc(85vh - 80px), 270px);
          }
        }

        /* Very small screens */
        @media (max-width: 360px) {
          .responsive-popup-container {
            position: fixed;
            top: 0.25rem;
            bottom: auto;
            right: 0.25rem;
            left: 0.25rem;
            width: auto;
          }
        }

        /* Landscape orientation */
        @media (max-height: 400px) and (orientation: landscape) {
          .responsive-popup-container {
            max-height: 90vh;
          }

          .responsive-popup {
            max-height: min(90vh, 200px);
          }

          .responsive-popup-content {
            max-height: min(calc(90vh - 80px), 220px);
          }
        }
      `}</style>
    </>
  );
};
