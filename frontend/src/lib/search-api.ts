import { apiClient } from "./api-client";
import type {
  LocationSuggestionsResponse,
  PagedResponse,
  PropertySearchResult,
  PublicPropertyDetail,
  SearchFilters,
} from "../types/property";

export async function searchProperties(
  filters: SearchFilters
): Promise<PagedResponse<PropertySearchResult>> {
  const params = new URLSearchParams();

  if (filters.listingType) params.append("listingType", filters.listingType);
  if (filters.propertyType) params.append("propertyType", filters.propertyType);
  if (filters.city) params.append("city", filters.city);
  if (filters.district) params.append("district", filters.district);
  if (filters.locality) params.append("locality", filters.locality);
  if (filters.minPrice != null) params.append("minPrice", filters.minPrice.toString());
  if (filters.maxPrice != null) params.append("maxPrice", filters.maxPrice.toString());

  if (filters.bhk && filters.bhk.length > 0) {
    filters.bhk.forEach((b) => params.append("bhk", b.toString()));
  }

  if (filters.furnishing) params.append("furnishing", filters.furnishing);

  if (filters.amenities && filters.amenities.length > 0) {
    filters.amenities.forEach((a) => params.append("amenities", a));
  }

  if (filters.minArea != null) params.append("minArea", filters.minArea.toString());
  if (filters.maxArea != null) params.append("maxArea", filters.maxArea.toString());

  if (
    filters.minLat != null &&
    filters.maxLat != null &&
    filters.minLng != null &&
    filters.maxLng != null
  ) {
    params.append("minLat", filters.minLat.toString());
    params.append("maxLat", filters.maxLat.toString());
    params.append("minLng", filters.minLng.toString());
    params.append("maxLng", filters.maxLng.toString());
  }

  if (filters.sort) params.append("sort", filters.sort);
  if (filters.page != null) params.append("page", filters.page.toString());
  if (filters.size != null) params.append("size", filters.size.toString());

  const response = await apiClient.get<{
    status: string;
    data: any;
  }>("/api/v1/properties/search", { params });

  const raw = response.data.data;
  return {
    content: raw?.content || [],
    page: raw?.page?.number ?? raw?.page ?? 0,
    size: raw?.page?.size ?? raw?.size ?? 20,
    totalElements: raw?.page?.totalElements ?? raw?.totalElements ?? (raw?.content?.length || 0),
    totalPages: raw?.page?.totalPages ?? raw?.totalPages ?? 1,
    last: raw?.page ? (raw.page.number >= raw.page.totalPages - 1) : (raw?.last ?? true),
  };
}

export async function suggestLocations(
  query: string,
  type?: string,
  city?: string
): Promise<LocationSuggestionsResponse> {
  const params = new URLSearchParams();
  params.append("query", query);
  if (type) params.append("type", type);
  if (city) params.append("city", city);

  const response = await apiClient.get<{
    status: string;
    data: LocationSuggestionsResponse;
  }>("/api/v1/properties/search/locations", { params });

  return response.data.data;
}

export async function fetchPublicPropertyDetail(
  id: number | string
): Promise<PublicPropertyDetail> {
  const response = await apiClient.get<{
    status: string;
    data: PublicPropertyDetail;
  }>(`/api/v1/properties/${id}`);

  return response.data.data;
}
