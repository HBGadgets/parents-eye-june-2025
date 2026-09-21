"use client";

import { useEffect, useState, useRef } from "react";
import Cookies from "js-cookie";
import { checkUserActiveStatus } from "@/services/userService";
import { performLogout } from "@/util/logout";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function ActiveStatusChecker() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(
    "Subscription expired. Please contact administration."
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasTriggeredRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) return;

    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    const verifyActiveStatus = async () => {
      try {
        const response = await checkUserActiveStatus();

        // Helper to extract active status flag from various possible backend response formats
        const isResponseActive = (res: any): boolean => {
          if (!res) return false;

          const candidates = [
            res.isActive,
            res.is_active,
            res.active,
            res.status,
            res.data?.isActive,
            res.data?.is_active,
            res.data?.active,
            res.data?.status,
          ];

          for (const val of candidates) {
            if (val === true || val === "true" || val === 1) return true;
          }

          return false;
        };

        const active = isResponseActive(response);

        if (!active) {
          const apiMsg =
            response?.message ||
            response?.data?.message ||
            "Subscription expired. Please contact administration.";
          if (typeof apiMsg === "string" && apiMsg.trim().length > 0) {
            setMessage(apiMsg);
          }
          setIsOpen(true);
        }
      } catch (error: any) {
        console.error("Failed to check active status:", error);
        const status = error?.response?.status;
        const errData = error?.response?.data;

        // Check if server explicitly returned inactive or forbidden (subscription expired)
        const isExplicitInactive =
          errData?.isActive === false ||
          errData?.is_active === false ||
          errData?.data?.isActive === false ||
          errData?.data?.is_active === false ||
          status === 403;

        if (isExplicitInactive) {
          const apiMsg =
            errData?.message ||
            errData?.data?.message ||
            "Subscription expired. Please contact administration.";
          if (typeof apiMsg === "string" && apiMsg.trim().length > 0) {
            setMessage(apiMsg);
          }
          setIsOpen(true);
        }
      }
    };

    verifyActiveStatus();
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    await performLogout(router);
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent
        overlayClassName="bg-black/60 backdrop-blur-md"
        className="sm:max-w-md border-destructive/20 shadow-2xl bg-background/95 backdrop-blur-xl"
        onEscapeKeyDown={(e) => e.preventDefault()}
      >

        <AlertDialogHeader className="flex flex-col items-center sm:items-center text-center gap-2">
          <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-1">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Subscription Expired
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground text-sm font-medium">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center mt-4">
          <AlertDialogAction
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            className="w-full sm:w-36 bg-destructive hover:bg-destructive/90 !text-white font-semibold cursor-pointer"
          >
            {isLoggingOut ? (
              <span className="flex items-center gap-2 text-white">
                <Loader2 className="h-4 w-4 animate-spin text-white" /> Logging out...
              </span>
            ) : (
              <span className="text-white">OK</span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>
    </AlertDialog>
  );
}
