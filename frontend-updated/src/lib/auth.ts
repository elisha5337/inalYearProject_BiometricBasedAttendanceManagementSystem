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
  profile_photo?: string | null;
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
    profilePhoto: user.profile_photo || null,
  };
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
  role: AppUserRole;
  remember?: boolean;
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

export async function changePassword(newPassword: string) {
  await ensureCsrfCookie();
  const response = await apiRequest<{ success: boolean; message: string }>('/accounts/api/change-password/', {
    method: 'POST',
    body: { new_password: newPassword },
  });
  return response.success;
}

export async function requestPasswordReset(email: string) {
  await ensureCsrfCookie();
  return apiRequest<{ success: boolean; message: string }>('/accounts/api/password-reset/request/', {
    method: 'POST',
    body: { email },
  });
}

export async function confirmPasswordReset(uidb64: string, token: string, newPassword: string) {
  await ensureCsrfCookie();
  return apiRequest<{ success: boolean; message: string }>(`/accounts/api/password-reset/confirm/${uidb64}/${token}/`, {
    method: 'POST',
    body: { new_password: newPassword },
  });
}
