import { apiRequest } from './api';

export interface AuditLogEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  details: string;
  time: string;
  ip: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SystemHealthMetrics {
  dbStatus: string;
  apiLatency: string;
  activeTerminals: string;
  uptime: string;
  lastSync: string | null;
}

export interface SecurityAuditItem {
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  issue: string;
  action: string;
}

export interface GlobalConfigRecord {
  sessionTimeoutMinutes: number;
  strictMode: boolean;
  maxLoginAttempts: number;
  biometricLockActive: boolean;
  realTimeValidation: boolean;
  manualEntryEnabled: boolean; // Added
}

export interface LeavePolicyRecord {
  id: string;
  name: string;
  category: string;
  urgency: string;
  description: string;
  value: string;
  isActive: boolean;
  rules: Record<string, unknown>;
  departmentId: string | null;
}

export interface EnrollmentUserRecord {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  department: string;
  enrolled: boolean;
  status: string;
}

export interface DeviceRecord {
  id: string;
  name: string;
  type: 'Kiosk' | 'Handheld' | 'Desktop';
  location: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSync: string | null;
  ip: string;
  port: number;
  serial: string;
  battery: string | null;
}

export interface DeviceFormPayload {
  name: string;
  type: 'Kiosk' | 'Handheld' | 'Desktop';
  location: string;
  ip: string;
}

export interface WorkflowRecord {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  lastRun: string;
  successRate: number;
  avgTime: string;
  trigger: string;
  action: string;
  retryPolicy: string;
  timeoutSeconds: number;
}

export interface WorkflowFormPayload {
  name: string;
  description: string;
  status: 'active' | 'paused' | 'error';
  trigger: string;
  action: string;
  retryPolicy: string;
  timeoutSeconds: number;
}

export interface IntegrationRecord {
  id: string;
  name: string;
  type: string;
  status: 'connected' | 'error' | 'disconnected' | 'pending';
  lastSync: string;
  description: string;
  endpointUrl: string;
}

export interface IntegrationFormPayload {
  name: string;
  type: string;
  description: string;
}

export interface IntegrationConfigPayload {
  endpointUrl: string;
  apiKey: string;
}

export interface AdminLeaveRequestRecord {
  id: string;
  employeeName: string;
  username: string;
  email: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'Approved' | 'Rejected' | 'Pending' | 'Cancelled';
  reason: string;
  appliedOn: string;
  attachment: string | null;
}

export interface AppNotificationRecord {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  time: string;
  unread: boolean;
  timestamp: string | null;
}

export interface ProfileRecord {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  department: string;
  position: string;
  employmentType: string;
  hireDate: string | null;
  biometricEnrolled: boolean;
  phone: string;
  bio: string;
  profilePhoto: string | null;
  notificationSettings: Record<string, boolean>;
  regionalSettings: Record<string, string>;
  lastLogin: string | null;
  dateJoined: string;
}

export interface ProfileUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  phone?: string;
  bio?: string;
  profilePhoto?: string | null;
  notificationSettings?: Record<string, boolean>;
  regionalSettings?: Record<string, string>;
}

export interface DashboardOverview {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    suspendedEmployees: number;
    faceEnrolled: number;
  };
  health: SystemHealthMetrics;
  recentAuditLogs: AuditLogEntry[];
  authLoad: Array<{ time: string; load: number }>;
  devicesOnlineText: string;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatRelativeTime(value: string | null) {
  if (!value) {
    return 'Never';
  }

  const target = new Date(value);

  if (Number.isNaN(target.getTime())) {
    return value;
  }

  const diffMs = target.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return 'Just now';
  }

  if (absMinutes < 60) {
    return `${absMinutes} min${absMinutes === 1 ? '' : 's'} ago`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return `${absHours} hour${absHours === 1 ? '' : 's'} ago`;
  }

  const absDays = Math.round(absHours / 24);
  return `${absDays} day${absDays === 1 ? '' : 's'} ago`;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function deriveAuditSeverity(action: string, details: string): AuditLogEntry['severity'] {
  const content = `${action} ${details}`.toLowerCase();

  if (
    content.includes('failed') ||
    content.includes('error') ||
    content.includes('unauthorized') ||
    content.includes('suspend') ||
    content.includes('delete')
  ) {
    return 'high';
  }

  if (
    content.includes('update') ||
    content.includes('change') ||
    content.includes('sync') ||
    content.includes('warning')
  ) {
    return 'medium';
  }

  return 'low';
}

