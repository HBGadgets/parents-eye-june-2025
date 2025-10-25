"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loginUser } from "@/services/userService";
import Image from "next/image";
import { Eye, EyeOff, Fullscreen } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = await loginUser(email, password); // 🟢 API call

      if (data?.token) {
        login(data.token); // update Zustand store
        router.push("/dashboard");
      } else {
        alert("Invalid response from server.");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      <Image
        src="/background.svg"
        alt="Background"
        fill
        className="object-cover -z-10 filter brightness-50"
        priority
      />

      {/* Left side - Welcome message (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center px-12 xl:px-20">
        <div className="text-white text-center max-w-2xl w-full">
          <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-bold mb-6 leading-tight">
            Welcome Back
          </h1>
          <p className="text-xl xl:text-xl 2xl:text-2xl opacity-90 leading-relaxed">
            "Your child's safety, our peace of mind."
          </p>
        </div>
      </div>

      {/* Right side - Login Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-xl px-4 sm:px-8 lg:px-12">
          <Card className="w-full shadow-2xl rounded-3xl bg-white/95 backdrop-blur">
            <CardHeader className="px-4 py-2">
              <CardTitle className="text-center">
                <div className="flex justify-center">
                  <Image
                    src="/logo.svg"
                    alt="ParentsEye Logo"
                    width={150}
                    height={150}
                    className="w-[150px] h-[150px]"
                    priority
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-3xl font-bold text-gray-900">
                    Secure Login
                  </p>
                  <p className="text-lg text-gray-600">
                    <span className="text-yellow-500 font-semibold">Login</span>{" "}
                    to your account
                  </p>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="px-[50px] pb-8 pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </span>
                    <Input
                      type="text"
                      placeholder="Enter your username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12 pl-10 text-base border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </span>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pl-10 pr-10 text-base border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <label
                    htmlFor="remember"
                    className="ml-2 text-sm text-gray-700"
                  >
                    Remember for 30 days
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 shadow-lg mt-6"
                >
                  Login
                </Button>

                <div className="text-center pt-2">
                  <div className="text-center">
                    <span className="text-xs text-muted-foreground">
                      By continuing, you agree to our{" "}
                      <u>
                        <Link href="https://www.parentseye.in/terms">
                          Terms
                        </Link>
                      </u>{" "}
                      and{" "}
                      <u>
                        <Link href="https://www.parentseye.in/privacy">
                          Privacy Policy
                        </Link>
                      </u>
                      .
                    </span>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
