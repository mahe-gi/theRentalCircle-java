export type OwnershipType = "TITLE_OWNER" | "AUTHORIZED_REPRESENTATIVE";

export type OwnerVerificationStatus =
  | "NOT_STARTED"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_REQUIRED"
  | "VERIFIED"
  | "REJECTED";

export type DocumentType =
  | "IDENTITY_PROOF"
  | "ADDRESS_PROOF"
  | "TITLE_DEED"
  | "PROPERTY_TAX_RECEIPT"
  | "ELECTRICITY_BILL";

export type DocumentStatus =
  | "UPLOADED"
  | "UNDER_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export interface VerificationDocument {
  id: number;
  ownerProfileId?: number;
  propertyId?: number | null;
  documentType: DocumentType;
  storageKey?: string;
  originalFilename: string;
  fileSizeBytes: number;
  contentType: string;
  status: DocumentStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface OwnerProfile {
  id: number;
  userId: number;
  ownershipType: OwnershipType;
  companyName?: string | null;
  declarationAccepted: boolean;
  declarationAcceptedAt: string;
  declarationVersion: string;
  verificationStatus?: OwnerVerificationStatus;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
  adminRemarks?: string | null;
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterOwnerRequest {
  ownershipType: OwnershipType;
  companyName?: string;
  declarationAccepted: boolean;
}

export interface OwnerVerificationStatusResponse {
  ownerProfileId?: number;
  verificationStatus: OwnerVerificationStatus;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
  adminRemarks?: string | null;
  submittedAt?: string | null;
  documents: VerificationDocument[];
}

export interface AdminOwnerItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userMobile?: string | null;
  ownershipType: OwnershipType;
  companyName?: string | null;
  verificationStatus: OwnerVerificationStatus;
  submittedAt?: string | null;
  declarationAccepted: boolean;
  declarationAcceptedAt?: string | null;
  declarationVersion?: string;
  adminRemarks?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: number | null;
  documents?: VerificationDocument[];
  createdAt: string;
}
