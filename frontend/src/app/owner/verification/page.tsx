"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  UploadCloud,
  FileText,
  Download,
  Trash2,
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Info,
  Loader2,
  Check,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  DocumentType,
  OwnerVerificationStatus,
  OwnerVerificationStatusResponse,
  VerificationDocument,
} from "@/types/owner";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, { title: string; subtitle: string }> = {
  IDENTITY_PROOF: {
    title: "Government Identity Proof",
    subtitle: "Aadhaar Card, Passport, or Voter ID",
  },
  ADDRESS_PROOF: {
    title: "Address Verification Proof",
    subtitle: "Utility Bill, Driving License, or Passport",
  },
  TITLE_DEED: {
    title: "Property Ownership Title Deed",
    subtitle: "Sale Deed, Conveyance, or Mutation Certificate",
  },
  PROPERTY_TAX_RECEIPT: {
    title: "Property Tax Assessment Receipt",
    subtitle: "Municipal Corporation or Panchayat Tax Challan",
  },
  ELECTRICITY_BILL: {
    title: "Recent Electricity / Utility Bill",
    subtitle: "Showing property address and active meter connection",
  },
};

export default function OwnerVerificationPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedType, setSelectedType] = useState<DocumentType>("IDENTITY_PROOF");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch Owner Verification Status & Documents
  const {
    data: verificationData,
    isLoading: statusLoading,
    error: statusError,
    refetch,
  } = useQuery<OwnerVerificationStatusResponse>({
    queryKey: ["owner-verification-status"],
    queryFn: async () => {
      try {
        const res = await apiClient.get("/owners/verification/status");
        const payload = res.data?.data ?? res.data;
        if (payload && typeof payload === "object") {
          return {
            ownerProfileId: payload.ownerProfileId ?? payload.id,
            verificationStatus: payload.verificationStatus ?? "NOT_STARTED",
            verifiedAt: payload.verifiedAt,
            verifiedBy: payload.verifiedBy,
            adminRemarks: payload.adminRemarks,
            submittedAt: payload.submittedAt,
            documents: Array.isArray(payload.documents) ? payload.documents : [],
          };
        }
        return {
          verificationStatus: "NOT_STARTED",
          documents: [],
        };
      } catch (err: any) {
        // If 404, owner exists but no documents/status yet
        if (err?.response?.status === 404) {
          return {
            verificationStatus: "NOT_STARTED",
            documents: [],
          };
        }
        throw err;
      }
    },
    enabled: isAuthenticated,
  });

  const verificationStatus: OwnerVerificationStatus =
    verificationData?.verificationStatus || "NOT_STARTED";
  const documents: VerificationDocument[] = verificationData?.documents || [];
  const adminRemarks = verificationData?.adminRemarks;
  const verifiedAt = verificationData?.verifiedAt;

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: DocumentType }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", docType);

      const res = await apiClient.post("/documents", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setUploadSuccess("Document uploaded successfully and queued for review.");
      setUploadError(null);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      queryClient.invalidateQueries({ queryKey: ["owner-verification-status"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to upload document. Please ensure it is a valid PDF or JPEG/PNG under 20MB.";
      setUploadError(msg);
      setUploadSuccess(null);
    },
  });

  // Submit for Verification Mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/owners/verification/submit");
      return res.data?.data ?? res.data;
    },
    onSuccess: () => {
      setActionMessage({
        type: "success",
        text: "Your KYC verification package has been submitted to admin moderation.",
      });
      queryClient.invalidateQueries({ queryKey: ["owner-verification-status"] });
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        "Failed to submit verification request. Ensure you have uploaded at least one identity document.";
      setActionMessage({ type: "error", text: msg });
    },
  });

  // Delete Document
  const handleDeleteDocument = async (docId: number) => {
    if (verificationStatus === "VERIFIED") return;
    if (!confirm("Are you sure you want to remove this verification document?")) return;

    try {
      setDeletingId(docId);
      await apiClient.delete(`/documents/${docId}`);
      setActionMessage({ type: "success", text: "Document removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["owner-verification-status"] });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Failed to delete document. It may already be locked under active review.";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  // Download Document via authenticated streaming
  const handleDownloadDocument = async (doc: VerificationDocument) => {
    try {
      setDownloadingId(doc.id);
      const res = await apiClient.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], {
        type: doc.contentType || "application/octet-stream",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", doc.originalFilename || `document-${doc.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert("Unable to download document. Please ensure your session is active.");
    } finally {
      setDownloadingId(null);
    }
  };

  // File selection validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFile(null);
      return;
    }

    const file = files[0];
    const maxBytes = 20 * 1024 * 1024; // 20 MB

    if (file.size > maxBytes) {
      setUploadError("File exceeds the 20MB limit. Please compress or select a smaller file.");
      setSelectedFile(null);
      return;
    }

    const validMimes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
    ];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      setUploadError("Invalid file type. Only PDF, JPEG, and PNG files are accepted.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please select a file to upload.");
      return;
    }
    uploadMutation.mutate({ file: selectedFile, docType: selectedType });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const isSubmitDisabled =
    documents.length === 0 ||
    verificationStatus === "SUBMITTED" ||
    verificationStatus === "UNDER_REVIEW" ||
    verificationStatus === "VERIFIED" ||
    submitMutation.isPending;

  return (
    <div className="min-h-screen bg-sand flex flex-col font-sans text-charcoal">
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-light">
          <Link href="/owner/dashboard" className="hover:text-forest transition-colors">
            Owner Portal
          </Link>
          <span>•</span>
          <span className="text-forest font-bold">KYC Verification</span>
        </div>

        {/* Status Header Block */}
        <div className="bg-white rounded-3xl border border-[#E8E4DD] p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-light">
                  Ownership Verification Status
                </span>
              </div>

              {/* Status Header Badge Logic */}
              {verificationStatus === "NOT_STARTED" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    NOT STARTED
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                    Identity Verification Required to List Properties Live
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    To maintain our zero-brokerage direct marketplace pledge, all property owners must verify their government ID and property ownership documents before listings are published to tenants and buyers.
                  </p>
                </div>
              )}

              {verificationStatus === "SUBMITTED" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    <Clock className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                    DOCUMENTS SUBMITTED
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                    Verification Documents Under Review
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    Your verification files have been received by our compliance team. Verification reviews are typically completed within 2 to 4 business hours.
                  </p>
                </div>
              )}

              {verificationStatus === "UNDER_REVIEW" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30">
                    <Clock className="w-3.5 h-3.5 text-amber animate-spin" />
                    REVIEW IN PROGRESS
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                    Review In Progress
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    An administrator is actively reviewing your documents and checking ownership records. You will receive an update once verified.
                  </p>
                </div>
              )}

              {verificationStatus === "MORE_INFORMATION_REQUIRED" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
                    MORE INFORMATION REQUIRED
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-charcoal">
                    Additional Verification Documentation Required
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    The moderator has reviewed your submission and requested additional or clearer proof. Please upload the requested files below and re-submit.
                  </p>
                </div>
              )}

              {verificationStatus === "VERIFIED" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    VERIFIED OWNER
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest">
                    Verified Owner
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    Your owner identity and documentation are verified. All properties approved by moderation will automatically go live on RentalCircle.
                  </p>
                  {verifiedAt && (
                    <div className="text-xs text-forest font-medium pt-1">
                      Verified on: <span className="font-semibold">{formatDate(verifiedAt)}</span>
                    </div>
                  )}
                </div>
              )}

              {verificationStatus === "REJECTED" && (
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    VERIFICATION REJECTED
                  </div>
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-rose-800">
                    Verification Rejected
                  </h1>
                  <p className="text-sm text-charcoal-light leading-relaxed">
                    Your verification could not be approved based on the submitted records. Please read the administrator remarks below for guidance.
                  </p>
                </div>
              )}
            </div>

            {/* Shield Graphic / Info Box */}
            <div className="shrink-0 p-4 rounded-2xl bg-sand border border-[#E8E4DD] flex items-center gap-3 self-start md:self-auto">
              <div className="w-12 h-12 rounded-xl bg-forest/10 flex items-center justify-center text-forest">
                <ShieldCheck className="w-6 h-6 text-forest" />
              </div>
              <div>
                <div className="text-xs font-bold text-charcoal uppercase">Bank-Grade Storage</div>
                <div className="text-[11px] text-charcoal-light max-w-[180px]">
                  Stored in private non-public encrypted volumes. Strictly restricted to verified admins.
                </div>
              </div>
            </div>
          </div>

          {/* Prominent Alert Box for MORE_INFORMATION_REQUIRED */}
          {verificationStatus === "MORE_INFORMATION_REQUIRED" && (
            <div className="mt-6 p-5 rounded-2xl bg-orange-50 border-2 border-orange-300 text-orange-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-orange-900">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span>Admin Remarks & Action Required</span>
              </div>
              <p className="text-sm leading-relaxed bg-white/70 p-3 rounded-xl border border-orange-200 font-mono text-xs text-orange-900">
                {adminRemarks || "Please upload a clearer copy of your Title Deed or Electricity Bill with matching name and address."}
              </p>
              <div className="text-xs text-orange-800">
                Please upload the requested replacement or supplementary documents below, then click <strong>&quot;Submit for Admin Verification&quot;</strong>.
              </div>
            </div>
          )}

          {/* Rejection Notice for REJECTED */}
          {verificationStatus === "REJECTED" && (
            <div className="mt-6 p-5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Reason for Rejection</span>
              </div>
              <p className="text-sm leading-relaxed bg-white/70 p-3 rounded-xl border border-rose-200 font-mono text-xs text-rose-900">
                {adminRemarks || "The submitted documentation does not meet platform verification standards."}
              </p>
              <div className="text-xs text-rose-800">
                You may re-upload new authentic documents below to re-apply for moderation.
              </div>
            </div>
          )}
        </div>

        {/* Action / Notification Banner */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-sm flex items-start justify-between gap-3 border ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-rose-50 border-rose-200 text-rose-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs underline hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Upload Form (Only enabled if not VERIFIED) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-[#E8E4DD] p-6 shadow-sm space-y-5">
              <div className="space-y-1">
                <h2 className="font-serif text-lg font-bold text-charcoal">
                  Upload Verification Document
                </h2>
                <p className="text-xs text-charcoal-light">
                  Upload authentic identity and title documents. Max 20MB per file (PDF, JPEG, PNG).
                </p>
              </div>

              {verificationStatus === "VERIFIED" ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Account Verified
                  </div>
                  <div>Your profile is fully verified. Document uploads are now archived.</div>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-4">
                  {/* Document Type Select */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="documentType"
                      className="block text-xs font-bold uppercase tracking-wider text-charcoal"
                    >
                      Document Type
                    </label>
                    <select
                      id="documentType"
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as DocumentType)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#E8E4DD] bg-white text-sm font-medium text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest transition-colors"
                    >
                      <option value="IDENTITY_PROOF">
                        Identity Proof (Aadhaar / Passport / Voter ID)
                      </option>
                      <option value="ADDRESS_PROOF">
                        Address Proof (Utility Bill / Driving License)
                      </option>
                      <option value="TITLE_DEED">
                        Title Deed / Sale Deed / Mutation Copy
                      </option>
                      <option value="PROPERTY_TAX_RECEIPT">
                        Property Tax Receipt (Current / Recent Year)
                      </option>
                      <option value="ELECTRICITY_BILL">
                        Electricity Bill (Recent Month with Meter)
                      </option>
                    </select>
                    <p className="text-[11px] text-charcoal-light">
                      {DOCUMENT_TYPE_LABELS[selectedType].subtitle}
                    </p>
                  </div>

                  {/* File Dropzone / Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                      File Selection
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-[#E8E4DD] hover:border-forest/60 bg-sand/40 hover:bg-forest/5 rounded-2xl p-6 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-2 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-forest/10 flex items-center justify-center text-forest group-hover:scale-105 transition-transform">
                        <UploadCloud className="w-5 h-5 text-forest" />
                      </div>
                      <div className="text-xs font-semibold text-charcoal">
                        {selectedFile ? (
                          <span className="text-forest break-all">{selectedFile.name}</span>
                        ) : (
                          <span>Click to select file or drag here</span>
                        )}
                      </div>
                      <div className="text-[11px] text-charcoal-light">
                        PDF, JPEG, or PNG • Up to 20MB limit
                      </div>
                      {selectedFile && (
                        <div className="text-[11px] font-semibold text-amber">
                          {formatFileSize(selectedFile.size)}
                        </div>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Inline Upload Errors / Success */}
                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadError}</span>
                    </div>
                  )}
                  {uploadSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{uploadSuccess}</span>
                    </div>
                  )}

                  {/* Upload Button */}
                  <button
                    type="submit"
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber" />
                        <span>Uploading Securely...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 text-amber" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Security Invariant Notice */}
              <div className="p-3.5 rounded-2xl bg-sand border border-[#E8E4DD] space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-charcoal">
                  <ShieldCheck className="w-4 h-4 text-forest" />
                  <span>RentalCircle Privacy Guarantee</span>
                </div>
                <p className="text-[11px] text-charcoal-light leading-relaxed">
                  Documents are validated for magic-bytes, renamed to unguessable UUIDs, and kept isolated from public web storage. They are never shared with prospective tenants or brokers.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Uploaded Documents Table & Submission CTA */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-[#E8E4DD] p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E4DD] pb-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-charcoal">
                    Uploaded Verification Files
                  </h2>
                  <p className="text-xs text-charcoal-light">
                    {documents.length} document{documents.length === 1 ? "" : "s"} attached to your KYC package
                  </p>
                </div>

                {documents.length > 0 && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-forest-light text-forest">
                    {documents.length} Ready
                  </span>
                )}
              </div>

              {/* Documents List */}
              {statusLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-charcoal-light gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-forest" />
                  <span className="text-xs">Loading verification records...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-[#E8E4DD] rounded-2xl p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-sand-muted flex items-center justify-center mx-auto text-charcoal-light">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-charcoal">No documents uploaded yet</h3>
                    <p className="text-xs text-charcoal-light max-w-sm mx-auto">
                      Select a document type on the left, choose your identity or property deed file, and upload it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const typeInfo = DOCUMENT_TYPE_LABELS[doc.documentType] || {
                      title: doc.documentType,
                      subtitle: "",
                    };

                    return (
                      <div
                        key={doc.id}
                        className="p-4 rounded-2xl border border-[#E8E4DD] hover:border-forest/30 bg-sand/30 hover:bg-sand/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-forest/10 flex items-center justify-center text-forest shrink-0 mt-0.5">
                            <FileText className="w-5 h-5 text-forest" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-charcoal">
                                {typeInfo.title}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  doc.status === "VERIFIED"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : doc.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </div>
                            <p className="text-xs text-charcoal-light truncate max-w-md">
                              {doc.originalFilename}
                            </p>
                            <div className="flex items-center gap-3 text-[11px] text-charcoal-light">
                              <span>{formatFileSize(doc.fileSizeBytes)}</span>
                              <span>•</span>
                              <span>{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Download & Delete */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            disabled={downloadingId === doc.id}
                            title="Download secure copy"
                            className="p-2 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-white text-charcoal hover:text-forest transition-colors disabled:opacity-50"
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-forest" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(doc.id)}
                            disabled={
                              verificationStatus === "VERIFIED" ||
                              doc.status === "VERIFIED" ||
                              deletingId === doc.id
                            }
                            title={
                              verificationStatus === "VERIFIED"
                                ? "Verified documents cannot be deleted"
                                : "Delete document"
                            }
                            className="p-2 rounded-xl border border-[#E8E4DD] hover:border-rose-300 bg-white text-charcoal hover:text-rose-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Submit for Admin Verification Section */}
              <div className="pt-4 border-t border-[#E8E4DD] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Ready for Verification?
                    </div>
                    <div className="text-xs text-charcoal-light">
                      Submit all attached documents for review by our moderation team.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => submitMutation.mutate()}
                    disabled={isSubmitDisabled}
                    className="py-3 px-6 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 shrink-0"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber" />
                        <span>Submitting...</span>
                      </>
                    ) : verificationStatus === "VERIFIED" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Account Verified</span>
                      </>
                    ) : verificationStatus === "SUBMITTED" ||
                      verificationStatus === "UNDER_REVIEW" ? (
                      <>
                        <Clock className="w-4 h-4 text-blue-300" />
                        <span>Submission Under Review</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber" />
                        <span>Submit for Admin Verification</span>
                      </>
                    )}
                  </button>
                </div>

                {documents.length === 0 && (
                  <p className="text-[11px] text-amber">
                    * Please upload at least one government ID or ownership deed before submitting.
                  </p>
                )}
              </div>
            </div>

            {/* Verification FAQ / Trust Policy Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#E8E4DD] space-y-3">
              <h3 className="font-serif text-base font-bold text-charcoal flex items-center gap-2">
                <Info className="w-4 h-4 text-forest" />
                <span>Why RentalCircle Verifies Every Owner</span>
              </h3>
              <p className="text-xs text-charcoal-light leading-relaxed">
                Brokers and unregistered agents frequently list copied property photos and fake rental listings. By verifying proof of ownership directly against municipal records, RentalCircle guarantees tenants real homes and protects genuine landlords.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-sand/60 border border-[#E8E4DD]/60 space-y-1">
                  <div className="text-xs font-semibold text-charcoal">Step 1: Document Check</div>
                  <div className="text-[11px] text-charcoal-light">Admin validates name matches government ID & utility/tax bill.</div>
                </div>
                <div className="p-3 rounded-xl bg-sand/60 border border-[#E8E4DD]/60 space-y-1">
                  <div className="text-xs font-semibold text-charcoal">Step 2: Instant Activation</div>
                  <div className="text-[11px] text-charcoal-light">Once verified, all your approved properties immediately become LIVE.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