function normalizeNotificationType(type: string): AppNotificationRecord['type'] {
  const normalized = type.toLowerCase();
  if (normalized === 'warning') {
    return 'warning';
  }
  if (normalized === 'success') {
    return 'success';
  }
  if (normalized === 'error') {
    return 'error';
  }
  return 'info';
}

function normalizeIntegrationStatus(value: string): IntegrationRecord['status'] {
  const normalized = value.toLowerCase();
  if (normalized === 'connected') {
    return 'connected';
  }
  if (normalized === 'error') {
    return 'error';
  }
  if (normalized === 'pending') {
    return 'pending';
  }
  return 'disconnected';
}

function toWorkflowSteps(payload: WorkflowFormPayload) {
  return {
    description: payload.description,
    trigger: payload.trigger,
    action: payload.action,
    status: payload.status,
    retryPolicy: payload.retryPolicy,
    timeoutSeconds: payload.timeoutSeconds,
    metrics: {
      successRate: payload.status === 'error' ? 82.5 : 100,
      avgTime: payload.status === 'error' ? '45s' : '2.5s',
      lastRun: 'Never',
    },
  };
}

function fromWorkflowSteps(name: string, raw: unknown): WorkflowRecord {
  const steps =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : { items: Array.isArray(raw) ? raw : [] };

  const metrics =
    steps.metrics && typeof steps.metrics === 'object'
      ? (steps.metrics as Record<string, unknown>)
      : {};

  const statusValue = String(steps.status ?? 'active').toLowerCase();
  const status: WorkflowRecord['status'] =
    statusValue === 'paused' ? 'paused' : statusValue === 'error' ? 'error' : 'active';

  return {
    id: '',
    name,
    description: String(steps.description ?? 'No description provided.'),
    status,
    lastRun: String(metrics.lastRun ?? 'Never'),
    successRate: Number(metrics.successRate ?? (status === 'error' ? 82.5 : 100)),
    avgTime: String(metrics.avgTime ?? (status === 'error' ? '45s' : '2.5s')),
    trigger: String(steps.trigger ?? 'On Attendance Check-in'),
    action: String(steps.action ?? 'Send Notification'),
    retryPolicy: String(steps.retryPolicy ?? 'Exponential Backoff (3 retries)'),
    timeoutSeconds: Number(steps.timeoutSeconds ?? 30),
  };
}

export async function fetchAuditLogs() {
  const response = await apiRequest<{
    success: boolean;
    logs: Array<{
      id: string;
      user: string;
      action: string;
      description?: string;
      timestamp: string;
      ip_address?: string;
    }>;
  }>('/api/reporting/audit-logs/');

  return (response.logs ?? []).map((log) => ({
    id: log.id,
    user: log.user || 'System',
    role: log.user === 'System' ? 'system' : 'admin',
    action: log.action,
    details: log.description || 'No additional details available.',
    time: log.timestamp,
    ip: log.ip_address || 'N/A',
    severity: deriveAuditSeverity(log.action, log.description || ''),
  }));
}

export async function fetchSystemHealth() {
  const response = await apiRequest<{
    success: boolean;
    health: {
      db_status: string;
      api_latency: string;
      active_terminals: string;
      uptime: string;
      last_sync: string;
    };
  }>('/api/reporting/system-health/');

  return {
    dbStatus: response.health?.db_status || 'UNKNOWN',
    apiLatency: response.health?.api_latency || 'N/A',
    activeTerminals: response.health?.active_terminals || '00 ACTIVE',
    uptime: response.health?.uptime || '0m 0s',
    lastSync: response.health?.last_sync || null,
  } satisfies SystemHealthMetrics;
}

export async function runSecurityAudit() {
  return apiRequest<{
    success: boolean;
    timestamp: string;
    score: number;
    audit_results: SecurityAuditItem[];
  }>('/api/reporting/security-audit/', {
    method: 'POST',
  });
}

export function sanitizeLogs() {
  return apiRequest<{ success: boolean; message: string }>('/api/reporting/sanitize-logs/', {
    method: 'POST',
  });
}

export function runSystemOperation(operation: 'db_maintenance' | 'system_backup') {
  return apiRequest<{ success: boolean; message?: string; error?: string }>(
    `/api/reporting/system-operation/${operation}/`,
    { method: 'POST' },
  );
}

