import { ApiError, apiRequest } from './api';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestRecord {
  id: string;
  leaveType: string;
  leaveTypeLabel: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  appliedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}

export interface LeaveBalanceSummary {
  annual: number;
  sick: number;
  maternity: number;
  paternity: number;
  compassionate: number;
  unpaid: number;
  annual_left?: number;
  sick_left?: number;
}

export interface LeaveSummary {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  balances: LeaveBalanceSummary;
  annual_left: number;
  sick_left: number;
}

export interface LeaveRequestsPayload {
  requests: LeaveRequestRecord[];
  summary: LeaveSummary;
}

export interface SubmitLeaveRequestPayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: File | null;
}

const leaveTypeLabelMap: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  maternity: 'Maternity Leave',
  paternity: 'Paternity Leave',
  compassionate: 'Compassionate Leave',
  unpaid: 'Unpaid Leave',
};

const leaveRequestPaths = ['/api/leave/api/my/'];
const submitLeavePaths = ['/api/leave/api/request/'];

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function calculateDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diff);
}

export function normalizeLeaveType(value: string) {
  const normalized = String(value ?? '').trim().toLowerCase().replace(/_leave/g, '');
  return leaveTypeLabelMap[normalized] || normalized.toUpperCase();
}

function mapLeaveRequest(item: any): LeaveRequestRecord {
  return {
    id: String(item.id),
    leaveType: item.leave_type || 'annual',
    leaveTypeLabel: normalizeLeaveType(item.leave_type),
    startDate: item.start_date,
    endDate: item.end_date,
    totalDays: Number(item.days || calculateDays(item.start_date, item.end_date)),
    reason: item.reason || '',
    status: (item.status || 'pending').toLowerCase() as LeaveStatus,
    appliedAt: item.requested_at || item.created_at || null,
    reviewedAt: item.reviewed_at || null,
    reviewedBy: item.approved_by || null,
    rejectionReason: item.rejection_reason || null,
  };
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequestsPayload> {
  const payload = await apiRequest<any>(leaveRequestPaths[0]);
  const rawRequests = payload.leave_requests || payload.requests || [];

  const requests = rawRequests.map(mapLeaveRequest);

  const summary = {
    total: requests.length,
    pending: Number(payload.summary?.pending_count ?? 0),
    approved: Number(payload.summary?.approved_count ?? 0),
    rejected: requests.filter(r => r.status === 'rejected').length,
    balances: {
        annual: Number(payload.summary?.balances?.annual ?? 0),
        sick: Number(payload.summary?.balances?.sick ?? 0),
        maternity: Number(payload.summary?.balances?.maternity ?? 0),
        paternity: Number(payload.summary?.balances?.paternity ?? 0),
        compassionate: Number(payload.summary?.balances?.compassionate ?? 0),
        unpaid: Number(payload.summary?.balances?.unpaid ?? 0)
    },
    annual_left: Number(payload.summary?.annual_left ?? 0),
    sick_left: Number(payload.summary?.sick_left ?? 0),
  };

  return { requests, summary };
}

export async function cancelLeaveRequest(id: string) {
  return apiRequest(`/api/leave/api/cancel/${id}/`, { method: 'POST' });
}

export async function submitLeaveRequest(payload: SubmitLeaveRequestPayload) {
  const formData = new FormData();
  formData.append('leaveType', payload.leaveType);
  formData.append('startDate', payload.startDate);
  formData.append('endDate', payload.endDate);
  formData.append('reason', payload.reason);
  if (payload.attachment) {
    formData.append('attachment', payload.attachment);
  }

  return apiRequest(submitLeavePaths[0], {
    method: 'POST',
    body: formData,
  });
}
