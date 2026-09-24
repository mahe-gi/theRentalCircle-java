"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Loader2,
  Search,
  MapPin,
  IndianRupee,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { AdminPropertyItem, PropertyStatus, PropertyImage } from "@/types/property";
import { OwnerVerificationStatus } from "@/types/owner";

type PropertyStatusTab =
  | "ALL"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "APPROVED"
  | "LIVE"
  | "REJECTED";

export default function AdminPropertiesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<PropertyStatusTab>("SUBMITTED");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<AdminPropertyItem | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [remarksModalAction, setRemarksModalAction] = useState<"REQUEST_INFO" | "REJECT" | null>(null);
  const [adminRemarksInput, setAdminRemarksInput] = useState("");
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "conflict";
    message: string;
  } | null>(null);

  const isAdmin =
    Boolean(user?.roles?.includes("ROLE_ADMIN")) ||
    user?.userType === "ADMIN";

  // Query Properties for Moderation
  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    error: propertiesError,
  } = useQuery<AdminPropertyItem[]>({
    queryKey: ["admin-properties", activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      const res = await apiClient.get("/admin/properties", { params });
      const raw = res.data?.data ?? res.data;
      if (Array.isArray(raw)) {
        return raw as AdminPropertyItem[];
      }
      if (raw && Array.isArray(raw.content)) {
        return raw.content as AdminPropertyItem[];
      }
      return [] as AdminPropertyItem[];
    },
    enabled: isAuthenticated && isAdmin,
  });

  // Approve Property Mutation
  const approveMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const res = await apiClient.put(`/admin/properties/${propertyId}/approve`);
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      const isLive = data?.status === "LIVE" || selectedProperty?.ownerKycStatus === "VERIFIED";
      setNotification({
        type: "success",
        message: isLive
          ? `Property #${selectedProperty?.id} approved and published LIVE! (Owner KYC is Verified).`
          : `Property #${selectedProperty?.id} marked APPROVED. It will transition to LIVE as soon as owner KYC is verified.`,
      });
      setSelectedProperty(null);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): Another moderator has already made a decision on this property. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to approve property.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
  });

  // Request More Info Mutation
  const requestInfoMutation = useMutation({
    mutationFn: async ({ propertyId, remarks }: { propertyId: number; remarks: string }) => {
      const res = await apiClient.put(`/admin/properties/${propertyId}/request-info`, {
        remarks,
        adminRemarks: remarks,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setNotification({
        type: "success",
        message: `Requested additional information for Property #${selectedProperty?.id}. Status updated to MORE_INFORMATION_REQUIRED.`,
      });
      setRemarksModalAction(null);
      setSelectedProperty(null);
      setAdminRemarksInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): This property was already updated by another moderator. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to request additional information.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
  });

  // Reject Property Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ propertyId, remarks }: { propertyId: number; remarks: string }) => {
      const res = await apiClient.put(`/admin/properties/${propertyId}/reject`, {
        remarks,
        adminRemarks: remarks,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setNotification({
        type: "success",
        message: `Property #${selectedProperty?.id} rejected with moderator remarks.`,
      });
      setRemarksModalAction(null);
      setSelectedProperty(null);
      setAdminRemarksInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): This property was already updated by another moderator. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to reject property.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
  });

  const handleOpenRemarksModal = (action: "REQUEST_INFO" | "REJECT") => {
    setRemarksModalAction(action);
    setAdminRemarksInput("");
    setRemarksError(null);
  };

  const handleConfirmRemarksAction = () => {
    if (!adminRemarksInput.trim()) {
      setRemarksError("Administrator remarks are required.");
      return;
    }
    if (!selectedProperty) return;

    if (remarksModalAction === "REQUEST_INFO") {
      requestInfoMutation.mutate({
        propertyId: selectedProperty.id,
        remarks: adminRemarksInput.trim(),
      });
    } else if (remarksModalAction === "REJECT") {
      rejectMutation.mutate({
        propertyId: selectedProperty.id,
        remarks: adminRemarksInput.trim(),
      });
    }
  };

  // Filter properties by search query
  const properties = propertiesData || [];
  const filteredProperties = properties.filter((prop) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      prop.id.toString().includes(q) ||
      prop.title.toLowerCase().includes(q) ||
      prop.city?.toLowerCase().includes(q) ||
      prop.district?.toLowerCase().includes(q) ||
      prop.locality?.toLowerCase().includes(q) ||
      prop.ownerName?.toLowerCase().includes(q)
    );
  });

  const formatPrice = (price: number, listingType?: string) => {
    if (!price) return "₹0";
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Cr`;
    }
    if (price >= 100000) {
      return `₹${(price / 100000).toFixed(2)} Lakh`;
    }
    return `₹${price.toLocaleString("en-IN")}${listingType === "RENT" ? "/mo" : ""}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getOwnerKycBadge = (status?: OwnerVerificationStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Owner Verified
          </span>
        );
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3 text-blue-600" />
            KYC In Review
          </span>
        );
      case "MORE_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3 text-orange-600" />
            KYC Info Req
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3 h-3 text-rose-600" />
            KYC Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
            <Clock className="w-3 h-3 text-gray-500" />
            Unverified Owner
          </span>
        );
    }
  };

  const getPropertyStatusBadge = (status: PropertyStatus) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            LIVE
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            APPROVED
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            SUBMITTED
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30">
            <Clock className="w-3.5 h-3.5 text-amber" />
            UNDER_REVIEW
          </span>
        );
      case "MORE_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
            MORE_INFO_REQ
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-sand flex flex-col font-sans text-charcoal">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DD] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-light mb-1">
              <span>Admin Moderation Console</span>
              <span>•</span>
              <span className="text-forest font-bold">Property Moderation</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-charcoal tracking-tight flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-forest" />
              <span>Property Moderation Queue</span>
            </h1>
            <p className="text-sm text-charcoal-light mt-1">
              Review listing specifications, pricing, locality details, and photo galleries before granting live approval.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/owners"
              className="px-4 py-2 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-white text-xs font-semibold text-charcoal hover:text-forest transition-colors flex items-center gap-2 shadow-sm"
            >
              <Users className="w-4 h-4 text-forest" />
              <span>Switch to Owners KYC Queue</span>
            </Link>
          </div>
        </div>

        {/* Access Warning if not admin */}
        {!authLoading && !isAdmin && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Restricted Administrative Area</span>
            </div>
            <p className="text-xs text-rose-800">
              Your account does not possess the <code>ROLE_ADMIN</code> privilege required to inspect property listings or execute moderation decisions.
            </p>
          </div>
        )}

        {/* Global Action Notification */}
        {notification && (
          <div
            className={`p-4 rounded-2xl text-sm flex items-start justify-between gap-3 border shadow-sm ${
              notification.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : notification.type === "conflict"
                ? "bg-amber/20 border-amber/40 text-charcoal"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : notification.type === "conflict" ? (
                <AlertTriangle className="w-5 h-5 text-amber shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-xs underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Status Tabs Bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-[#E8E4DD] shadow-sm overflow-x-auto max-w-full">
            {(
              [
                "SUBMITTED",
                "UNDER_REVIEW",
                "MORE_INFORMATION_REQUIRED",
                "APPROVED",
                "LIVE",
                "REJECTED",
                "ALL",
              ] as PropertyStatusTab[]
            ).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-forest text-white shadow-sm"
                      : "text-charcoal hover:bg-sand hover:text-forest"
                  }`}
                >
                  {tab === "ALL"
                    ? "All Listings"
                    : tab === "MORE_INFORMATION_REQUIRED"
                    ? "More Info Req"
                    : tab.replace("_", " ")}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-charcoal-light absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, locality, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E4DD] bg-white text-xs font-medium text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
          </div>
        </div>

        {/* Properties Table */}
        <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DD] bg-sand/60 text-charcoal-light font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Owner KYC Status</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">City / District</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DD]">
                {propertiesLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-light">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-forest" />
                        <span>Loading property records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-light">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Building2 className="w-6 h-6 text-charcoal-light/60" />
                        <span className="font-semibold text-charcoal">No properties found</span>
                        <span className="text-[11px]">
                          {activeTab !== "ALL"
                            ? `No properties currently in "${activeTab}" status.`
                            : "There are currently no property listings in this view."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map((prop) => (
                    <tr
                      key={prop.id}
                      className="hover:bg-sand/40 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedProperty(prop);
                        setSelectedImageIndex(0);
                      }}
                    >
                      <td className="py-3.5 px-4 font-semibold text-charcoal max-w-xs">
                        <div className="truncate">{prop.title}</div>
                        <div className="text-[11px] text-charcoal-light flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-forest">#{prop.id}</span>
                          <span>•</span>
                          <span>{prop.bhk ? `${prop.bhk} BHK ` : ""}{prop.propertyType}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-charcoal">
                        {prop.ownerName || `Owner #${prop.ownerProfileId || "—"}`}
                      </td>
                      <td className="py-3.5 px-4">
                        {getOwnerKycBadge(prop.ownerKycStatus)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-forest">
                        {formatPrice(prop.price, prop.listingType)}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-light">
                        {prop.locality ? `${prop.locality}, ` : ""}{prop.city || prop.district}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-light">
                        {formatDate(prop.submittedAt || prop.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProperty(prop);
                            setSelectedImageIndex(0);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Property Review Modal */}
        {selectedProperty && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="bg-white rounded-3xl border border-[#E8E4DD] shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#E8E4DD] flex items-start justify-between gap-4 bg-sand/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                      Property Moderation Inspector
                    </span>
                    <span>•</span>
                    <span className="font-mono text-xs font-bold text-forest">
                      ID #{selectedProperty.id}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                    {selectedProperty.title}
                  </h2>
                  <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                    {getPropertyStatusBadge(selectedProperty.status)}
                    <span className="text-xs text-charcoal-light">
                      Owner: <strong>{selectedProperty.ownerName || `Owner #${selectedProperty.ownerProfileId}`}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-xs text-charcoal-light">
                      Submitted on {formatDate(selectedProperty.submittedAt || selectedProperty.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProperty(null)}
                  className="p-2 rounded-xl text-charcoal-light hover:text-charcoal hover:bg-sand border border-transparent hover:border-[#E8E4DD] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Golden Invariant Indicator Banner */}
                {selectedProperty.ownerKycStatus === "VERIFIED" ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-emerald-900 uppercase tracking-wider">
                        Owner is Verified
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Owner is Verified. Approving this property will immediately publish it LIVE.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber/15 border border-amber/40 text-charcoal flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs text-amber uppercase tracking-wider">
                        Owner KYC Incomplete
                      </div>
                      <p className="text-xs text-charcoal leading-relaxed">
                        Notice: Owner is not yet verified. Approving will mark property APPROVED, but it will NOT go LIVE until owner KYC is verified.
                      </p>
                    </div>
                  </div>
                )}

                {/* Photo Gallery Inspector */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-forest" />
                      <span>Property Photo Gallery</span>
                    </h3>
                    <span className="text-xs text-charcoal-light">
                      {selectedProperty.images?.length || 0} photo{selectedProperty.images?.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {selectedProperty.images && selectedProperty.images.length > 0 ? (
                    <div className="space-y-3">
                      {/* Main Selected Image */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-sand-muted border border-[#E8E4DD] flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={
                            selectedProperty.images[selectedImageIndex]?.url ||
                            (selectedProperty.images[selectedImageIndex]?.storageKey
                              ? `/uploads/${selectedProperty.images[selectedImageIndex].storageKey}`
                              : "/placeholder-property.jpg")
                          }
                          alt={selectedProperty.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-medium">
                          Photo {selectedImageIndex + 1} of {selectedProperty.images.length}
                          {selectedProperty.images[selectedImageIndex]?.isPrimary && " (Cover)"}
                        </div>
                      </div>

                      {/* Thumbnails Row */}
                      <div className="flex gap-2.5 overflow-x-auto pb-1">
                        {selectedProperty.images.map((img, idx) => (
                          <button
                            key={img.id || idx}
                            type="button"
                            onClick={() => setSelectedImageIndex(idx)}
                            className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                              selectedImageIndex === idx
                                ? "border-forest ring-2 ring-forest/20"
                                : "border-transparent opacity-75 hover:opacity-100"
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url || (img.storageKey ? `/uploads/${img.storageKey}` : "")}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {img.isPrimary && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-[#E8E4DD] rounded-2xl text-xs text-charcoal-light">
                      No photos uploaded for this property listing.
                    </div>
                  )}
                </div>

                {/* Property Specs & Pricing Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Specs */}
                  <div className="p-4 rounded-2xl bg-sand/30 border border-[#E8E4DD] space-y-2.5 text-xs">
                    <h4 className="font-bold text-charcoal uppercase tracking-wider text-[11px] border-b border-[#E8E4DD]/60 pb-1.5">
                      Core Specifications
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-charcoal-light">Property Type:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.propertyType}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Listing Type:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.listingType}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Bedrooms:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.bedrooms || selectedProperty.bhk || "—"}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Bathrooms:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.bathrooms || "—"}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Carpet Area:</span>{" "}
                        <span className="font-semibold text-charcoal">
                          {selectedProperty.carpetArea ? `${selectedProperty.carpetArea} sq.ft` : "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Furnishing:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.furnishing || "—"}</span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Floor:</span>{" "}
                        <span className="font-semibold text-charcoal">
                          {selectedProperty.floorNumber ?? "—"} / {selectedProperty.totalFloors ?? "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-charcoal-light">Preferred Tenant:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedProperty.preferredTenant || "ANY"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Pricing & Location */}
                  <div className="p-4 rounded-2xl bg-sand/30 border border-[#E8E4DD] space-y-2.5 text-xs">
                    <h4 className="font-bold text-charcoal uppercase tracking-wider text-[11px] border-b border-[#E8E4DD]/60 pb-1.5">
                      Pricing & Location
                    </h4>
                    <div className="space-y-1.5">
                      <div>
                        <span className="text-charcoal-light">Listed Price:</span>{" "}
                        <span className="font-bold text-forest text-sm">
                          {formatPrice(selectedProperty.price, selectedProperty.listingType)}
                        </span>
                      </div>
                      {selectedProperty.securityDeposit !== undefined && (
                        <div>
                          <span className="text-charcoal-light">Security Deposit:</span>{" "}
                          <span className="font-semibold text-charcoal">
                            ₹{selectedProperty.securityDeposit.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}
                      {selectedProperty.maintenanceCharges !== undefined && (
                        <div>
                          <span className="text-charcoal-light">Maintenance:</span>{" "}
                          <span className="font-semibold text-charcoal">
                            ₹{selectedProperty.maintenanceCharges.toLocaleString("en-IN")}/mo
                          </span>
                        </div>
                      )}
                      <div className="pt-1 border-t border-[#E8E4DD]/60">
                        <span className="text-charcoal-light">Address:</span>{" "}
                        <span className="font-medium text-charcoal">
                          {selectedProperty.address}, {selectedProperty.locality}, {selectedProperty.district}, {selectedProperty.city} - {selectedProperty.pincode}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Declared Amenities
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProperty.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-sand-muted border border-[#E8E4DD] text-xs font-medium text-charcoal"
                        >
                          {amenity.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedProperty.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Owner Description
                    </h4>
                    <p className="text-xs text-charcoal-light leading-relaxed bg-sand/30 p-3 rounded-xl border border-[#E8E4DD]">
                      {selectedProperty.description}
                    </p>
                  </div>
                )}

                {/* Previous Admin Remarks (if present) */}
                {selectedProperty.adminRemarks && (
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-1">
                    <div className="font-bold text-orange-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span>Previous Moderator Remarks</span>
                    </div>
                    <p className="text-orange-950 font-mono text-[11px]">
                      {selectedProperty.adminRemarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer / Decision Actions */}
              <div className="p-6 border-t border-[#E8E4DD] bg-sand/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-[11px] text-charcoal-light">
                  Decisions are state-conditional and atomically trigger property activation.
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleOpenRemarksModal("REQUEST_INFO")}
                    disabled={requestInfoMutation.isPending || approveMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-amber/40 hover:bg-amber/10 text-amber text-xs font-semibold transition-colors"
                  >
                    Request More Info
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRemarksModal("REJECT")}
                    disabled={rejectMutation.isPending || approveMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors"
                  >
                    Reject Property
                  </button>

                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(selectedProperty.id)}
                    disabled={approveMutation.isPending || selectedProperty.status === "LIVE"}
                    className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {approveMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber" />
                    )}
                    <span>Approve Property</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remarks Input Sub-Modal for Request Info / Reject */}
        {remarksModalAction && selectedProperty && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal/70 backdrop-blur-sm animate-in fade-in duration-100">
            <div
              className="bg-white rounded-3xl border border-[#E8E4DD] shadow-2xl w-full max-w-lg p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal-light">
                  <span>Mandatory Moderator Remarks</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-charcoal">
                  {remarksModalAction === "REQUEST_INFO"
                    ? "Request Additional Property Information"
                    : "Reject Property Listing"}
                </h3>
                <p className="text-xs text-charcoal-light">
                  {remarksModalAction === "REQUEST_INFO"
                    ? "Explain what needs correction in this listing (e.g., photo quality, floor plan mismatch, unrealistic rent)."
                    : "Specify the platform policy reason or defect that prevents this property listing from being published."}
                </p>
              </div>

              <div className="space-y-1.5">
                <textarea
                  rows={4}
                  placeholder="Enter specific moderator remarks for the owner..."
                  value={adminRemarksInput}
                  onChange={(e) => {
                    setAdminRemarksInput(e.target.value);
                    if (remarksError) setRemarksError(null);
                  }}
                  className="w-full p-3 rounded-xl border border-[#E8E4DD] bg-white text-xs font-medium text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
                {remarksError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{remarksError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemarksModalAction(null)}
                  className="px-4 py-2 rounded-xl border border-[#E8E4DD] hover:bg-sand text-xs font-semibold text-charcoal"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemarksAction}
                  disabled={requestInfoMutation.isPending || rejectMutation.isPending}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-sm transition-colors ${
                    remarksModalAction === "REQUEST_INFO"
                      ? "bg-amber hover:bg-amber-hover"
                      : "bg-rose-700 hover:bg-rose-800"
                  }`}
                >
                  {requestInfoMutation.isPending || rejectMutation.isPending
                    ? "Submitting Decision..."
                    : remarksModalAction === "REQUEST_INFO"
                    ? "Submit Info Request"
                    : "Confirm Rejection"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
