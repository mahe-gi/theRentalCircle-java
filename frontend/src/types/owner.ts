export type OwnershipType = "TITLE_OWNER" | "AUTHORIZED_REPRESENTATIVE";

export interface OwnerProfile {
  id: number;
  userId: number;
  ownershipType: OwnershipType;
  companyName?: string | null;
  declarationAccepted: boolean;
  declarationAcceptedAt: string;
  declarationVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterOwnerRequest {
  ownershipType: OwnershipType;
  companyName?: string;
  declarationAccepted: boolean;
}
