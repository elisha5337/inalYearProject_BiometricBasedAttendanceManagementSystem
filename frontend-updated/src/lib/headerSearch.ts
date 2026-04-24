import type { AppUserRole } from '../types';
import { fetchMyAttendanceHistory } from './attendance';
import { fetchAuditLogs, fetchDevices, fetchNotifications } from './admin';
import { fetchAttendanceRecords } from './hrAttendance';
import { fetchMyLeaveRequests } from './leave';
import { fetchUsers } from './users';

export interface HeaderSearchResult {
  id: string;
  category: 'Page' | 'User' | 'Device' | 'Notification' | 'Audit' | 'Attendance' | 'Leave';
  title: string;
  subtitle: string;
  route: string;
  keywords: string;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function createKeywords(values: Array<string | null | undefined>) {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function buildPageResults(role: AppUserRole): HeaderSearchResult[] {
  const shared = [
    {
      id: `${role}-profile`,
      category: 'Page' as const,
      title: 'My Profile',
      subtitle: 'Open profile and account details',
      route: `/${role}/profile`,
      keywords: createKeywords(['profile account settings personal details']),
    },
    {
      id: `${role}-notifications`,
      category: 'Page' as const,
      title: 'Notifications',
      subtitle: 'View alerts, updates, and messages',
      route: `/${role}/notifications`,
      keywords: createKeywords(['notifications alerts inbox messages']),
    },
  ];

  if (role === 'admin') {
    return [
      {
        id: 'admin-dashboard',
        category: 'Page',
        title: 'System Administration',
        subtitle: 'Global system dashboard and overview',
        route: '/admin/dashboard',
        keywords: createKeywords(['dashboard administration overview health system']),
      },
      {
        id: 'admin-users',
        category: 'Page',
        title: 'Manage Users',
        subtitle: 'Create, edit, activate, and suspend accounts',
        route: '/admin/users',
        keywords: createKeywords(['users accounts employees hr admin suspend activate']),
      },
      {
        id: 'admin-audit',
        category: 'Page',
        title: 'Audit Log',
        subtitle: 'Review system and user activity',
        route: '/admin/audit',
        keywords: createKeywords(['audit logs events history system log']),
      },
      {
        id: 'admin-policies',
        category: 'Page',
        title: 'Policies',
        subtitle: 'Configure attendance and security rules',
        route: '/admin/policies',
        keywords: createKeywords(['policies settings rules security attendance']),
      },
      {
        id: 'admin-enroll',
        category: 'Page',
        title: 'Enroll Biometrics',
        subtitle: 'Register face biometric data for users',
        route: '/admin/enroll',
        keywords: createKeywords(['biometrics enroll face capture verification']),
      },
      {
        id: 'admin-devices',
        category: 'Page',
        title: 'Devices',
        subtitle: 'Manage biometric kiosks and scanners',
        route: '/admin/devices',
        keywords: createKeywords(['devices terminals scanners kiosk biometric']),
      },
      {
        id: 'admin-workflows',
        category: 'Page',
        title: 'Workflows',
        subtitle: 'Manage automation rules and routing',
        route: '/admin/workflows',
        keywords: createKeywords(['workflows automation tasks approval']),
      },
      {
        id: 'admin-integrations',
        category: 'Page',
        title: 'Integrations',
        subtitle: 'Configure connected external systems',
        route: '/admin/integrations',
        keywords: createKeywords(['integrations payroll external api sync']),
      },
      {
        id: 'admin-leave',
        category: 'Page',
        title: 'Leave Oversight',
        subtitle: 'Review organization-wide leave activity',
        route: '/admin/leave',
        keywords: createKeywords(['leave oversight requests approvals time off']),
      },
      {
        id: 'admin-oversight',
        category: 'Page',
        title: 'System Oversight',
        subtitle: 'Monitor infrastructure and health metrics',
        route: '/admin/oversight',
        keywords: createKeywords(['oversight infrastructure performance health metrics']),
      },
      ...shared,
    ];
  }

  if (role === 'hr') {
    return [
      {
        id: 'hr-dashboard',
        category: 'Page',
        title: 'HR Dashboard',
        subtitle: 'Attendance, staffing, and operational overview',
        route: '/hr/dashboard',
        keywords: createKeywords(['dashboard hr overview operations']),
      },
      {
        id: 'hr-employees',
        category: 'Page',
        title: 'Manage Employees',
        subtitle: 'View and manage employee records',
        route: '/hr/employees',
        keywords: createKeywords(['employees staff users people']),
      },
      {
        id: 'hr-attendance',
        category: 'Page',
        title: 'Manage Attendance',
        subtitle: 'Review attendance records and verification',
        route: '/hr/attendance',
        keywords: createKeywords(['attendance records check in check out verification']),
      },
      {
        id: 'hr-leave',
        category: 'Page',
        title: 'Manage Leave',
        subtitle: 'Approve or reject leave requests',
        route: '/hr/leave',
        keywords: createKeywords(['leave requests approval rejection']),
      },
      {
        id: 'hr-shifts',
        category: 'Page',
        title: 'Manage Shifts',
        subtitle: 'Configure shifts and assignments',
        route: '/hr/shifts',
        keywords: createKeywords(['shifts schedules assignments']),
      },
      {
        id: 'hr-reports',
        category: 'Page',
        title: 'Reports',
        subtitle: 'Generate attendance and staffing reports',
        route: '/hr/reports',
        keywords: createKeywords(['reports analytics exports']),
      },
      ...shared,
    ];
  }

  return [
    {
      id: 'employee-dashboard',
      category: 'Page',
      title: 'Employee Dashboard',
      subtitle: 'My attendance summary and activity',
      route: '/employee/dashboard',
      keywords: createKeywords(['dashboard attendance summary activity']),
    },
    {
      id: 'employee-attendance',
      category: 'Page',
      title: 'My Attendance',
      subtitle: 'Review check-ins and work hours',
      route: '/employee/attendance',
      keywords: createKeywords(['attendance check in check out hours']),
    },
    {
      id: 'employee-leave-submit',
      category: 'Page',
      title: 'Submit Leave',
      subtitle: 'Create a new leave request',
      route: '/employee/leave/submit',
      keywords: createKeywords(['submit leave request time off']),
    },
    {
      id: 'employee-leave-history',
      category: 'Page',
      title: 'Leave History',
      subtitle: 'View current and past leave requests',
      route: '/employee/leave/history',
      keywords: createKeywords(['leave history requests approved pending rejected']),
    },
    ...shared,
  ];
}

function buildAdminResults() {
  return Promise.allSettled([
    fetchUsers(),
    fetchDevices(),
    fetchNotifications(),
    fetchAuditLogs(),
  ]).then(([usersResult, devicesResult, notificationsResult, auditResult]) => {
    const results: HeaderSearchResult[] = [];

    if (usersResult.status === 'fulfilled') {
      results.push(
        ...usersResult.value.map((user) => ({
          id: `user-${user.id}`,
          category: 'User' as const,
          title: user.fullName,
          subtitle: `@${user.username} | ${user.role.toUpperCase()} | ${user.isActive ? 'Active' : 'Suspended'}`,
          route: '/admin/users',
          keywords: createKeywords([
            user.fullName,
            user.username,
            user.email,
            user.department,
            user.role,
            user.status,
          ]),
        })),
      );
    }

    if (devicesResult.status === 'fulfilled') {
      results.push(
        ...devicesResult.value.map((device) => ({
          id: `device-${device.id}`,
          category: 'Device' as const,
          title: device.name,
          subtitle: `${device.type} | ${device.location} | ${device.status}`,
          route: '/admin/devices',
          keywords: createKeywords([
            device.name,
            device.serial,
            device.ip,
            device.location,
            device.type,
            device.status,
          ]),
        })),
      );
    }

    if (notificationsResult.status === 'fulfilled') {
      results.push(
        ...notificationsResult.value.map((notification) => ({
          id: `notification-${notification.id}`,
          category: 'Notification' as const,
          title: notification.title,
          subtitle: notification.message,
          route: '/admin/notifications',
          keywords: createKeywords([
            notification.title,
            notification.message,
            notification.type,
            notification.time,
          ]),
        })),
      );
    }

    if (auditResult.status === 'fulfilled') {
      results.push(
        ...auditResult.value.map((log) => ({
          id: `audit-${log.id}`,
          category: 'Audit' as const,
          title: log.action,
          subtitle: `${log.user} | ${log.details}`,
          route: '/admin/audit',
          keywords: createKeywords([log.action, log.details, log.user, log.ip]),
        })),
      );
    }

    return results;
  });
}

function buildHrResults() {
  return Promise.allSettled([fetchUsers(), fetchAttendanceRecords(), fetchNotifications()]).then(
    ([usersResult, attendanceResult, notificationsResult]) => {
      const results: HeaderSearchResult[] = [];

      if (usersResult.status === 'fulfilled') {
        results.push(
          ...usersResult.value.map((user) => ({
            id: `user-${user.id}`,
            category: 'User' as const,
            title: user.fullName,
            subtitle: `@${user.username} | ${user.department} | ${user.isActive ? 'Active' : 'Suspended'}`,
            route: '/hr/employees',
            keywords: createKeywords([
              user.fullName,
              user.username,
              user.email,
              user.department,
              user.role,
              user.status,
            ]),
          })),
        );
      }

      if (attendanceResult.status === 'fulfilled') {
        results.push(
          ...attendanceResult.value.map((record) => ({
            id: `attendance-${record.id}`,
            category: 'Attendance' as const,
            title: record.employeeName,
            subtitle: `${record.date} | ${record.status} | ${record.assignment}`,
            route: '/hr/attendance',
            keywords: createKeywords([
              record.employeeName,
              record.employeeCode,
              record.department,
              record.date,
              record.status,
              record.assignment,
              record.location,
            ]),
          })),
        );
      }

      if (notificationsResult.status === 'fulfilled') {
        results.push(
          ...notificationsResult.value.map((notification) => ({
            id: `notification-${notification.id}`,
            category: 'Notification' as const,
            title: notification.title,
            subtitle: notification.message,
            route: '/hr/notifications',
            keywords: createKeywords([
              notification.title,
              notification.message,
              notification.type,
              notification.time,
            ]),
          })),
        );
      }

      return results;
    },
  );
}

function buildEmployeeResults() {
  return Promise.allSettled([
    fetchMyAttendanceHistory(),
    fetchMyLeaveRequests(),
    fetchNotifications(),
  ]).then(([attendanceResult, leaveResult, notificationsResult]) => {
    const results: HeaderSearchResult[] = [];

    if (attendanceResult.status === 'fulfilled') {
      results.push(
        ...attendanceResult.value.records.map((record) => ({
          id: `attendance-${record.id}`,
          category: 'Attendance' as const,
          title: `${record.type} on ${record.date}`,
          subtitle: `${record.status} | ${record.time}`,
          route: '/employee/attendance',
          keywords: createKeywords([
            record.type,
            record.date,
            record.time,
            record.status,
            record.status_code,
          ]),
        })),
      );
    }

    if (leaveResult.status === 'fulfilled') {
      results.push(
        ...leaveResult.value.requests.map((request) => ({
          id: `leave-${request.id}`,
          category: 'Leave' as const,
          title: request.leaveTypeLabel,
          subtitle: `${request.startDate} to ${request.endDate} | ${request.status}`,
          route: '/employee/leave/history',
          keywords: createKeywords([
            request.leaveTypeLabel,
            request.startDate,
            request.endDate,
            request.reason,
            request.status,
          ]),
        })),
      );
    }

    if (notificationsResult.status === 'fulfilled') {
      results.push(
        ...notificationsResult.value.map((notification) => ({
          id: `notification-${notification.id}`,
          category: 'Notification' as const,
          title: notification.title,
          subtitle: notification.message,
          route: '/employee/notifications',
          keywords: createKeywords([
            notification.title,
            notification.message,
            notification.type,
            notification.time,
          ]),
        })),
      );
    }

    return results;
  });
}

export function buildStaticHeaderSearchResults(role: AppUserRole) {
  return buildPageResults(role);
}

export async function loadDynamicHeaderSearchResults(role: AppUserRole) {
  if (role === 'admin') {
    return buildAdminResults();
  }

  if (role === 'hr') {
    return buildHrResults();
  }

  return buildEmployeeResults();
}

function scoreResult(result: HeaderSearchResult, query: string) {
  const normalizedQuery = normalize(query);
  const title = normalize(result.title);
  const subtitle = normalize(result.subtitle);
  const keywords = normalize(result.keywords);
  let score = 0;

  if (title === normalizedQuery) {
    score += 120;
  }
  if (title.startsWith(normalizedQuery)) {
    score += 80;
  }
  if (title.includes(normalizedQuery)) {
    score += 40;
  }
  if (subtitle.includes(normalizedQuery)) {
    score += 20;
  }
  if (keywords.includes(normalizedQuery)) {
    score += 10;
  }

  for (const token of normalizedQuery.split(/\s+/).filter(Boolean)) {
    if (title.includes(token)) {
      score += 8;
    } else if (keywords.includes(token)) {
      score += 3;
    }
  }

  return score;
}

export function searchHeaderResults(results: HeaderSearchResult[], query: string, limit = 8) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return [];
  }

  return results
    .map((result) => ({
      result,
      score: scoreResult(result, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.result.title.localeCompare(right.result.title);
    })
    .slice(0, limit)
    .map((entry) => entry.result);
}
