"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  PlusCircle,
  LayoutDashboard,
  Home,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const isOwner =
    Boolean(user?.roles?.includes("ROLE_OWNER")) ||
    user?.userType === "OWNER";

  const listPropertyHref = isOwner
    ? "/owner/properties/new"
    : "/owner/become-owner";

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
      router.refresh();
    } catch {
      // Ignored
    }
  };

  return (
    <header className="border-b border-[#E8E4DD] bg-white/95 backdrop-blur-md sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-forest flex items-center justify-center text-white font-serif font-bold text-xl shadow-sm transition-transform group-hover:scale-105">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-serif font-bold tracking-tight text-forest leading-none">
                Rental<span className="text-amber">Circle</span>
              </span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-charcoal-light">
                Direct Owner Marketplace
              </span>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-forest-light text-forest border border-forest/10">
            <ShieldCheck className="w-3 h-3 text-forest" />
            Zero Brokerage
          </span>
        </div>

        {/* Desktop Navigation Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-charcoal">
          <Link
            href="/#discovery"
            className="hover:text-forest transition-colors"
          >
            Explore
          </Link>
          <Link
            href="/#trust"
            className="hover:text-forest transition-colors"
          >
            Trust Shield
          </Link>

          {isOwner && (
            <>
              <Link
                href="/owner/dashboard"
                className="hover:text-forest transition-colors flex items-center gap-1.5 font-semibold text-forest"
              >
                <LayoutDashboard className="w-4 h-4 text-forest" />
                Dashboard
              </Link>
              <Link
                href="/owner/properties"
                className="hover:text-forest transition-colors flex items-center gap-1.5"
              >
                <Home className="w-4 h-4" />
                My Properties
              </Link>
            </>
          )}
        </nav>

        {/* Desktop Actions & Auth */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Prominent List Property Button */}
          <Link
            href={listPropertyHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-sm font-medium shadow-sm transition-all duration-150 hover:shadow"
          >
            <PlusCircle className="w-4 h-4 text-amber" />
            <span>List Property</span>
          </Link>

          {/* User Status / Account Dropdown */}
          {isLoading ? (
            <div className="w-8 h-8 rounded-full bg-[#E8E4DD] animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-sand/60 text-sm font-medium text-charcoal transition-colors"
                aria-expanded={userDropdownOpen}
              >
                <div className="w-7 h-7 rounded-full bg-forest text-white text-xs font-semibold flex items-center justify-center">
                  {user.firstName ? user.firstName[0].toUpperCase() : "U"}
                </div>
                <span className="max-w-[120px] truncate text-xs font-semibold">
                  {user.firstName}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-charcoal-light" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E8E4DD] py-2 z-50 text-sm animate-in fade-in duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#E8E4DD]/60">
                    <p className="text-xs font-semibold text-charcoal truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-charcoal-light truncate">
                      {user.email}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-light text-forest">
                      {isOwner ? "Verified Owner" : "Tenant / Buyer"}
                    </span>
                  </div>

                  {isOwner ? (
                    <>
                      <Link
                        href="/owner/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2 text-charcoal hover:bg-sand transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-forest" />
                        Owner Dashboard
                      </Link>
                      <Link
                        href="/owner/properties"
                        className="flex items-center gap-2.5 px-4 py-2 text-charcoal hover:bg-sand transition-colors"
                      >
                        <Building2 className="w-4 h-4 text-forest" />
                        My Properties
                      </Link>
                    </>
                  ) : (
                    <Link
                      href="/owner/become-owner"
                      className="flex items-center gap-2.5 px-4 py-2 text-forest font-medium hover:bg-forest-light transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber" />
                      Become an Owner
                    </Link>
                  )}

                  <div className="border-t border-[#E8E4DD]/60 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3.5 py-2 text-sm font-semibold text-forest hover:text-forest-hover transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold text-charcoal hover:text-forest border border-[#E8E4DD] rounded-xl hover:border-forest/40 transition-colors"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden flex items-center space-x-2">
          <Link
            href={listPropertyHref}
            className="px-3 py-1.5 rounded-lg bg-forest text-white text-xs font-semibold flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber" />
            <span>List</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-charcoal hover:bg-sand border border-[#E8E4DD]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E8E4DD] bg-white px-4 pt-3 pb-6 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm font-medium">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand transition-colors"
            >
              Home
            </Link>
            {isOwner && (
              <>
                <Link
                  href="/owner/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-forest font-semibold bg-forest-light/60 flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-forest" />
                  Owner Dashboard
                </Link>
                <Link
                  href="/owner/properties"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  My Properties
                </Link>
              </>
            )}
            <Link
              href={listPropertyHref}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg bg-forest text-white font-medium flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-amber" />
              {isOwner ? "Add New Property" : "Become Verified Owner & List"}
            </Link>
          </nav>

          <div className="border-t border-[#E8E4DD] pt-3">
            {isAuthenticated && user ? (
              <div className="space-y-2">
                <div className="px-3 py-1">
                  <p className="text-xs font-semibold text-charcoal">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-charcoal-light">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold border border-[#E8E4DD] rounded-lg text-charcoal"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold bg-forest text-white rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
