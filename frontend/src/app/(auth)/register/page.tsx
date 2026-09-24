"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  Phone,
  Home,
  Building2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type UserRole = "TENANT" | "BUYER";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login } = useAuth();

  // Form State
  const [userType, setUserType] = useState<UserRole>("TENANT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!firstName.trim()) return "First name is required";
    if (!lastName.trim()) return "Last name is required";
    if (!email.trim()) return "Email address is required";
    if (!/\S+@\S+\.\S+/.test(email)) return "Please enter a valid email address";

    // Validate Indian mobile number (optional or 10 digits)
    const cleanedMobile = mobile.replace(/[^0-9]/g, "");
    if (mobile.trim() && cleanedMobile.length < 10) {
      return "Please enter a valid 10-digit mobile number";
    }

    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (password !== confirmPassword) return "Passwords do not match";
    if (!termsAccepted) return "You must accept the terms of service to proceed";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    // Format mobile with +91 if 10 digits entered without country code
    const digitsOnly = mobile.replace(/[^0-9]/g, "");
    const formattedMobile = digitsOnly
      ? digitsOnly.length === 10
        ? `+91${digitsOnly}`
        : `+${digitsOnly}`
      : undefined;

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        mobile: formattedMobile,
        password,
        userType,
      });

      setSuccessMessage("Account created successfully! Signing you in...");

      // Automatically sign in the newly registered user
      try {
        await login(email.trim().toLowerCase(), password);
        router.push("/");
        router.refresh();
      } catch {
        // If auto-login fails, redirect to login page
        router.push("/login?registered=true");
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        errorObj.response?.data?.message ||
        errorObj.message ||
        "Registration failed. Please check your information and try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-between">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#EBE7DF] bg-[#FBF9F5]/90 backdrop-blur-sm sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
            R
          </div>
          <span className="font-serif text-xl tracking-tight text-[#1A1D20] font-bold">
            RentalCircle
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#5A6065] hidden sm:inline">
            Already have an account?
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#DDD8CE] text-[#1B4D3E] hover:bg-[#1B4D3E]/5 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="bg-white border border-[#DDD8CE] rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
          {/* Header Title & Pitch */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B4D3E]/10 text-[#1B4D3E] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#C27D38]" />
              Zero-Broker Verified Marketplace
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1D20] tracking-tight">
              Create your RentalCircle account
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6065] leading-relaxed">
              Connect directly with genuine property owners across India. No
              middlemen, zero brokerage fees, and verified listings only.
            </p>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 transition-all"
            >
              <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium leading-relaxed">
                {errorMessage}
              </div>
            </div>
          )}

          {successMessage && (
            <div
              role="alert"
              className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 transition-all"
            >
              <CheckCircle2 className="w-5 h-5 text-[#1B4D3E] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium leading-relaxed">
                {successMessage}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Step 1: Role Selection */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide">
                I am looking to
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType("TENANT")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    userType === "TENANT"
                      ? "border-[#1B4D3E] bg-[#1B4D3E]/5 ring-2 ring-[#1B4D3E]/15"
                      : "border-[#DDD8CE] bg-white hover:border-[#1B4D3E]/50"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      userType === "TENANT"
                        ? "bg-[#1B4D3E] text-white"
                        : "bg-[#FBF9F5] text-[#5A6065]"
                    }`}
                  >
                    <Home className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1A1D20]">
                        Rent a Home
                      </span>
                      {userType === "TENANT" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1B4D3E] text-white px-2 py-0.5 rounded-full">
                          Tenant
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A6065] mt-0.5 leading-snug">
                      Verified apartments, villas & builder floors with zero
                      brokerage.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setUserType("BUYER")}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    userType === "BUYER"
                      ? "border-[#1B4D3E] bg-[#1B4D3E]/5 ring-2 ring-[#1B4D3E]/15"
                      : "border-[#DDD8CE] bg-white hover:border-[#1B4D3E]/50"
                  }`}
                >
                  <div
                    className={`p-2.5 rounded-lg shrink-0 ${
                      userType === "BUYER"
                        ? "bg-[#1B4D3E] text-white"
                        : "bg-[#FBF9F5] text-[#5A6065]"
                    }`}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1A1D20]">
                        Buy Property
                      </span>
                      {userType === "BUYER" && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-[#C27D38] text-white px-2 py-0.5 rounded-full">
                          Buyer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5A6065] mt-0.5 leading-snug">
                      Direct owner sale listings with verified title deeds.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Names (2 columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="firstName"
                  className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                >
                  First Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Rajesh"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="lastName"
                  className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                >
                  Last Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
              >
                Email Address <span className="text-red-500">*</span>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label
                htmlFor="mobile"
                className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
              >
                Mobile Number
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-[#DDD8CE] bg-[#FBF9F5] text-[#1A1D20] font-medium text-xs sm:text-sm select-none">
                  🇮🇳 +91
                </span>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#5A6065]">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    autoComplete="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="98765 43210"
                    maxLength={14}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#DDD8CE] rounded-r-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                </div>
              </div>
              <p className="text-[11px] text-[#5A6065]">
                Used for owner WhatsApp inquiries and site visit confirmations.
              </p>
            </div>

            {/* Password and Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A6065] hover:text-[#1A1D20] transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-[#1A1D20] uppercase tracking-wide"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5A6065]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#DDD8CE] rounded-lg text-sm text-[#1A1D20] placeholder-[#5A6065]/50 focus:outline-none focus:border-[#1B4D3E] focus:ring-2 focus:ring-[#1B4D3E]/15 transition-all"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#5A6065] hover:text-[#1A1D20] transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[#DDD8CE] text-[#1B4D3E] focus:ring-[#1B4D3E]/20"
                />
                <span className="text-xs text-[#5A6065] leading-relaxed">
                  I agree to the{" "}
                  <Link
                    href="#terms"
                    className="text-[#1B4D3E] font-medium underline underline-offset-2"
                  >
                    Zero-Brokerage Charter
                  </Link>{" "}
                  and confirm I am not an unauthorized broker or middleman.
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
                  <span>Creating your account...</span>
                </>
              ) : (
                <>
                  <span>
                    Register as {userType === "TENANT" ? "Tenant" : "Buyer"}
                  </span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="pt-4 border-t border-[#EBE7DF] text-center space-y-2">
            <p className="text-xs text-[#5A6065]">
              Looking to list a property as an owner?{" "}
              <Link
                href="/register"
                onClick={() => setUserType("TENANT")}
                className="font-semibold text-[#C27D38] hover:underline"
              >
                Owner registration
              </Link>{" "}
              can be upgraded anytime from your dashboard.
            </p>
            <div className="flex items-center justify-center gap-2 text-[11px] text-[#5A6065]/70">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B4D3E]" />
              <span>RentalCircle never shares your contact details with brokers</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