export async function fetchDashboardOverview() {
  const [statsResponse, health, auditLogs, devices] = await Promise.all([
    apiRequest<{ success: boolean; stats: Record<string, number> }>('/api/attendance/dashboard-stats/'),
    fetchSystemHealth(),
    fetchAuditLogs(),
    fetchDevices().catch(() => [] as DeviceRecord[]),
  ]);

  const authLoadMap = new Map<string, number>();
  const recentLogs = auditLogs.slice(0, 7);

  recentLogs
    .slice()
    .reverse()
    .forEach((log) => {
      const parsed = new Date(log.time);
      const label = Number.isNaN(parsed.getTime())
        ? log.time.slice(11, 16) || log.time
        : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      authLoadMap.set(label, (authLoadMap.get(label) ?? 0) + 1);
    });

  const authLoad = Array.from(authLoadMap.entries()).map(([time, load]) => ({ time, load }));

  return {
    stats: {
      totalEmployees: Number(statsResponse.stats?.totalEmployees ?? 0),
      activeEmployees: Number(statsResponse.stats?.activeEmployees ?? 0),
      suspendedEmployees: Number(statsResponse.stats?.suspendedEmployees ?? 0),
      faceEnrolled: Number(statsResponse.stats?.faceEnrolled ?? 0),
    },
    health,
    recentAuditLogs: recentLogs,
    authLoad: authLoad.length ? authLoad : [{ time: 'Now', load: 0 }],
    devicesOnlineText: `${devices.filter((device) => device.status === 'online').length} / ${devices.length} Online`,
  } satisfies DashboardOverview;
}

export async function fetchPolicies() {
  const response = await apiRequest<{
    success: boolean;
    policies: Array<{
      id: string;
      name: string;
      category: string;
      urgency: string;
      description?: string;
      value?: string;
      is_active?: boolean;
      rules?: Record<string, unknown>;
      departmentId?: string | null;
    }>;
  }>('/api/leave/api/policies/');

  return (response.policies ?? []).map((policy) => ({
    id: String(policy.id),
    name: policy.name,
    category: policy.category,
    urgency: policy.urgency,
    description: policy.description || '',
    value: policy.value || '',
    isActive: Boolean(policy.is_active ?? true),
    rules: policy.rules || {},
    departmentId: policy.departmentId ?? null,
  }));
}

export async function createPolicy(payload: Partial<LeavePolicyRecord> & { name: string; category: string }) {
  const response = await apiRequest<{ success: boolean; id: string }>('/api/leave/api/policies/', {
    method: 'POST',
    body: {
      name: payload.name,
      category: payload.category,
      urgency: payload.urgency ?? 'MEDIUM',
      description: payload.description ?? '',
      value: payload.value ?? '',
      is_active: payload.isActive ?? true,
      rules: payload.rules ?? {},
      departmentId: payload.departmentId ?? null,
    },
  });

  return response.id;
}

export function updatePolicy(policyId: string, payload: Partial<LeavePolicyRecord>) {
  return apiRequest<{ success: boolean; message: string }>(`/api/leave/api/policies/${policyId}/`, {
    method: 'PUT',
    body: {
      name: payload.name,
      category: payload.category,
      urgency: payload.urgency,
      description: payload.description,
      value: payload.value,
      is_active: payload.isActive,
      rules: payload.rules,
      departmentId: payload.departmentId,
    },
  });
}

