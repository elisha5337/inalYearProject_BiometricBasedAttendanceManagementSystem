import { ApiError, apiRequest } from './api';

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestRecord {
  id: number;
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
}

export interface LeaveRequestsPayload {
  requests: LeaveRequestRecord[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    balances: LeaveBalanceSummary;
  };
}

export interface SubmitLeaveRequestPayload {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

const leaveTypeLabelMap: Record<string, string> = {
  annual_leave: 'Annual Leave',
  annual: 'Annual Leave',
  sick_leave: 'Sick Leave',
  sick: 'Sick Leave',
  maternity_leave: 'Maternity Leave',
  maternity: 'Maternity Leave',
  paternity_leave: 'Paternity Leave',
  paternity: 'Paternity Leave',
  compassionate_leave: 'Compassionate Leave',
  compassionate: 'Compassionate Leave',
  unpaid_leave: 'Unpaid Leave',
  unpaid: 'Unpaid Leave',
};

const leaveRequestPaths = [
  '/api/leave/api/my-requests/',
  '/api/leave/api/requests/',
  '/api/leave/api/history/',
  '/leave/api/my-requests/',
  '/leave/api/requests/',
  '/leave/api/history/',
];

const submitLeavePaths = [
  '/api/leave/api/request/',
  '/leave/api/request/',
];

function startOfDay(value: string) {
  return new Date(`${value}T00:00:00`);
}

function calculateDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / millisecondsPerDay) + 1);
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function normalizeLeaveType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'annual':
    case 'annual_leave':
      return 'Annual Leave';
    case 'sick':
    case 'sick_leave':
      return 'Sick Leave';
    case 'maternity':
    case 'maternity_leave':
      return 'Maternity Leave';
    case 'paternity':
    case 'paternity_leave':
      return 'Paternity Leave';
    case 'compassionate':
    case 'compassionate_leave':
      return 'Compassionate Leave';
    case 'unpaid':
    case 'unpaid_leave':
      return 'Unpaid Leave';
    default:
      return titleCase(normalized);
  }
}

function toBackendLeaveType(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  switch (normalized) {
    case 'annual':
    case 'annual_leave':
      return 'annual_leave';
    case 'sick':
    case 'sick_leave':
      return 'sick_leave';
    case 'maternity':
    case 'maternity_leave':
      return 'maternity_leave';
    case 'paternity':
    case 'paternity_leave':
      return 'paternity_leave';
    case 'compassionate':
    case 'compassionate_leave':
      return 'compassionate_leave';
    case 'unpaid':
    case 'unpaid_leave':
      return 'unpaid_leave';
    default:
      return normalized;
  }
}

async function requestFirstAvailable<T>(
  paths: string[],
  options?: Parameters<typeof apiRequest<T>>[1],
) {
  let lastMissingEndpointError: ApiError | null = null;

  for (const path of paths) {
    try {
      return await apiRequest<T>(path, options);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 405)) {
        lastMissingEndpointError = error;
        continue;
      }

      throw error;
    }
  }

  throw (
    lastMissingEndpointError ??
    new Error('No compatible leave endpoint was found for this frontend integration.')
  );
}

function extractRequests(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const typedPayload = payload as Record<string, unknown>;

    if (Array.isArray(typedPayload.requests)) {
      return typedPayload.requests;
    }

    if (Array.isArray(typedPayload.leave_requests)) {
      return typedPayload.leave_requests;
    }

    if (Array.isArray(typedPayload.results)) {
      return typedPayload.results;
    }
  }

  return [];
}

function normalizeLeaveStatus(value: unknown): LeaveStatus {
  const normalized = String(value ?? 'pending').trim().toLowerCase();

  if (normalized === 'approved' || normalized === 'rejected' || normalized === 'cancelled') {
    return normalized;
  }

  return 'pending';
}

function mapLeaveRequest(raw: unknown): LeaveRequestRecord {
  const item = (raw ?? {}) as Record<string, unknown>;
  const leaveTypeValue =
    item.leave_type ??
    item.leaveType ??
    item.type ??
    item.category ??
    'annual_leave';

  const startDate = String(item.start_date ?? item.startDate ?? '');
  const endDate = String(item.end_date ?? item.endDate ?? startDate);
  const leaveTypeKey = String(leaveTypeValue).trim().toLowerCase().replace(/\s+/g, '_');

  return {
    id: Number(item.id ?? Date.now()),
    leaveType: leaveTypeKey,
    leaveTypeLabel: leaveTypeLabelMap[leaveTypeKey] ?? normalizeLeaveType(String(leaveTypeValue)),
    startDate,
    endDate,
    totalDays: Number(item.total_days ?? item.totalDays ?? calculateDays(startDate, endDate)),
    reason: String(item.reason ?? item.description ?? ''),
    status: normalizeLeaveStatus(item.status),
    appliedAt: item.applied_at ? String(item.applied_at) : item.created_at ? String(item.created_at) : null,
    reviewedAt: item.reviewed_at ? String(item.reviewed_at) : item.updated_at ? String(item.updated_at) : null,
    reviewedBy:
      item.reviewed_by ? String(item.reviewed_by) : item.approved_by ? String(item.approved_by) : null,
    rejectionReason:
      item.rejection_reason ? String(item.rejection_reason) : item.comments ? String(item.comments) : null,
  };
}

function buildLeaveSummary(requests: LeaveRequestRecord[]) {
  const balances: LeaveBalanceSummary = {
    annual: 0,
    sick: 0,
    maternity: 0,
    paternity: 0,
    compassionate: 0,
    unpaid: 0,
  };

  for (const request of requests) {
    if (request.status !== 'approved') {
      continue;
    }

    switch (request.leaveType) {
      case 'annual_leave':
      case 'annual':
        balances.annual += request.totalDays;
        break;
      case 'sick_leave':
      case 'sick':
        balances.sick += request.totalDays;
        break;
      case 'maternity_leave':
      case 'maternity':
        balances.maternity += request.totalDays;
        break;
      case 'paternity_leave':
      case 'paternity':
        balances.paternity += request.totalDays;
        break;
      case 'compassionate_leave':
      case 'compassionate':
        balances.compassionate += request.totalDays;
        break;
      case 'unpaid_leave':
      case 'unpaid':
        balances.unpaid += request.totalDays;
        break;
      default:
        break;
    }
  }

  return {
    total: requests.length,
    pending: requests.filter((request) => request.status === 'pending').length,
    approved: requests.filter((request) => request.status === 'approved').length,
    rejected: requests.filter((request) => request.status === 'rejected').length,
    balances,
  };
}

export async function fetchMyLeaveRequests(): Promise<LeaveRequestsPayload> {
  const payload = await requestFirstAvailable<unknown>(leaveRequestPaths);
  const requests = extractRequests(payload)
    .map(mapLeaveRequest)
    .sort((left, right) => {
      const leftDate = left.appliedAt ?? left.startDate;
      const rightDate = right.appliedAt ?? right.startDate;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    });

  const summary = buildLeaveSummary(requests);

  return {
    requests,
    summary,
  };
}

export async function submitLeaveRequest(payload: SubmitLeaveRequestPayload) {
  return requestFirstAvailable(submitLeavePaths, {
    method: 'POST',
    body: {
      leave_type: toBackendLeaveType(payload.leaveType),
      start_date: payload.startDate,
      end_date: payload.endDate,
      reason: payload.reason,
    },
  });
}
