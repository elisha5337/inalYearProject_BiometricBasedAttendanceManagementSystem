import { apiRequest } from './api';

export interface AttendanceMarkResponse {
  success: boolean;
  type: string;
  username: string;
  status: string;
  verification_status: string;
  message: string;
  timestamp: string;
  profile?: {
    full_name: string;
    department: string;
    position: string;
    profile_photo: string | null;
  };
  method?: string;
}

export interface MarkAttendancePayload {
  image: string;
  username?: string;
  password?: string;
  is_manual?: boolean;
}

export function markAttendance(payload: MarkAttendancePayload) {
  return apiRequest<AttendanceMarkResponse>('/api/attendance/mark/', {
    method: 'POST',
    body: payload,
  });
}

export interface AttendanceHistoryRecord {
  id: string;
  timestamp: string;
  type: string;
  type_code: string;
  status: string;
  status_code: string;
  date: string;
  time: string;
}

export interface EmployeeDashboardStats {
  present_days: number;
  late_count: number;
  early_exit_count: number;
  total_hours: number;
  month_name: string;
}

type AttendanceHistoryEnvelope = {
  success: boolean;
  records: AttendanceHistoryRecord[];
};

type DashboardStatsEnvelope = {
  success: boolean;
  stats: EmployeeDashboardStats;
};

type DailyAttendanceRow = {
  date: string;
  rawDate: string;
  checkIn: string;
  checkOut: string;
  total: string;
  totalHours: number;
  status: 'on-time' | 'late' | 'early-leave';
};

function formatDuration(totalSeconds: number) {
  const positiveSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(positiveSeconds / 3600);
  const minutes = Math.floor((positiveSeconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

function formatClock(value?: string) {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fetchMyAttendanceHistory() {
  return apiRequest<AttendanceHistoryEnvelope>('/api/attendance/my-history/');
}

export function fetchDashboardStats() {
  return apiRequest<DashboardStatsEnvelope>('/api/attendance/dashboard-stats/');
}

export function buildDailyAttendanceRows(records: AttendanceHistoryRecord[]): DailyAttendanceRow[] {
  const grouped = new Map<string, AttendanceHistoryRecord[]>();

  records.forEach((record) => {
    const key = record.timestamp.slice(0, 10);
    const bucket = grouped.get(key) || [];
    bucket.push(record);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .map(([rawDate, dayRecords]) => {
      const sorted = [...dayRecords].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      let firstCheckIn: string | undefined;
      let lastCheckOut: string | undefined;
      let totalSeconds = 0;
      let derivedStatus: DailyAttendanceRow['status'] = 'on-time';

      sorted.forEach((record) => {
        if (record.type_code === 'CHECK_IN') {
          if (!firstCheckIn) firstCheckIn = record.timestamp;
        }
        if (record.type_code === 'CHECK_OUT') {
          lastCheckOut = record.timestamp;
        }
        if (record.status_code === 'LATE') derivedStatus = 'late';
      });

      if (firstCheckIn && lastCheckOut) {
        totalSeconds = (new Date(lastCheckOut).getTime() - new Date(firstCheckIn).getTime()) / 1000;
      }

      return {
        rawDate,
        date: new Date(rawDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
        checkIn: formatClock(firstCheckIn),
        checkOut: formatClock(lastCheckOut),
        total: formatDuration(totalSeconds),
        totalHours: Math.max(0, totalSeconds / 3600),
        status: derivedStatus,
      };
    })
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
}

export function buildWeeklyActivity(records: AttendanceHistoryRecord[]) {
  // 1. Get the last 7 days of dates
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  // 2. Map existing records to these dates
  const dailyRows = buildDailyAttendanceRows(records);
  
  return days.map(dateStr => {
    const row = dailyRows.find(r => r.rawDate === dateStr);
    return {
      name: new Date(dateStr).toLocaleDateString([], { weekday: 'short' }),
      hours: row ? Number(row.totalHours.toFixed(1)) : 0
    };
  });
}

export function buildRecentAttendanceActivity(records: AttendanceHistoryRecord[]) {
  const sorted = [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return sorted.slice(0, 5).map((record) => ({
    id: record.id,
    date: new Date(record.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    time: new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    type: record.type,
    status: record.status_code === 'LATE' ? 'late' : record.status_code === 'EARLY_EXIT' ? 'early-leave' : 'on-time',
  }));
}
