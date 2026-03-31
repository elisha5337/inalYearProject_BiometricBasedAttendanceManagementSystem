import { ApiError, apiRequest } from './api';

export interface HrAttendanceRecord {
  id: number;
  employeeName: string;
  employeeCode: string;
  department: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  status: string;
  verificationStatus: string;
  method?: string;
  location: string;
  assignment: string;
}

const attendanceListPaths = [
  '/api/attendance/hr-records/',
  '/api/attendance/all/',
  '/api/attendance/api/records/',
  '/api/attendance/api/history/',
];

async function requestFirstAvailable<T>(paths: string[]) {
  let lastMissingEndpointError: ApiError | null = null;

  for (const path of paths) {
    try {
      return await apiRequest<T>(path);
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
    new Error('No compatible attendance endpoint was found for the HR attendance screen.')
  );
}

function extractRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const typedPayload = payload as Record<string, unknown>;

    if (Array.isArray(typedPayload.records)) {
      return typedPayload.records;
    }

    if (Array.isArray(typedPayload.attendance_records)) {
      return typedPayload.attendance_records;
    }

    if (Array.isArray(typedPayload.results)) {
      return typedPayload.results;
    }
  }

  return [];
}

function formatHours(checkInTime: string | null, checkOutTime: string | null, fallback: unknown) {
  if (typeof fallback === 'number') {
    return fallback;
  }

  if (checkInTime && checkOutTime) {
    const start = new Date(checkInTime);
    const end = new Date(checkOutTime);

    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      return Math.max(0, Math.round(hours * 100) / 100);
    }
  }

  return 0;
}

function resolveEmployeeName(item: Record<string, unknown>) {
  const user = item.user && typeof item.user === 'object' ? (item.user as Record<string, unknown>) : null;

  return String(
    item.employee_name ??
      item.employeeName ??
      item.full_name ??
      item.employee ??
      user?.full_name ??
      user?.username ??
      'Unknown Employee',
  );
}

function resolveEmployeeCode(item: Record<string, unknown>) {
  const user = item.user && typeof item.user === 'object' ? (item.user as Record<string, unknown>) : null;

  return String(item.employee_code ?? item.employeeId ?? item.employee_id ?? user?.id ?? 'N/A');
}

function resolveDepartment(item: Record<string, unknown>) {
  const detail =
    item.employee_detail && typeof item.employee_detail === 'object'
      ? (item.employee_detail as Record<string, unknown>)
      : null;

  if (typeof item.department === 'string' && item.department.trim()) {
    return item.department;
  }

  if (detail && typeof detail.department === 'string' && detail.department.trim()) {
    return detail.department;
  }

  const departmentObject =
    detail?.department && typeof detail.department === 'object'
      ? (detail.department as Record<string, unknown>)
      : null;

  return String(departmentObject?.name ?? 'Unassigned');
}

function mapAttendanceRecord(raw: unknown): HrAttendanceRecord {
  const item = (raw ?? {}) as Record<string, unknown>;
  const checkInTime = item.check_in_time ? String(item.check_in_time) : item.checkInTime ? String(item.checkInTime) : null;
  const checkOutTime =
    item.check_out_time ? String(item.check_out_time) : item.checkOutTime ? String(item.checkOutTime) : null;
  const derivedDate =
    item.date ??
    item.attendance_date ??
    item.check_in_date ??
    (checkInTime ? checkInTime.slice(0, 10) : null) ??
    (checkOutTime ? checkOutTime.slice(0, 10) : null);

  return {
    id: Number(item.id ?? Date.now()),
    employeeName: resolveEmployeeName(item),
    employeeCode: resolveEmployeeCode(item),
    department: resolveDepartment(item),
    date: String(derivedDate ?? ''),
    checkInTime,
    checkOutTime,
    hoursWorked: formatHours(checkInTime, checkOutTime, item.hours_worked ?? item.hoursWorked),
    status: String(item.status ?? 'Present'),
    verificationStatus: String(item.verification_status ?? item.verificationStatus ?? 'verified'),
    method: item.method ? String(item.method) : undefined,
    location: String(item.location ?? item.site ?? 'Main Office'),
    assignment: String(item.assignment ?? item.shift_name ?? item.shift ?? 'Standard Shift'),
  };
}

export async function fetchAttendanceRecords() {
  const payload = await requestFirstAvailable<unknown>(attendanceListPaths);

  return extractRows(payload)
    .map(mapAttendanceRecord)
    .sort((left, right) => {
      const leftKey = `${left.date} ${left.checkInTime ?? ''}`;
      const rightKey = `${right.date} ${right.checkInTime ?? ''}`;
      return new Date(rightKey).getTime() - new Date(leftKey).getTime();
    });
}

/**
 * HR dashboard needs date-scoped attendance records (for "today" chart + recent check-ins).
 * We keep the existing `fetchAttendanceRecords()` untouched for ManageAttendance compatibility.
 */
export async function fetchAttendanceRecordsForRange(startDate: string, endDate: string) {
  const payload = await apiRequest<unknown>(
    `/api/attendance/hr-records/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
  );

  return extractRows(payload)
    .map(mapAttendanceRecord)
    .sort((left, right) => {
      const leftKey = `${left.date} ${left.checkInTime ?? ''}`;
      const rightKey = `${right.date} ${right.checkInTime ?? ''}`;
      return new Date(rightKey).getTime() - new Date(leftKey).getTime();
    });
}
