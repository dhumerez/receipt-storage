import { apiClient } from './client.ts';

export interface NotificationItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  isRead: boolean;
  createdAt: string;
  referenceNumber: string;
  totalAmount: string;
  clientName: string;
  submitterName: string;
  rejectionReason?: string;
}

export interface ApproveResult {
  id: string;
  status: string;
}

export function getNotifications(): Promise<NotificationItem[]> {
  return apiClient<NotificationItem[]>('/api/v1/notifications');
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiClient<{ count: number }>('/api/v1/notifications/unread-count');
}

export function markNotificationRead(id: string): Promise<void> {
  return apiClient<void>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiClient<void>('/api/v1/notifications/mark-all-read', { method: 'POST' });
}

export function approveTransaction(id: string): Promise<ApproveResult> {
  return apiClient<ApproveResult>(`/api/v1/transactions/${id}/approve`, { method: 'POST' });
}

export function rejectTransaction(id: string, reason: string): Promise<void> {
  return apiClient<void>(`/api/v1/transactions/${id}/reject`, {
    method: 'POST',
    json: { reason },
  });
}
