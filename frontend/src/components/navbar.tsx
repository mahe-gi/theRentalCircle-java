"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  PlusCircle,
  LayoutDashboard,
  Home,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Users,
  FileCheck,
  Heart,
  MessageSquare,
  Calendar,
  Flag,
  Bell,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getUnreadNotificationsCount,
  getNotifications,
  markAllNotificationsRead
} from "@/lib/connections-api";
import type { NotificationResponse } from "@/types/property";

export function Navbar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);

  const isOwner =
    Boolean(user?.roles?.includes("ROLE_OWNER")) ||
    user?.userType === "OWNER";

  const isAdmin =
    Boolean(user?.roles?.includes("ROLE_ADMIN")) ||
    user?.userType === "ADMIN";

  const listPropertyHref = isOwner
    ? "/owner/properties/new"
    : "/owner/become-owner";

  useEffect(() => {
    if (isAuthenticated) {
      getUnreadNotificationsCount()
        .then(setUnreadCount)
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleOpenNotifications = async () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) {
      setUserDropdownOpen(false);
      setAdminDropdownOpen(false);
      try {
        const res = await getNotifications(0, 10);
        setNotifications(res.content || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

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

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-charcoal">
          <Link
            href="/properties"
            className="hover:text-forest transition-colors font-semibold text-forest"
          >
            Search Properties
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
                Properties
              </Link>
              <Link
                href="/owner/enquiries"
                className="hover:text-forest transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 text-forest" />
                Enquiries
              </Link>
              <Link
                href="/owner/visits"
                className="hover:text-forest transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-forest" />
                Visits
              </Link>
            </>
          )}

          {isAdmin && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber bg-amber/10 border border-amber/20 hover:bg-amber/20 transition-colors"
                aria-expanded={adminDropdownOpen}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber" />
                <span>Admin Console</span>
                <ChevronDown className="w-3.5 h-3.5 text-amber" />
              </button>

              {adminDropdownOpen && (
                <div
                  className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#E8E4DD] py-2 z-50 text-sm animate-in fade-in duration-100"
                  onClick={() => setAdminDropdownOpen(false)}
                >
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-light">
                    Operations
                  </div>
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <LayoutDashboard className="w-4 h-4 text-forest" />
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/owners"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <Users className="w-4 h-4 text-forest" />
                    Verify Owners
                  </Link>
                  <Link
                    href="/admin/properties"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <Building2 className="w-4 h-4 text-forest" />
                    Moderate Properties
                  </Link>
                  <Link
                    href="/admin/reports"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <Flag className="w-4 h-4 text-rose-600" />
                    Violation Reports
                  </Link>
                  <Link
                    href="/admin/users"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <Users className="w-4 h-4 text-forest" />
                    User Directory
                  </Link>
                  <Link
                    href="/admin/audit-logs"
                    className="flex items-center gap-2.5 px-3.5 py-2 text-charcoal hover:bg-sand transition-colors font-medium text-xs"
                  >
                    <ShieldCheck className="w-4 h-4 text-forest" />
                    Audit Logs
                  </Link>
                </div>
              )}
            </div>
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

          {/* Notification Bell */}
          {isAuthenticated && (
            <div className="relative">
              <button
                type="button"
                onClick={handleOpenNotifications}
                className="relative p-2 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-sand/40 text-charcoal transition"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-[#E8E4DD] p-3 z-50 space-y-2 animate-in fade-in duration-100">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE1]">
                    <span className="font-serif font-bold text-xs text-charcoal">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-forest font-semibold hover:underline flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F0ECE1] space-y-1">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-charcoal-light">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl text-xs space-y-1 transition ${
                            n.isRead ? "bg-white" : "bg-forest-light/30 font-medium"
                          }`}
                        >
                          <p className="font-bold text-charcoal text-[11px]">{n.title}</p>
                          <p className="text-charcoal-light text-[11px] line-clamp-2">{n.message}</p>
                          <span className="text-[9px] text-charcoal-light block">
                            {new Date(n.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
                  className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-lg border border-[#E8E4DD] py-2 z-50 text-sm animate-in fade-in duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#E8E4DD]/60">
                    <p className="text-xs font-semibold text-charcoal truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-charcoal-light truncate">
                      {user.email}
                    </p>
                  </div>

                  {/* Tenant / Buyer Features */}
                  <div className="py-1">
                    <Link
                      href="/favorites"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal hover:bg-sand transition-colors"
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Saved Properties
                    </Link>
                    <Link
                      href="/enquiries"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal hover:bg-sand transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-forest" />
                      My Enquiries
                    </Link>
                    <Link
                      href="/visits"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal hover:bg-sand transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5 text-forest" />
                      Scheduled Visits
                    </Link>
                    <Link
                      href="/reports"
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-charcoal hover:bg-sand transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5 text-amber" />
                      My Reports
                    </Link>
                  </div>

                  {isOwner && (
                    <div className="border-t border-[#E8E4DD]/60 py-1">
                      <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-charcoal-light">
                        Owner Tools
                      </div>
                      <Link
                        href="/owner/dashboard"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-charcoal hover:bg-sand transition-colors"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-forest" />
                        Owner Dashboard
                      </Link>
                      <Link
                        href="/owner/enquiries"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-charcoal hover:bg-sand transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-forest" />
                        Received Enquiries
                      </Link>
                      <Link
                        href="/owner/visits"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-charcoal hover:bg-sand transition-colors"
                      >
                        <Calendar className="w-3.5 h-3.5 text-forest" />
                        Received Visits
                      </Link>
                    </div>
                  )}

                  {!isOwner && (
                    <div className="border-t border-[#E8E4DD]/60 py-1">
                      <Link
                        href="/owner/become-owner"
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-forest font-medium hover:bg-forest-light transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-amber" />
                        Become an Owner
                      </Link>
                    </div>
                  )}

                  <div className="border-t border-[#E8E4DD]/60 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
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
            <Link
              href="/properties"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-forest font-semibold hover:bg-sand transition-colors"
            >
              Search Properties
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  href="/favorites"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Heart className="w-4 h-4 text-rose-500" />
                  Saved Properties
                </Link>
                <Link
                  href="/enquiries"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-forest" />
                  My Enquiries
                </Link>
                <Link
                  href="/visits"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-forest" />
                  Scheduled Visits
                </Link>
              </>
            )}

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
                <Link
                  href="/owner/enquiries"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4 text-forest" />
                  Received Enquiries
                </Link>
                <Link
                  href="/owner/visits"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-forest" />
                  Received Visits
                </Link>
              </>
            )}

            {isAdmin && (
              <div className="pt-2 border-t border-[#E8E4DD]/60 space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber">
                  Admin Console
                </div>
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4 text-forest" />
                  Operations Dashboard
                </Link>
                <Link
                  href="/admin/owners"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Users className="w-4 h-4 text-forest" />
                  Verify Owners
                </Link>
                <Link
                  href="/admin/properties"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4 text-forest" />
                  Moderate Properties
                </Link>
                <Link
                  href="/admin/reports"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg text-charcoal hover:bg-sand flex items-center gap-2"
                >
                  <Flag className="w-4 h-4 text-rose-600" />
                  Violation Reports
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
