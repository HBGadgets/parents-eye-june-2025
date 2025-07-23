"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { api } from "@/services/apiService";

interface PasswordVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  fieldKey: string | null;
}

const PasswordVerificationDialog: React.FC<PasswordVerificationDialogProps> = ({
  open,
  onClose,
  onSuccess,
  fieldKey,
}) => {
  const [password, setPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);

  const verifyPassword = async () => {
    if (!password) {
      setPasswordError("Password is required");
      return;
    }

    try {
      setIsVerifying(true);
      setPasswordError("");

      const res = await api.post("/superadmin/verifypassword", { password });
      console.log("API response:", res);

      const isVerified = res?.verified === true;

      if (isVerified) {
        onSuccess(); // Notify parent component
        setPassword("");
        onClose();
      } else {
        setPasswordError("Incorrect password");
      }
    } catch (err: any) {
      console.error("Password verify error", err);
      setPasswordError(
        err?.response?.data?.message || "Failed to verify password"
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Security Verification</DialogTitle>
          <DialogDescription>
            Enter your password to edit protected field
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={verifyPassword} disabled={isVerifying}>
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordVerificationDialog;
