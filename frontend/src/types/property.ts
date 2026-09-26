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

