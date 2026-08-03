"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Eye, EyeOff, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import authAxios from "@/lib/authAxios";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);
    try {
      await authAxios.put("/change/password", {
        oldPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      toast.success("Password changed successfully");
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Change password error:", error);
      toast.error(error.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen p-4 sm:p-6 md:p-10 bg-[#f8faff]">
      <div className="w-full max-w-[440px] space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
        {/* Back Button */}
        <button 
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm ml-1"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </button>

        <Card className="border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-2xl sm:rounded-3xl overflow-hidden bg-white">
          {/* Header Section */}
          <div className="px-6 sm:px-8 bg-[#fcfdfe] space-y-4 pt-6">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-[#eaeff8] rounded-xl flex items-center justify-center ring-1 ring-slate-200/50 shadow-sm">
              <KeyRound className="h-5 w-5 sm:h-6 sm:w-6 text-[#0a1d4d]" />
            </div>
            <div className="space-y-1.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0a1d4d]">Change Password</h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Update your account password to keep your credentials secure.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="px-6 sm:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-semibold text-slate-900 ml-0.5">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={formData.currentPassword}
                    onChange={handleChange}
                    className="h-10 sm:h-11 pl-4 pr-10 text-sm rounded-xl bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-300 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-semibold text-slate-900 ml-0.5">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={formData.newPassword}
                    onChange={handleChange}
                    className="h-10 sm:h-11 pl-4 pr-10 text-sm rounded-xl bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-300 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium ml-1">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-900 ml-0.5">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="h-10 sm:h-11 pl-4 pr-10 text-sm rounded-xl bg-white border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-4">
                <Button 
                  type="submit" 
                  className="w-full h-11 sm:h-12 bg-[#f3d362] hover:bg-[#e2c14f] text-[#0a1d4d] text-sm sm:text-base font-bold rounded-xl transition-all shadow-md shadow-yellow-500/20 active:scale-[0.99] cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
                
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-medium justify-center pb-2">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Your data is encrypted and secure
                </div>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