export function deletePolicy(policyId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/leave/api/policies/${policyId}/`, {
    method: 'DELETE',
  });
}

export async function fetchGlobalConfig() {
  const response = await apiRequest<{
    success: boolean;
    config: {
      session_timeout_minutes?: number;
      strict_mode?: boolean;
      max_login_attempts?: number;
      biometric_lock_active?: boolean;
      real_time_validation?: boolean;
      manual_entry_enabled?: boolean; // Added
    };
  }>('/api/reporting/global-config/');

  return {
    sessionTimeoutMinutes: Number(response.config?.session_timeout_minutes ?? 60),
    strictMode: Boolean(response.config?.strict_mode ?? false),
    maxLoginAttempts: Number(response.config?.max_login_attempts ?? 3),
    biometricLockActive: Boolean(response.config?.biometric_lock_active ?? true),
    realTimeValidation: Boolean(response.config?.real_time_validation ?? true),
    manualEntryEnabled: Boolean(response.config?.manual_entry_enabled ?? false), // Added
  } satisfies GlobalConfigRecord;
}

export function updateGlobalConfig(payload: GlobalConfigRecord) {
  return apiRequest<{ success: boolean; message: string }>('/api/reporting/global-config/update/', {
    method: 'POST',
    body: {
      session_timeout_minutes: payload.sessionTimeoutMinutes,
      strict_mode: payload.strictMode,
      max_login_attempts: payload.maxLoginAttempts,
      biometric_lock_active: payload.biometricLockActive,
      real_time_validation: payload.realTimeValidation,
      manual_entry_enabled: payload.manualEntryEnabled, // Added
    },
  });
}

export async function fetchEnrollmentUsers() {
  const response = await apiRequest<{
    success: boolean;
    users: Array<{
      id: string;
      name: string;
      username?: string;
      email: string;
      role: string;
      department: string;
      enrolled: boolean;
      status: string;
    }>;
  }>('/accounts/api/users/');

  return (response.users ?? []).map((user) => ({
    id: user.id,
    name: user.name,
    username: user.username || user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    enrolled: Boolean(user.enrolled),
    status: user.status,
  }));
}

export function syncBiometrics() {
  return apiRequest<{ success: boolean; message: string }>('/api/reporting/sync-biometrics/', {
    method: 'POST',
  });
}

export async function fetchDevices(): Promise<DeviceRecord[]> {
  const response = await apiRequest<{
    success: boolean;
    devices: Array<{
      id: string;
      name: string;
      type: string;
      location?: string;
      status: string;
      last_sync?: string | null;
      ip_address: string;
      port: number;
      device_serial: string;
      battery?: string | null;
    }>;
  }>('/api/attendance/devices/');

  return (response.devices ?? []).map((device) => ({
    id: device.id,
    name: device.name,
    type: (device.type === 'Handheld' || device.type === 'Desktop' ? device.type : 'Kiosk') as DeviceRecord['type'],
    location: device.location || 'Unassigned',
    status: (device.status === 'maintenance'
      ? 'maintenance'
      : device.status === 'online'
        ? 'online'
        : 'offline') as DeviceRecord['status'],
    lastSync: device.last_sync || null,
    ip: device.ip_address,
    port: Number(device.port ?? 8000),
    serial: device.device_serial,
    battery: device.battery ?? null,
  }));
}

export async function createDevice(payload: DeviceFormPayload) {
  const response = await apiRequest<{ success: boolean; device: Record<string, unknown> }>('/api/attendance/devices/', {
    method: 'POST',
    body: {
      name: payload.name,
      type: payload.type,
      location: payload.location,
      ip_address: payload.ip,
      port: 8000,
      status: 'active',
    },
  });

  return response.device;
}

export async function updateDevice(deviceId: string, payload: DeviceFormPayload) {
  const response = await apiRequest<{ success: boolean; device: Record<string, unknown> }>(
    `/api/attendance/devices/${deviceId}/`,
    {
      method: 'PATCH',
      body: {
        name: payload.name,
        type: payload.type,
        location: payload.location,
        ip_address: payload.ip,
      },
    },
  );

  return response.device;
}

export function deleteDevice(deviceId: string) {
  return apiRequest<{ success: boolean; message: string }>(`/api/attendance/devices/${deviceId}/`, {
    method: 'DELETE',
  });
}

export async function fetchWorkflows() {
  const response = await apiRequest<{
    success: boolean;
    workflows: Array<{ id: string; name: string; steps?: unknown }>;
  }>('/accounts/api/workflows/');

  return (response.workflows ?? []).map((workflow) => {
    const mapped = fromWorkflowSteps(workflow.name, workflow.steps);
    return {
      ...mapped,
      id: workflow.id,
    };
  });
}

export function createWorkflow(payload: WorkflowFormPayload) {
  return apiRequest<{ success: boolean; id: string }>('/accounts/api/workflows/create/', {
    method: 'POST',
    body: {
      name: payload.name,
      steps: toWorkflowSteps(payload),
    },
  });
}

export function updateWorkflow(workflowId: string, payload: WorkflowFormPayload) {
  return apiRequest<{ success: boolean; message: string }>(
    `/accounts/api/workflows/${workflowId}/update/`,
    {
      method: 'PATCH',
      body: {
        name: payload.name,
        steps: toWorkflowSteps(payload),
      },
    },
  );
}

export function deleteWorkflow(workflowId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/accounts/api/workflows/${workflowId}/delete/`,
    {
      method: 'DELETE',
    },
  );
}

