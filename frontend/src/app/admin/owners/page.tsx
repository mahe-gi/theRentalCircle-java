"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  AlertTriangle,
  Search,
  Filter,
  Users,
  Eye,
  X,
  Loader2,
  Lock,
  Building2,
  HelpCircle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  AdminOwnerItem,
  OwnerVerificationStatus,
  VerificationDocument,
} from "@/types/owner";

type StatusTab =
  | "ALL"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED";

export default function AdminOwnersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<StatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<AdminOwnerItem | null>(null);
  const [remarksModalAction, setRemarksModalAction] = useState<"REQUEST_INFO" | "REJECT" | null>(null);
  const [adminRemarksInput, setAdminRemarksInput] = useState("");
  const [remarksError, setRemarksError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "conflict"; message: string } | null>(null);
  const [downloadingDocId, setDownloadingDocId] = useState<number | null>(null);

  const isAdmin =
    Boolean(user?.roles?.includes("ROLE_ADMIN")) ||
    user?.userType === "ADMIN";

  // Fetch Owners Query
  const {
    data: ownersData,
    isLoading: ownersLoading,
    error: ownersError,
    refetch,
  } = useQuery<AdminOwnerItem[]>({
    queryKey: ["admin-owners", activeTab],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "ALL") {
        params.verificationStatus = activeTab;
      }
      const res = await apiClient.get("/admin/owners", { params });
      const raw = res.data?.data ?? res.data;
      if (Array.isArray(raw)) {
        return raw as AdminOwnerItem[];
      }
      if (raw && Array.isArray(raw.content)) {
        return raw.content as AdminOwnerItem[];
      }
      return [] as AdminOwnerItem[];
    },
    enabled: isAuthenticated && isAdmin,
  });

  // Verify Owner Mutation
  const verifyMutation = useMutation({
    mutationFn: async (ownerId: number) => {
      const res = await apiClient.put(`/admin/owners/${ownerId}/verify`);
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setNotification({
        type: "success",
        message: `Owner #${selectedOwner?.id} successfully verified. Any approved listings for this owner have been transitioned to LIVE.`,
      });
      setSelectedOwner(null);
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): Another moderator has already made a decision on this owner. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to verify owner.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
  });

  // Request Information Mutation
  const requestInfoMutation = useMutation({
    mutationFn: async ({ ownerId, remarks }: { ownerId: number; remarks: string }) => {
      const res = await apiClient.put(`/admin/owners/${ownerId}/request-info`, {
        remarks,
        adminRemarks: remarks,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setNotification({
        type: "success",
        message: `Requested additional information for Owner #${selectedOwner?.id}. Status updated to MORE_INFORMATION_REQUIRED.`,
      });
      setRemarksModalAction(null);
      setSelectedOwner(null);
      setAdminRemarksInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): This owner was already updated by another admin. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to request additional information.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
  });

  // Reject Owner Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ ownerId, remarks }: { ownerId: number; remarks: string }) => {
      const res = await apiClient.put(`/admin/owners/${ownerId}/reject`, {
        remarks,
        adminRemarks: remarks,
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setNotification({
        type: "success",
        message: `Owner #${selectedOwner?.id} verification rejected.`,
      });
      setRemarksModalAction(null);
      setSelectedOwner(null);
      setAdminRemarksInput("");
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
    onError: (err: any) => {
      if (err?.response?.status === 409) {
        setNotification({
          type: "conflict",
          message: "Conflict (409): This owner was already updated by another admin. Refreshing latest state...",
        });
      } else {
        const msg = err?.response?.data?.message || "Failed to reject owner.";
        setNotification({ type: "error", message: msg });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-owners"] });
    },
  });

  // Admin Secure Document Download
  const handleAdminDownload = async (doc: VerificationDocument) => {
    try {
      setDownloadingDocId(doc.id);
      const res = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: doc.contentType || "application/octet-stream",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", doc.originalFilename || `admin-doc-${doc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert("Error downloading document. Access log may have failed or document not found.");
    } finally {
      setDownloadingDocId(null);
    }
  };

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
    if (!selectedOwner) return;

    if (remarksModalAction === "REQUEST_INFO") {
      requestInfoMutation.mutate({
        ownerId: selectedOwner.id,
        remarks: adminRemarksInput.trim(),
      });
    } else if (remarksModalAction === "REJECT") {
      rejectMutation.mutate({
        ownerId: selectedOwner.id,
        remarks: adminRemarksInput.trim(),
      });
    }
  };

  // Filter owners by search query
  const owners = ownersData || [];
  const filteredOwners = owners.filter((owner) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      owner.id.toString().includes(q) ||
      owner.userName?.toLowerCase().includes(q) ||
      owner.userEmail?.toLowerCase().includes(q) ||
      owner.companyName?.toLowerCase().includes(q)
    );
  });

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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusBadge = (status: OwnerVerificationStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            VERIFIED
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
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            NOT_STARTED
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
              <span className="text-forest font-bold">Owner KYC Moderation</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-charcoal tracking-tight flex items-center gap-2.5">
              <Users className="w-7 h-7 text-forest" />
              <span>Owner KYC Verification Queue</span>
            </h1>
            <p className="text-sm text-charcoal-light mt-1">
              Inspect government identity credentials, property deeds, and ownership declarations before granting verification.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/properties"
              className="px-4 py-2 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-white text-xs font-semibold text-charcoal hover:text-forest transition-colors flex items-center gap-2 shadow-sm"
            >
              <Building2 className="w-4 h-4 text-forest" />
              <span>Switch to Properties Queue</span>
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
              Your account does not possess the <code>ROLE_ADMIN</code> privilege required to inspect owner KYC documents or execute moderation decisions.
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
                "ALL",
                "SUBMITTED",
                "UNDER_REVIEW",
                "MORE_INFORMATION_REQUIRED",
                "VERIFIED",
                "REJECTED",
              ] as StatusTab[]
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
                    ? "All Statuses"
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
              placeholder="Search by ID, name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-[#E8E4DD] bg-white text-xs font-medium text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
            />
          </div>
        </div>

        {/* Owners Table */}
        <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E8E4DD] bg-sand/60 text-charcoal-light font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Owner ID</th>
                  <th className="py-3 px-4">User Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Ownership Type</th>
                  <th className="py-3 px-4">Verification Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DD]">
                {ownersLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-light">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-forest" />
                        <span>Loading owner verification records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredOwners.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-light">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Users className="w-6 h-6 text-charcoal-light/60" />
                        <span className="font-semibold text-charcoal">No owner records found</span>
                        <span className="text-[11px]">
                          {activeTab !== "ALL"
                            ? `No owners currently match the "${activeTab}" status filter.`
                            : "There are currently no owner registration records in the platform."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOwners.map((owner) => (
                    <tr
                      key={owner.id}
                      className="hover:bg-sand/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedOwner(owner)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-charcoal">
                        #{owner.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-charcoal">
                        {owner.userName || `User #${owner.userId}`}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-light">
                        {owner.userEmail || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-sand-muted border border-[#E8E4DD] text-[11px] font-medium text-charcoal">
                          {owner.ownershipType === "TITLE_OWNER"
                            ? "Title Owner"
                            : "Authorized Representative"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(owner.verificationStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-light">
                        {formatDate(owner.submittedAt || owner.createdAt)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOwner(owner);
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

        {/* Review Modal */}
        {selectedOwner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              className="bg-white rounded-3xl border border-[#E8E4DD] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#E8E4DD] flex items-start justify-between gap-4 bg-sand/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                      Moderation Inspector
                    </span>
                    <span>•</span>
                    <span className="font-mono text-xs font-bold text-forest">
                      Owner #{selectedOwner.id}
                    </span>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-charcoal">
                    {selectedOwner.userName || `Owner #${selectedOwner.id}`}
                  </h2>
                  <div className="flex items-center gap-2 pt-0.5">
                    {getStatusBadge(selectedOwner.verificationStatus)}
                    <span className="text-xs text-charcoal-light">
                      Submitted on {formatDate(selectedOwner.submittedAt || selectedOwner.createdAt)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOwner(null)}
                  className="p-2 rounded-xl text-charcoal-light hover:text-charcoal hover:bg-sand border border-transparent hover:border-[#E8E4DD] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Security Audit Banner */}
                <div className="p-4 rounded-2xl bg-amber/10 border border-amber/30 text-charcoal space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber">
                    <Lock className="w-4 h-4 text-amber" />
                    <span>Confidential Admin Access — Access Logged</span>
                  </div>
                  <p className="text-[11px] text-charcoal-light leading-relaxed">
                    All document views and downloads are recorded as append-only audit records in the administrative actions log (<code>admin_actions</code>) with your administrator ID, timestamp, and client IP address. Do not share or store documents on unauthorized devices.
                  </p>
                </div>

                {/* Owner Details & Declaration History */}
                <div className="bg-sand/30 rounded-2xl border border-[#E8E4DD] p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-forest" />
                    <span>Owner Details & Declaration History</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-charcoal-light">Full Name:</span>{" "}
                      <span className="font-semibold text-charcoal">{selectedOwner.userName}</span>
                    </div>
                    <div>
                      <span className="text-charcoal-light">Email Address:</span>{" "}
                      <span className="font-semibold text-charcoal">{selectedOwner.userEmail}</span>
                    </div>
                    <div>
                      <span className="text-charcoal-light">Ownership Type:</span>{" "}
                      <span className="font-semibold text-charcoal">
                        {selectedOwner.ownershipType === "TITLE_OWNER"
                          ? "Direct Title Owner"
                          : "Authorized Representative"}
                      </span>
                    </div>
                    {selectedOwner.companyName && (
                      <div>
                        <span className="text-charcoal-light">Entity / Company:</span>{" "}
                        <span className="font-semibold text-charcoal">{selectedOwner.companyName}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-charcoal-light">Declaration Accepted:</span>{" "}
                      <span className="font-semibold text-emerald-700">
                        {selectedOwner.declarationAccepted ? "Yes (Signed Online)" : "No"}
                      </span>
                    </div>
                    <div>
                      <span className="text-charcoal-light">Declaration Version:</span>{" "}
                      <span className="font-mono text-charcoal">
                        {selectedOwner.declarationVersion || "v1.0"}
                      </span>
                    </div>
                    {selectedOwner.declarationAcceptedAt && (
                      <div className="sm:col-span-2">
                        <span className="text-charcoal-light">Consent Timestamp:</span>{" "}
                        <span className="text-charcoal">
                          {formatDate(selectedOwner.declarationAcceptedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Previous Admin Remarks (if present) */}
                {selectedOwner.adminRemarks && (
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 text-xs space-y-1">
                    <div className="font-bold text-orange-900 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span>Previous Moderator Remarks</span>
                    </div>
                    <p className="text-orange-950 font-mono text-[11px]">
                      {selectedOwner.adminRemarks}
                    </p>
                  </div>
                )}

                {/* Uploaded KYC Documents List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-forest" />
                      <span>Uploaded KYC Verification Documents</span>
                    </h3>
                    <span className="text-xs text-charcoal-light">
                      {selectedOwner.documents?.length || 0} attached
                    </span>
                  </div>

                  {!selectedOwner.documents || selectedOwner.documents.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-[#E8E4DD] rounded-2xl text-xs text-charcoal-light">
                      No documents currently attached to this owner profile.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedOwner.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-2xl border border-[#E8E4DD] bg-white flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-forest/10 flex items-center justify-center text-forest shrink-0">
                              <FileText className="w-4 h-4 text-forest" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-charcoal">
                                  {doc.documentType.replace(/_/g, " ")}
                                </span>
                                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sand-muted text-charcoal-light">
                                  {doc.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-charcoal-light truncate max-w-sm">
                                {doc.originalFilename}
                              </p>
                              <div className="text-[10px] text-charcoal-light">
                                {formatFileSize(doc.fileSizeBytes)} • {formatDate(doc.createdAt)}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAdminDownload(doc)}
                            disabled={downloadingDocId === doc.id}
                            className="px-3 py-1.5 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-sand/60 hover:bg-sand text-xs font-semibold text-forest flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
                          >
                            {downloadingDocId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-forest" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-forest" />
                            )}
                            <span>Secure Download</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                    disabled={requestInfoMutation.isPending || verifyMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-amber/40 hover:bg-amber/10 text-amber text-xs font-semibold transition-colors"
                  >
                    Request More Info
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRemarksModal("REJECT")}
                    disabled={rejectMutation.isPending || verifyMutation.isPending}
                    className="px-4 py-2 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition-colors"
                  >
                    Reject Owner
                  </button>

                  <button
                    type="button"
                    onClick={() => verifyMutation.mutate(selectedOwner.id)}
                    disabled={verifyMutation.isPending || selectedOwner.verificationStatus === "VERIFIED"}
                    className="px-5 py-2 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {verifyMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber" />
                    )}
                    <span>Verify Owner</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remarks Input Sub-Modal for Request Info / Reject */}
        {remarksModalAction && selectedOwner && (
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
                    ? "Request Additional Documentation"
                    : "Reject Owner Verification"}
                </h3>
                <p className="text-xs text-charcoal-light">
                  {remarksModalAction === "REQUEST_INFO"
                    ? "Explain clearly which documents are missing or why submitted scans were illegible."
                    : "Specify the platform policy reason or defect that prevents this owner from being verified."}
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
