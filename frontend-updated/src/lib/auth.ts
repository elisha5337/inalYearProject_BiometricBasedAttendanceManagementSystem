import { apiRequest, ensureCsrfCookie } from './api';
import type { AppUserRole, User } from '../types';

type BackendUser = {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  role: AppUserRole | 'Administrator' | 'HR Officer' | 'Employee';
  status?: string;
  must_change_password?: boolean;
};

type AuthEnvelope = {
  success: boolean;
  user: BackendUser;
};

const roleMap: Record<string, AppUserRole> = {
  admin: 'admin',
  administrator: 'admin',
  hr: 'hr',
  hr_officer: 'hr',
  'hr officer': 'hr',
  employee: 'employee',
};

export function normalizeUserRole(role: string): AppUserRole {
  return roleMap[role.toLowerCase()] || 'employee';
}

export function mapBackendUser(user: BackendUser): User {
  const firstName = user.first_name || user.name?.split(' ')[0] || user.username;
  const lastName =
    user.last_name ||
    (user.name?.includes(' ') ? user.name.split(' ').slice(1).join(' ') : '');

  return {
    _id: user.id,
    username: user.username,
    email: user.email,
    passwordHash: '',
    firstName,
    lastName,
    name: user.name || `${firstName}${lastName ? ` ${lastName}` : ''}`.trim(),
    role: normalizeUserRole(user.role),
    status: user.status || 'ACTIVE',
    createdAt: new Date().toISOString(),
    mustChangePassword: Boolean(user.must_change_password),
  };
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
  role: AppUserRole;
}) {
  await ensureCsrfCookie();

  const response = await apiRequest<AuthEnvelope>('/accounts/api/login/', {
    method: 'POST',
    body: payload,
  });

  return mapBackendUser(response.user);
}

export async function fetchCurrentUser() {
  const response = await apiRequest<AuthEnvelope>('/accounts/api/me/');
  return mapBackendUser(response.user);
}

export function logoutUser() {
  return apiRequest<{ success: boolean }>('/accounts/api/logout/', {
    method: 'POST',
  });
}
