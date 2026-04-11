import { ApiError, apiRequest } from './api';

export interface HrAttendanceRecord {
  id: string; // Changed from number to string to support UUIDs
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
  throw (lastMissingEndpointError ?? new Error('No compatible attendance endpoint found.'));
}

function extractRows(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object') {
    const typedPayload = payload as Record<string, unknown>;
    if (Array.isArray(typedPayload.records)) return typedPayload.records;
    if (Array.isArray(typedPayload.attendance_records)) return typedPayload.attendance_records;
  }
  return [];
}

function formatHours(checkInTime: string | null, checkOutTime: string | null, fallback: unknown) {
  if (typeof fallback === 'number') return fallback;
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

function mapAttendanceRecord(raw: unknown): HrAttendanceRecord {
  const item = (raw ?? {}) as Record<string, unknown>;
  const checkInTime = item.check_in_time ? String(item.check_in_time) : item.checkInTime ? String(item.checkInTime) : null;
  const checkOutTime = item.check_out_time ? String(item.check_out_time) : item.checkOutTime ? String(item.checkOutTime) : null;
  const derivedDate = item.date ?? (checkInTime ? checkInTime.slice(0, 10) : null);

  return {
    id: String(item.id), // Preserve the original UUID string
    employeeName: String(item.employee_name ?? item.employeeName ?? 'Unknown'),
    employeeCode: String(item.employee_code ?? item.employeeCode ?? 'N/A'),
    department: String(item.department ?? 'Unassigned'),
    date: String(derivedDate ?? ''),
    checkInTime,
    checkOutTime,
    hoursWorked: formatHours(checkInTime, checkOutTime, item.hours_worked ?? item.hoursWorked),
    status: String(item.status ?? 'Present'),
    verificationStatus: String(item.verification_status ?? item.verificationStatus ?? 'verified'),
    method: item.method ? String(item.method) : undefined,
    location: String(item.location ?? 'Main Office'),
    assignment: String(item.assignment ?? 'Standard Shift'),
  };
}

export async function fetchAttendanceRecords() {
  const payload = await requestFirstAvailable<any>(attendanceListPaths);
  return extractRows(payload).map(mapAttendanceRecord).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchAttendanceRecordsForRange(startDate: string, endDate: string) {
  const payload = await apiRequest<unknown>(
    `/api/attendance/hr-records/?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`,
  );
  return extractRows(payload).map(mapAttendanceRecord);
}
