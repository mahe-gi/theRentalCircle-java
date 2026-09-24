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
