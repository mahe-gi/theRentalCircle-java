export type PropertyType =
  | "APARTMENT"
  | "HOUSE"
  | "VILLA"
  | "COMMERCIAL"
  | "STUDIO";

export type ListingType = "RENT" | "SALE";

export type PropertyStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "LIVE"
  | "REJECTED"
  | "MORE_INFORMATION_REQUIRED";

export type FurnishingType = "FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED";

export type PreferredTenantType = "ANY" | "FAMILY" | "BACHELORS" | "COMPANY";

export interface PropertyImage {
  id: number;
  propertyId?: number;
  storageKey: string;
  originalFilename?: string;
  fileSizeBytes?: number;
  contentType?: string;
  displayOrder?: number;
  isPrimary: boolean;
  url?: string;
  createdAt?: string;
}

export interface Property {
  id: number;
  ownerProfileId?: number;
  title: string;
  propertyType: PropertyType;
  listingType: ListingType;
  price: number;
  maintenanceCharges?: number;
  securityDeposit?: number;
  bhk?: number;
  bedrooms?: number;
  bathrooms?: number;
  carpetArea?: number;
  builtUpArea?: number;
  furnishing?: FurnishingType;
  floorNumber?: number;
  totalFloors?: number;
  description?: string;
  preferredTenant?: PreferredTenantType;
  availabilityDate?: string;
  status: PropertyStatus;
  state: string;
  city: string;
  district: string;
  locality: string;
  address: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  amenities?: string[];
  images?: PropertyImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PropertyFormData {
  // Step 1: Basic Details
  title: string;
  propertyType: PropertyType;
  listingType: ListingType;
  bhk: number;
  bedrooms: number;
  bathrooms: number;
  floorNumber?: number;
  totalFloors?: number;

  // Step 2: Pricing & Areas
  price: number;
  maintenanceCharges: number;
  securityDeposit: number;
  carpetArea: number;
  builtUpArea: number;
  availabilityDate?: string;

  // Step 3: Location
  state: string;
  city: string;
  district: string;
  locality: string;
  address: string;
  pincode: string;
  latitude?: number;
  longitude?: number;

  // Step 4: Amenities & Rules
  furnishing: FurnishingType;
  preferredTenant: PreferredTenantType;
  amenities: string[];
  description: string;
}

export interface AdminPropertyItem extends Property {
  ownerName?: string;
  ownerEmail?: string;
  ownerKycStatus: import("./owner").OwnerVerificationStatus;
  submittedAt?: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  adminRemarks?: string | null;
}

export interface PropertySearchResult {
  id: number;
  title: string;
  listingType: "RENT" | "SALE";
  propertyType: string;
  price: number;
  maintenanceCharges?: number;
  bhk?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carpetArea?: number | null;
  furnishing?: string | null;
  city: string;
  district: string;
  locality: string;
  latitude?: number | null;
  longitude?: number | null;
  primaryImageUrl?: string | null;
  amenities: string[];
  availabilityDate?: string | null;
  createdAt: string;
}

export interface SearchFilters {
  listingType?: "RENT" | "SALE";
  propertyType?: string;
  city?: string;
  district?: string;
  locality?: string;
  minPrice?: number;
  maxPrice?: number;
  bhk?: number[];
  furnishing?: string;
  amenities?: string[];
  minArea?: number;
  maxArea?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
  sort?: "NEWEST" | "PRICE_ASC" | "PRICE_DESC";
  page?: number;
  size?: number;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface PublicPropertyDetail {
  id: number;
  title: string;
  listingType: "RENT" | "SALE";
  propertyType: string;
  price: number;
  maintenanceCharges?: number;
  securityDeposit?: number;
  bhk?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  carpetArea?: number | null;
  builtUpArea?: number | null;
  furnishing?: string | null;
  floorNumber?: number | null;
  totalFloors?: number | null;
  description?: string;
  preferredTenant?: string;
  availabilityDate?: string | null;
  state: string;
  city: string;
  district: string;
  locality: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  amenities: string[];
  images: Array<{
    id: number;
    url: string;
    displayOrder: number;
    isPrimary: boolean;
  }>;
  owner?: {
    ownershipType?: string;
    verifiedBadge?: boolean;
  };
  createdAt: string;
}

export interface LocationSuggestionsResponse {
  cities: string[];
  districts: string[];
  localities: string[];
}

export interface ContactResponse {
  contactEventId: number;
  propertyId: number;
  whatsappUrl: string;
  ownerName: string;
}

export type EnquiryStatus = "NEW" | "CONTACTED" | "VISIT_SCHEDULED" | "CLOSED";

export interface EnquiryResponse {
  id: number;
  propertyId: number;
  propertyTitle: string;
  userId: number;
  userName: string;
  userEmail: string;
  userMobile?: string;
  message: string;
  status: EnquiryStatus;
  createdAt: string;
  updatedAt: string;
}

export type VisitStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW";

export interface VisitResponse {
  id: number;
  propertyId: number;
  propertyTitle: string;
  city: string;
  locality: string;
  userId: number;
  userName: string;
  userEmail: string;
  userMobile?: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  status: VisitStatus;
  rescheduledDate?: string;
  rescheduledTime?: string;
  ownerRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FavoriteToggleResponse {
  propertyId: number;
  isFavorited: boolean;
  message: string;
}

export type ReportReason =
  | "BROKER"
  | "SPAM"
  | "FAKE_PROPERTY"
  | "WRONG_INFORMATION"
  | "DUPLICATE_LISTING"
  | "WRONG_PRICE"
  | "ALREADY_RENTED"
  | "ALREADY_SOLD"
  | "SCAM"
  | "OTHER";

export type ReportStatus = "OPEN" | "UNDER_INVESTIGATION" | "RESOLVED" | "DISMISSED";

export type ResolutionAction =
  | "DISMISS"
  | "REQUEST_INFORMATION"
  | "WARN"
  | "HIDE_PROPERTY"
  | "REJECT_PROPERTY"
  | "SUSPEND_USER"
  | "BLOCK_USER";

export interface ReportResponse {
  id: number;
  reporterId: number;
  reporterName: string;
  propertyId?: number;
  propertyTitle?: string;
  reportedUserId?: number;
  reportedUserName?: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  assignedAdminId?: number;
  assignedAdminName?: string;
  resolutionAction?: ResolutionAction;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface NotificationResponse {
  id: number;
  userId: number;
  title: string;
  message: string;
  notificationType: string;
  referenceType?: string;
  referenceId?: number;
  isRead: boolean;
  createdAt: string;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  totalOwners: number;
  verifiedOwners: number;
  pendingOwners: number;
  liveProperties: number;
  pendingProperties: number;
  openReports: number;
  totalVisits: number;
  totalEnquiries: number;
}

export interface AdminUserResponse {
  id: number;
  email: string;
  mobile?: string;
  firstName: string;
  lastName: string;
  userType: string;
  active: boolean;
  emailVerified: boolean;
  mobileVerified: boolean;
  roles: string[];
  createdAt: string;
}

export interface AdminActionResponse {
  id: number;
  adminId: number;
  adminName: string;
  action: string;
  targetType: string;
  targetId: number;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

