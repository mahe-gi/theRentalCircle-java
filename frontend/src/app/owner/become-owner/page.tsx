"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  Building,
  UserCheck,
  Briefcase,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Lock,
  Scale,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { OwnershipType } from "@/types/owner";

export default function BecomeOwnerPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, refreshAuth } = useAuth();

  const [ownershipType, setOwnershipType] =
    useState<OwnershipType>("TITLE_OWNER");
  const [companyName, setCompanyName] = useState("");
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAlreadyOwner =
    Boolean(user?.roles?.includes("ROLE_OWNER")) ||
    user?.userType === "OWNER";

  // Redirect or alert if already owner
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Don't auto-redirect immediately, let user see sign in prompt
    }
  }, [isLoading, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isAuthenticated) {
      setErrorMessage("Please sign in or create an account first to register as an owner.");
      return;
    }

    if (!declarationAccepted) {
      setErrorMessage("You must accept the Zero-Brokerage Legal Declaration to proceed.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: {
        ownershipType: OwnershipType;
        companyName?: string;
        declarationAccepted: boolean;
      } = {
        ownershipType,
        declarationAccepted: true,
      };

      if (companyName.trim()) {
        payload.companyName = companyName.trim();
      }

      await apiClient.post("/owners/register", payload);

      setSuccessMessage("Owner declaration accepted! Welcome to the RentalCircle Owner Portal.");

      // Refresh auth context so user has ROLE_OWNER immediately
      await refreshAuth();

      // Redirect to property creation wizard
      setTimeout(() => {
        router.push("/owner/properties/new");
      }, 800);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        errorObj.response?.data?.message ||
        errorObj.message ||
        "Failed to complete owner registration. Please try again.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb / Category header */}
        <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-charcoal-light">
          <Link href="/" className="hover:text-forest transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-forest">Owner Onboarding</span>
        </div>

        {/* Existing Owner Notice */}
        {isAlreadyOwner && (
          <div className="mb-8 p-5 rounded-2xl bg-forest-light border border-forest/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-forest shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h3 className="text-sm font-semibold text-forest">
                  You are already a registered owner
                </h3>
                <p className="text-xs text-charcoal-light">
                  Your legal declaration is on file. You can create properties or manage your existing listings.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/owner/dashboard"
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-forest/30 text-forest hover:bg-forest/10 transition-colors"
              >
                Owner Dashboard
              </Link>
              <Link
                href="/owner/properties/new"
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-forest hover:bg-forest-hover text-white transition-colors"
              >
                Add New Property
              </Link>
            </div>
          </div>
        )}

        {/* Editorial Split Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-white rounded-3xl shadow-xl shadow-black/5 border border-[#E8E4DD] overflow-hidden">
          {/* Left Editorial Column */}
          <div className="lg:col-span-5 bg-forest text-white p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -left-10 top-1/4 w-60 h-60 rounded-full bg-amber/15 blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/90 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber" />
                <span>Zero Brokerage Verified Portal</span>
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-4xl text-white font-medium leading-tight">
                  Become a Verified Property Owner
                </h1>
                <p className="mt-3 text-white/80 text-sm leading-relaxed">
                  List your residential or commercial properties in India for free.
                  Connect directly with prospective tenants and buyers without middleman interference.
                </p>
              </div>

              {/* Guarantees List */}
              <div className="pt-6 space-y-4 border-t border-white/15">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-amber shrink-0 mt-0.5">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Strict Zero Brokerage Policy
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      RentalCircle is strictly broker-free. All listings are owner-direct, saving 15 to 30 days of rent.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-emerald-400 shrink-0 mt-0.5">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Direct WhatsApp Connections
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Tenants contact you directly on your verified mobile or via structured visit requests.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white/10 text-amber shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Two-Tier Trust Shield
                    </h4>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Owner identity and property title deeds are moderated to establish trusted badges.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom solemn note */}
            <div className="relative z-10 pt-8 mt-8 border-t border-white/10 text-xs text-white/60 flex items-center justify-between">
              <span>RentalCircle Owner Network</span>
              <span className="text-amber font-medium">100% Free Listing</span>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
            {/* If unauthenticated, show sign-in prompt */}
            {!isLoading && !isAuthenticated ? (
              <div className="text-center py-8 space-y-5 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-forest-light text-forest mx-auto flex items-center justify-center">
                  <Lock className="w-7 h-7 text-forest" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif font-bold text-charcoal">
                    Sign in to Continue
                  </h2>
                  <p className="text-sm text-charcoal-light mt-2 leading-relaxed">
                    You need an active RentalCircle account to declare ownership and list properties with zero brokerage.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    href="/login?redirect=/owner/become-owner"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white font-medium text-sm transition-colors shadow-sm"
                  >
                    Sign In to Account
                  </Link>
                  <Link
                    href="/register?redirect=/owner/become-owner"
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#E8E4DD] hover:border-forest/40 text-charcoal font-medium text-sm transition-colors"
                  >
                    Create Free Account
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8 max-w-xl mx-auto w-full">
                {/* Header */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold tracking-wider text-amber uppercase">
                    Step 1 of Owner Onboarding
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-serif font-bold text-charcoal">
                    Owner Declaration & Profile
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal-light">
                    Select your ownership relationship and accept the zero-brokerage declaration to activate property creation.
                  </p>
                </div>

                {/* Status Messages */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm"
                  >
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>{errorMessage}</div>
                  </div>
                )}

                {successMessage && (
                  <div
                    role="status"
                    className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>{successMessage}</div>
                  </div>
                )}

                {/* Ownership Type Selector */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Ownership Type <span className="text-red-500">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* TITLE_OWNER Card */}
                    <div
                      onClick={() => setOwnershipType("TITLE_OWNER")}
                      className={`cursor-pointer rounded-2xl p-4.5 border-2 transition-all select-none ${
                        ownershipType === "TITLE_OWNER"
                          ? "border-forest bg-forest-light/30 shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DD] text-forest">
                          <Building className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            ownershipType === "TITLE_OWNER"
                              ? "border-forest bg-forest text-white"
                              : "border-[#DDD8CE]"
                          }`}
                        >
                          {ownershipType === "TITLE_OWNER" && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-charcoal">
                          Property Owner
                        </h4>
                        <p className="text-xs text-charcoal-light mt-0.5">
                          Sole or Joint Deed Title Owner
                        </p>
                      </div>
                    </div>

                    {/* AUTHORIZED_REPRESENTATIVE Card */}
                    <div
                      onClick={() => setOwnershipType("AUTHORIZED_REPRESENTATIVE")}
                      className={`cursor-pointer rounded-2xl p-4.5 border-2 transition-all select-none ${
                        ownershipType === "AUTHORIZED_REPRESENTATIVE"
                          ? "border-forest bg-forest-light/30 shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="p-2.5 rounded-xl bg-white border border-[#E8E4DD] text-amber">
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            ownershipType === "AUTHORIZED_REPRESENTATIVE"
                              ? "border-forest bg-forest text-white"
                              : "border-[#DDD8CE]"
                          }`}
                        >
                          {ownershipType === "AUTHORIZED_REPRESENTATIVE" && (
                            <span className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-sm font-bold text-charcoal">
                          Authorized Representative
                        </h4>
                        <p className="text-xs text-charcoal-light mt-0.5">
                          Family Member or Legal Proxy
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Name Field (Optional, highlighted if representative or corporate) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="companyName"
                    className="block text-xs font-bold uppercase tracking-wider text-charcoal"
                  >
                    Company or Entity Name{" "}
                    <span className="text-charcoal-light font-normal lowercase">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Holdings Ltd or Family Trust (if applicable)"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal placeholder-charcoal-light/50 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15 transition-all"
                  />
                  <p className="text-[11px] text-charcoal-light">
                    Leave blank if you are listing private personal property.
                  </p>
                </div>

                {/* Zero-Brokerage Legal Declaration Box */}
                <div className="rounded-2xl p-5 bg-[#FAF7F0] border-2 border-amber/30 space-y-4">
                  <div className="flex items-center gap-2 text-amber font-bold text-xs uppercase tracking-wider">
                    <Scale className="w-4 h-4" />
                    <span>Zero-Brokerage Legal Undertaking</span>
                  </div>

                  <p className="text-xs leading-relaxed text-charcoal italic bg-white p-3.5 rounded-xl border border-amber/20">
                    &ldquo;I declare under penalty of perjury that I have the legal authority to list properties on this zero-brokerage platform. I will not charge any brokerage, commission, or unauthorized fees to prospective tenants or buyers.&rdquo;
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer select-none group pt-1">
                    <input
                      type="checkbox"
                      required
                      checked={declarationAccepted}
                      onChange={(e) => setDeclarationAccepted(e.target.checked)}
                      className="w-5 h-5 rounded border-[#DDD8CE] text-forest focus:ring-forest/20 mt-0.5 cursor-pointer accent-forest shrink-0"
                    />
                    <span className="text-xs text-charcoal font-medium leading-snug group-hover:text-forest transition-colors">
                      I have read, understood, and accept this zero-brokerage declaration under the RentalCircle Terms of Trust.
                    </span>
                  </label>
                </div>

                {/* Action button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !declarationAccepted}
                  className="w-full py-4 px-6 bg-forest hover:bg-forest-hover active:bg-[#072625] text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                      <span>Recording Declaration...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Declaration &amp; Enter Owner Portal</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