export async function fetchIntegrations() {
  const response = await apiRequest<{
    success: boolean;
    integrations: Array<{
      id: string;
      name: string;
      description?: string;
      type: string;
      status: string;
      endpoint_url?: string | null;
      last_sync?: string;
    }>;
  }>('/accounts/api/integrations/');

  return (response.integrations ?? []).map((integration) => ({
    id: integration.id,
    name: integration.name,
    type: integration.type,
    status: normalizeIntegrationStatus(integration.status),
    lastSync: integration.last_sync || 'Never',
    description: integration.description || '',
    endpointUrl: integration.endpoint_url || '',
  }));
}

export function createIntegration(payload: IntegrationFormPayload) {
  return apiRequest<{ success: boolean; integration: Record<string, unknown> }>(
    '/accounts/api/integrations/hub-register/',
    {
      method: 'POST',
      body: {
        name: payload.name,
        type: payload.type,
        description: payload.description,
      },
    },
  );
}

export function toggleIntegration(integrationId: string) {
  return apiRequest<{ success: boolean; status: string; last_sync: string }>(
    `/accounts/api/integrations/${integrationId}/toggle/`,
    {
      method: 'POST',
    },
  );
}

export function syncIntegration(integrationId: string) {
  return apiRequest<{ success: boolean; message: string; last_sync?: string }>(
    `/accounts/api/integrations/${integrationId}/sync/`,
    {
      method: 'POST',
    },
  );
}

export function updateIntegrationConfig(integrationId: string, payload: IntegrationConfigPayload) {
  return apiRequest<{ success: boolean; message: string }>(
    `/accounts/api/integrations/${integrationId}/update-config/`,
    {
      method: 'POST',
      body: {
        endpoint_url: payload.endpointUrl,
        api_key: payload.apiKey,
      },
    },
  );
}

