"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return "Email address is required";
    if (!/\S+@\S+\.\S+/.test(email)) return "Please enter a valid email address";
    if (!password) return "Password is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        errorObj.response?.data?.message ||
        errorObj.message ||
        "Invalid email or password. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between">
      {/* Top Minimal Brand Bar for Mobile */}
      <header className="lg:hidden px-6 py-4 flex items-center justify-between border-b border-[#EBE7DF] bg-[#FBF9F5]">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
            R
          </div>
          <span className="font-serif text-xl tracking-tight text-[#1A1D20] font-bold">
            RentalCircle
          </span>
        </Link>
        <span className="text-[11px] font-semibold tracking-wider text-[#C27D38] uppercase bg-[#C27D38]/10 px-2.5 py-1 rounded-full">
          Zero-Broker
        </span>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 max-w-7xl mx-auto w-full">
        {/* Left Editorial Panel (Hidden on mobile, prominent on desktop) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-12 lg:p-16 bg-[#1B4D3E] text-white relative overflow-hidden my-6 ml-6 rounded-2xl shadow-xl">
          {/* Subtle Background Architectural Accent */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -left-10 top-1/3 w-60 h-60 rounded-full bg-[#C27D38]/10 blur-2xl pointer-events-none" />

          {/* Top Brand Showcase */}
          <div className="relative z-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-white text-[#1B4D3E] flex items-center justify-center font-serif font-bold text-2xl shadow-md transition-transform group-hover:scale-105">
                R
              </div>
              <div>
                <span className="font-serif text-2xl tracking-tight text-white font-bold block leading-none">
                  RentalCircle
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#C27D38] font-bold">
                  Zero-Broker Verified Homes
                </span>
              </div>
            </Link>

            <div className="mt-14 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-[#C27D38]" />
                Direct Owner Marketplace
              </div>
              <h1 className="font-serif text-3xl xl:text-4xl text-white font-medium leading-snug">
                Step into verified living without paying broker fees.
              </h1>
              <p className="text-white/80 text-sm leading-relaxed max-w-md pt-2">
                Connect directly with deed-verified property owners across top
                Indian cities. Transparent conversations, real photos, and zero
                middleman commissions.
              </p>
            </div>
          </div>

          {/* Value Props & Trust Badges */}
          <div className="relative z-10 space-y-4 my-10 pt-6 border-t border-white/10">
            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-white/10 text-[#C27D38] shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  100% Deed-Verified Owners
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Government ID and ownership documents reviewed before listings go
                  live.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-white/10 text-[#25D366] shrink-0 mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Direct WhatsApp Conversations
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  No hidden phone numbers or call centers. Talk directly to the
                  landlord.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-white/10 text-[#C27D38] shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Zero Brokerage Always
                </h4>
                <p className="text-xs text-white/70 leading-relaxed">
                  Keep your hard-earned money. Never pay 15 to 30 days of rent as
                  broker fees.
                </p>
              </div>
            </div>
          </div>

          {/* Editorial Footer Quote */}
          <div className="relative z-10 text-xs text-white/60 pt-4 border-t border-white/10 flex items-center justify-between">
            <span>© RentalCircle Technologies</span>
            <span className="text-[#C27D38] font-medium">India Edition</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="col-span-1 lg:col-span-7 flex flex-col justify-center px-6 sm:px-12 lg:px-16 py-12">
          <div className="max-w-md w-full mx-auto space-y-8">
            {/* Header Titles */}
            <div className="space-y-2">
              <span className="text-xs font-semibold tracking-wider text-[#C27D38] uppercase">
                Account Sign In
              </span>
              <h2 className="text-3xl font-serif font-bold text-[#1A1D20] tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-[#5A6065] leading-relaxed">
                Enter your registered email and password to access your saved
                properties, enquiries, and site visit schedules.
              </p>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 transition-all animate-in fade-in duration-200"
              >
                <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm font-medium leading-relaxed">
                  {errorMessage}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                  >
                    Password
                  </label>
                  <Link
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setErrorMessage(
                        "Password reset via email is in active development for Slice 2. Please contact support or check back soon."
                      );
                    }}
                    className="text-xs font-medium text-[#C27D38] hover:text-[#A8692B] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#5A6065] hover:text-[#1A1D20] transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#DDD8CE] text-[#1B4D3E] focus:ring-[#1B4D3E]/20"
                  />
                  <span className="text-xs text-[#5A6065]">
                    Keep me signed in on this device
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-[#1B4D3E] hover:bg-[#153E32] active:bg-[#072625] text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Signing in securely...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to RentalCircle</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Google OAuth */}
            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#EBE7DF]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#FBF9F5] px-3 text-[#5A6065]">or continue with</span>
                </div>
              </div>
              <a
                href="/oauth2/authorization/google"
                className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-[#E8E4DD] bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-[#1A1D20] shadow-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </a>
            </div>

            {/* Separator / Switch to Register */}
            <div className="pt-6 border-t border-[#EBE7DF] text-center space-y-3">
              <p className="text-xs sm:text-sm text-[#5A6065]">
                New to RentalCircle?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#1B4D3E] hover:underline underline-offset-4 transition-colors"
                >
                  Create an account
                </Link>
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#5A6065]/80">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1B4D3E]" />
                <span>Protected by 256-bit encryption & token rotation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
