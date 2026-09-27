"use client";

import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      setErrorMsg(decodeURIComponent(error));
      setStatus("error");
      return;
    }

    if (!token) {
      setErrorMsg("No token received from Google. Please try again.");
      setStatus("error");
      return;
    }

    loginWithToken(token)
      .then(() => {
        router.replace("/");
      })
      .catch((err) => {
        console.error("OAuth2 callback error:", err);
        setErrorMsg(
          "Authentication succeeded but failed to load your profile. Please log in manually."
        );
        setStatus("error");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-[#E8E4DD] p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="font-serif font-bold text-lg text-[#1A1D20]">Sign-in failed</h2>
          <p className="text-sm text-[#5A6065]">{errorMsg}</p>
          <button
            onClick={() => router.push("/login")}
            className="w-full py-2.5 rounded-xl bg-[#1B4D3E] text-white text-sm font-semibold hover:bg-[#1B4D3E]/90 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1B4D3E]" />
        <p className="text-sm text-[#5A6065] font-medium">Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#1B4D3E]" />
            <p className="text-sm text-[#5A6065] font-medium">Loading…</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
