import { apiRequest } from './api';

export interface AttendanceMarkResponse {
  success: boolean;
  type: string;
  username: string;
  status: string;
  verification_status: string;
  message: string;
  timestamp: string;
}

export function markAttendance(payload: { image: string; userId?: string }) {
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
  if (!value) {
    return '--:--';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
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
      let activeCheckIn: string | undefined;
      let totalSeconds = 0;
      let derivedStatus: DailyAttendanceRow['status'] = 'on-time';

      sorted.forEach((record) => {
        if (record.status_code === 'LATE') {
          derivedStatus = 'late';
        } else if (record.status_code === 'EARLY_EXIT' && derivedStatus !== 'late') {
          derivedStatus = 'early-leave';
        }

        if (record.type_code === 'CHECK_IN') {
          activeCheckIn = record.timestamp;
          firstCheckIn = firstCheckIn || record.timestamp;
        }

        if (record.type_code === 'CHECK_OUT') {
          lastCheckOut = record.timestamp;
          if (activeCheckIn) {
            totalSeconds +=
              (new Date(record.timestamp).getTime() - new Date(activeCheckIn).getTime()) / 1000;
            activeCheckIn = undefined;
          }
        }
      });

      if (activeCheckIn) {
        totalSeconds += (Date.now() - new Date(activeCheckIn).getTime()) / 1000;
      }

      return {
        rawDate,
        date: new Date(rawDate).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        checkIn: formatClock(firstCheckIn),
        checkOut: formatClock(lastCheckOut),
        total: formatDuration(totalSeconds),
        totalHours: totalSeconds / 3600,
        status: derivedStatus,
      };
    })
    .sort((a, b) => b.rawDate.localeCompare(a.rawDate));
}

export function buildWeeklyActivity(records: AttendanceHistoryRecord[]) {
  const rows = buildDailyAttendanceRows(records).slice(0, 7).reverse();

  return rows.map((row) => ({
    name: new Date(row.rawDate).toLocaleDateString([], { weekday: 'short' }),
    hours: Number(row.totalHours.toFixed(1)),
  }));
}

export function buildRecentAttendanceActivity(records: AttendanceHistoryRecord[]) {
  const sorted = [...records].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return sorted.slice(0, 5).map((record) => ({
    id: record.id,
    date: new Date(record.timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
    }),
    time: new Date(record.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    type: record.type,
    status:
      record.status_code === 'LATE'
        ? 'late'
        : record.status_code === 'EARLY_EXIT'
          ? 'early-leave'
          : 'on-time',
  }));
}
