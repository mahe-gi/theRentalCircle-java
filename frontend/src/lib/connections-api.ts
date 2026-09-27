import { apiClient } from "./api-client";
import type {
  ContactResponse,
  EnquiryResponse,
  EnquiryStatus,
  VisitResponse,
  FavoriteToggleResponse,
  ReportResponse,
  ReportReason,
  ReportStatus,
  ResolutionAction,
  NotificationResponse,
  AdminDashboardResponse,
  AdminUserResponse,
  AdminActionResponse,
  PropertySearchResult,
  PagedResponse
} from "../types/property";

// --- Contact ---
export async function contactOwner(propertyId: number): Promise<ContactResponse> {
  const { data } = await apiClient.post(`/properties/${propertyId}/contact`);
  return data.data;
}

// --- Enquiry ---
export async function sendEnquiry(propertyId: number, message: string): Promise<EnquiryResponse> {
  const { data } = await apiClient.post(`/properties/${propertyId}/enquiries`, { message });
  return data.data;
}

export async function getMyEnquiries(page = 0, size = 20): Promise<PagedResponse<EnquiryResponse>> {
  const { data } = await apiClient.get("/enquiries/my", { params: { page, size } });
  return data.data;
}

export async function getReceivedEnquiries(page = 0, size = 20): Promise<PagedResponse<EnquiryResponse>> {
  const { data } = await apiClient.get("/enquiries/received", { params: { page, size } });
  return data.data;
}

export async function updateEnquiryStatus(enquiryId: number, status: EnquiryStatus): Promise<EnquiryResponse> {
  const { data } = await apiClient.put(`/enquiries/${enquiryId}/status`, { status });
  return data.data;
}

// --- Visit ---
export async function requestVisit(
  propertyId: number,
  visitData: { preferredDate: string; preferredTime: string; message?: string }
): Promise<VisitResponse> {
  const { data } = await apiClient.post(`/properties/${propertyId}/visits`, visitData);
  return data.data;
}

export async function getMyVisits(page = 0, size = 20): Promise<PagedResponse<VisitResponse>> {
  const { data } = await apiClient.get("/visits/my", { params: { page, size } });
  return data.data;
}

export async function getReceivedVisits(page = 0, size = 20): Promise<PagedResponse<VisitResponse>> {
  const { data } = await apiClient.get("/visits/received", { params: { page, size } });
  return data.data;
}

export async function acceptVisit(visitId: number): Promise<VisitResponse> {
  const { data } = await apiClient.put(`/visits/${visitId}/accept`);
  return data.data;
}

export async function rejectVisit(visitId: number, reason?: string): Promise<VisitResponse> {
  const { data } = await apiClient.put(`/visits/${visitId}/reject`, { reason });
  return data.data;
}

export async function rescheduleVisit(
  visitId: number,
  rescheduleData: { rescheduledDate: string; rescheduledTime: string; ownerRemarks?: string }
): Promise<VisitResponse> {
  const { data } = await apiClient.put(`/visits/${visitId}/reschedule`, rescheduleData);
  return data.data;
}

export async function cancelVisit(visitId: number): Promise<VisitResponse> {
  const { data } = await apiClient.put(`/visits/${visitId}/cancel`);
  return data.data;
}

export async function completeVisit(visitId: number): Promise<VisitResponse> {
  const { data } = await apiClient.put(`/visits/${visitId}/complete`);
  return data.data;
}

// --- Favorite ---
export async function toggleFavorite(propertyId: number): Promise<FavoriteToggleResponse> {
  const { data } = await apiClient.post(`/properties/${propertyId}/favorite`);
  return data.data;
}

export async function getFavoriteStatus(propertyId: number): Promise<boolean> {
  const { data } = await apiClient.get(`/properties/${propertyId}/favorite/status`);
  return data.data.isFavorited;
}

export async function getMyFavorites(page = 0, size = 20): Promise<PagedResponse<PropertySearchResult>> {
  const { data } = await apiClient.get("/favorites", { params: { page, size } });
  return data.data;
}

// --- Report ---
export async function submitReport(reportData: {
  propertyId?: number;
  reportedUserId?: number;
  reason: ReportReason;
  description?: string;
}): Promise<ReportResponse> {
  const { data } = await apiClient.post("/reports", reportData);
  return data.data;
}

export async function getMyReports(page = 0, size = 20): Promise<PagedResponse<ReportResponse>> {
  const { data } = await apiClient.get("/reports/my", { params: { page, size } });
  return data.data;
}

export async function listAdminReports(status?: ReportStatus, page = 0, size = 20): Promise<PagedResponse<ReportResponse>> {
  const { data } = await apiClient.get("/admin/reports", { params: { status, page, size } });
  return data.data;
}

export async function investigateReport(reportId: number): Promise<ReportResponse> {
  const { data } = await apiClient.put(`/admin/reports/${reportId}/investigate`);
  return data.data;
}

export async function resolveReport(
  reportId: number,
  resolution: { action: ResolutionAction; notes?: string }
): Promise<ReportResponse> {
  const { data } = await apiClient.put(`/admin/reports/${reportId}/resolve`, resolution);
  return data.data;
}

export async function dismissReport(reportId: number, notes?: string): Promise<ReportResponse> {
  const { data } = await apiClient.put(`/admin/reports/${reportId}/dismiss`, { notes });
  return data.data;
}

// --- Notification ---
export async function getNotifications(page = 0, size = 20): Promise<PagedResponse<NotificationResponse>> {
  const { data } = await apiClient.get("/notifications", { params: { page, size } });
  return data.data;
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const { data } = await apiClient.get("/notifications/unread-count");
  return data.data.unreadCount;
}

export async function markNotificationRead(id: number): Promise<void> {
  await apiClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.put("/notifications/read-all");
}

// --- Admin ---
export async function getAdminDashboardMetrics(): Promise<AdminDashboardResponse> {
  const { data } = await apiClient.get("/admin/dashboard");
  return data.data;
}

export async function listAdminUsers(page = 0, size = 20): Promise<PagedResponse<AdminUserResponse>> {
  const { data } = await apiClient.get("/admin/users", { params: { page, size } });
  return data.data;
}

export async function suspendUser(userId: number): Promise<AdminUserResponse> {
  const { data } = await apiClient.put(`/admin/users/${userId}/suspend`);
  return data.data;
}

export async function restoreUser(userId: number): Promise<AdminUserResponse> {
  const { data } = await apiClient.put(`/admin/users/${userId}/restore`);
  return data.data;
}

export async function getAdminAuditLogs(page = 0, size = 20): Promise<PagedResponse<AdminActionResponse>> {
  const { data } = await apiClient.get("/admin/audit-logs", { params: { page, size } });
  return data.data;
}