export function deleteIntegration(integrationId: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/accounts/api/integrations/${integrationId}/delete/`,
    {
      method: 'DELETE',
    },
  );
}

export function buildIntegrationActivity(integrations: IntegrationRecord[]) {
  return integrations
    .slice()
    .sort((left, right) => String(right.lastSync).localeCompare(String(left.lastSync)))
    .map((integration) => ({
      service: integration.name,
      event:
        integration.status === 'connected'
          ? 'Synchronization Available'
          : integration.status === 'error'
            ? 'Connection Error'
            : 'Connector Registered',
      status: capitalize(integration.status),
      time: integration.lastSync,
    }));
}

export async function fetchAdminLeaveRequests() {
  const [listResponse, detailCandidates] = await Promise.all([
    apiRequest<{
      success: boolean;
      leave_requests: Array<{
        id: string;
        employee_name: string;
        username: string;
        email: string;
        leave_type: string;
        start_date: string;
        end_date: string;
        status: string;
        reason: string;
        attachment: string | null;
        requested_at: string;
      }>;
    }>('/api/leave/api/all/'),
    apiRequest<{
      success: boolean;
      records?: unknown[];
    }>('/api/attendance/all/').catch(() => ({ success: false })),
  ]);

  return (listResponse.leave_requests ?? []).map((request) => ({
    id: request.id,
    employeeName: request.employee_name,
    username: request.username,
    email: request.email,
    type: titleCase(request.leave_type),
    startDate: request.start_date,
    endDate: request.end_date,
    status: titleCase(request.status) as AdminLeaveRequestRecord['status'],
    reason: request.reason || 'No reason provided.',
    appliedOn: request.requested_at || request.start_date,
    attachment: request.attachment,
  }));
}

export function processLeaveRequest(id: string, status: 'APPROVED' | 'REJECTED') {
  return apiRequest<{ success: boolean; message: string }>(`/api/leave/api/manage/${id}/`, {
    method: 'PUT',
    body: { status },
  });
}

export async function fetchNotifications() {
  const response = await apiRequest<{
    success: boolean;
    notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      status: string;
      timestamp: string;
    }>;
    unread_count: number;
  }>('/api/reporting/my-notifications/');

  return (response.notifications ?? []).map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: normalizeNotificationType(notification.type),
    time: notification.timestamp,
    unread: notification.status === 'UNREAD',
    timestamp: notification.timestamp || null,
  }));
}

export function markNotificationRead(notificationId: string) {
  return apiRequest<{ success: boolean }>(`/api/reporting/notifications/${notificationId}/read/`, {
    method: 'POST',
  });
}

export function markAllNotificationsRead() {
  return apiRequest<{ success: boolean; message: string }>('/api/reporting/notifications/mark-all-read/', {
    method: 'POST',
  });
}

export function removeNotification(notificationId: string) {
  return apiRequest<{ success: boolean }>(`/api/reporting/notifications/${notificationId}/delete/`, {
    method: 'DELETE',
  });
}

export async function fetchProfile() {
  const response = await apiRequest<{
    success: boolean;
    profile: {
      id: string;
      username: string;
      email: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      role?: string;
      department?: string;
      position?: string;
      employment_type?: string;
      hire_date?: string | null;
      biometric_enrolled?: boolean;
      phone?: string;
      bio?: string;
      profile_photo?: string | null;
      notification_settings?: Record<string, boolean>;
      regional_settings?: Record<string, string>;
      last_login?: string | null;
      date_joined?: string;
    };
  }>('/accounts/api/profile/');

  const profile = response.profile;
  const firstName = profile.first_name || profile.name?.split(' ')[0] || profile.username;
  const lastName =
    profile.last_name ||
    (profile.name?.includes(' ') ? profile.name.split(' ').slice(1).join(' ') : '');

  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    firstName,
    lastName,
    fullName: profile.name || `${firstName}${lastName ? ` ${lastName}` : ''}`.trim(),
    role: profile.role || 'employee',
    department: profile.department || '',
    position: profile.position || '',
    employmentType: profile.employment_type || '',
    hireDate: profile.hire_date || null,
    biometricEnrolled: Boolean(profile.biometric_enrolled),
    phone: profile.phone || '',
    bio: profile.bio || '',
    profilePhoto: profile.profile_photo || null,
    notificationSettings: profile.notification_settings || {},
    regionalSettings: profile.regional_settings || {},
    lastLogin: profile.last_login || null,
    dateJoined: profile.date_joined || '',
  } satisfies ProfileRecord;
}

export async function updateProfile(payload: ProfileUpdatePayload) {
  const response = await apiRequest<{
    success: boolean;
    profile: {
      id: string;
      username: string;
      email: string;
      first_name?: string;
      last_name?: string;
      name?: string;
      role?: string;
      department?: string;
      position?: string;
      employment_type?: string;
      hire_date?: string | null;
      biometric_enrolled?: boolean;
      phone?: string;
      bio?: string;
      profile_photo?: string | null;
      notification_settings?: Record<string, boolean>;
      regional_settings?: Record<string, string>;
      last_login?: string | null;
      date_joined?: string;
    };
  }>('/accounts/api/profile/update/', {
    method: 'POST',
    body: {
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      position: payload.position,
      phone: payload.phone,
      bio: payload.bio,
      profile_photo: payload.profilePhoto,
      notification_settings: payload.notificationSettings,
      regional_settings: payload.regionalSettings,
    },
  });

  const profile = response.profile;
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    fullName: profile.name || [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim(),
    role: profile.role || 'employee',
    department: profile.department || '',
    position: profile.position || '',
    employmentType: profile.employment_type || '',
    hireDate: profile.hire_date || null,
    biometricEnrolled: Boolean(profile.biometric_enrolled),
    phone: profile.phone || '',
    bio: profile.bio || '',
    profilePhoto: profile.profile_photo || null,
    notificationSettings: profile.notification_settings || {},
    regionalSettings: profile.regional_settings || {},
    lastLogin: profile.last_login || null,
    dateJoined: profile.date_joined || '',
  } satisfies ProfileRecord;
}

export function changePassword(newPassword: string) {
  return apiRequest<{ success: boolean; message: string }>('/accounts/api/change-password/', {
    method: 'POST',
    body: {
      new_password: newPassword,
    },
  });
}

export { formatRelativeTime };

export async function fetchFAQs(query: string = '') {
  const url = `/api/support/api/faqs/${query ? `?q=${encodeURIComponent(query)}` : ''}`;
  return apiRequest<{
    categories: {
      title: string;
      icon: string;
      items: string[];
    }[];
  }>(url);
}
