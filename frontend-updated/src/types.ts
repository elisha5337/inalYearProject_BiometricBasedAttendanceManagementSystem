export type AppUserRole = 'admin' | 'hr' | 'employee';

export interface User {
  _id: string;
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  name?: string; // Convenience for frontend
  role?: AppUserRole; // Convenience for frontend
  status?: string;
  createdAt: string;
  mustChangePassword?: boolean;
  profilePhoto?: string | null;
}

export interface EmployeeDetail {
  userId: string;
  departmentId?: string;
  position?: string;
  employmentType?: string;
  hireDate: string;
  biometricEnrolled: boolean;
}

export interface Department {
  _id: string;
  name: string;
  managerId?: string;
}

export interface AttendanceRecord {
  _id: string;
  userId: string;
  deviceId?: string;
  timestamp: string;
  type: 'Check-in' | 'Check-out';
  status: 'On-time' | 'Late' | 'Early-exit' | 'Absent';
}

export interface LeaveRequest {
  _id: string;
  userId: string;
  approvedBy?: string;
  appliedPolicyId?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Policy {
  _id: string;
  name: string;
  rules: any;
  departmentId?: string;
}

export interface UserRole {
  _id: string;
  userId: string;
  roleId: string;
  assignedAt: string;
}

export interface Device {
  _id: string;
  device_Serial: string;
  name: string;
  ipAddress: string;
  port: number;
  location?: string;
  status?: string;
}

export interface BiometricTemplate {
  _id: string;
  userId: string;
  type: string;
  templateData: string; // Base64 or binary representation
}

export interface Shift {
  _id: string;
  departmentId?: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Assignment {
  _id: string;
  userId: string;
  shiftId: string;
  fromDate: string;
  toDate?: string;
  assignedBy?: string;
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
}

export interface Permission {
  _id: string;
  name: string;
  resource: string;
  action: string;
}

export interface RolePermission {
  _id: string;
  roleId: string;
  permissionId: string;
  grantedAt: string;
}

export interface AuditLog {
  _id: string;
  userId?: string;
  action: string;
  description?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface Report {
  _id: string;
  type: string;
  parameters?: any;
  generatedAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  status: string;
  sentAt: string;
}

export interface Workflow {
  _id: string;
  name: string;
  steps?: any;
}
