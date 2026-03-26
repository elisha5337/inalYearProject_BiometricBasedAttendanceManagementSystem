import { ApiError, apiRequest } from './api';
import type { AppUserRole } from '../types';

export interface ManagedUserRecord {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: AppUserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  department: string;
  biometricEnrolled: boolean;
  status: string;
}

export interface SaveUserPayload {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppUserRole;
  isActive: boolean;
  password?: string;
}

const userListPaths = [
  '/accounts/api/users/',
];

const createUserPaths = [
  '/accounts/api/users/create/',
];

function updateUserPaths(userId: string) {
  return [
    `/accounts/api/users/${userId}/update/`,
  ];
}

function normalizeRole(value: unknown): AppUserRole {
  const normalized = String(value ?? 'employee').trim().toLowerCase();

  if (normalized.includes('admin')) {
    return 'admin';
  }

  if (normalized.includes('hr')) {
    return 'hr';
  }

  return 'employee';
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
    new Error('No compatible user-management endpoint was found for this frontend integration.')
  );
}

function extractRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const typedPayload = payload as Record<string, unknown>;

    if (Array.isArray(typedPayload.users)) {
      return typedPayload.users;
    }

    if (Array.isArray(typedPayload.results)) {
      return typedPayload.results;
    }
  }

  return [];
}

function mapUser(raw: unknown): ManagedUserRecord {
  const item = (raw ?? {}) as Record<string, unknown>;
  const firstName = String(item.first_name ?? item.firstName ?? '');
  const lastName = String(item.last_name ?? item.lastName ?? '');
  const fullName =
    String(item.full_name ?? item.fullName ?? '').trim() ||
    String(item.name ?? '').trim() ||
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    String(item.username ?? 'Unknown User');

  const status = String(item.status ?? 'ACTIVE');
  const department = String(item.department ?? 'No Department');

  return {
    id: String(item.id ?? ''),
    username: String(item.username ?? ''),
    email: String(item.email ?? ''),
    firstName,
    lastName,
    fullName,
    role: normalizeRole(item.role),
    isActive: Boolean(item.is_active ?? item.isActive ?? status === 'ACTIVE'),
    mustChangePassword: Boolean(item.must_change_password ?? item.mustChangePassword ?? false),
    department,
    biometricEnrolled: Boolean(item.enrolled ?? item.biometric_enrolled ?? false),
    status,
  };
}

function buildPayload(payload: SaveUserPayload) {
  return {
    username: payload.username,
    email: payload.email,
    role: payload.role,
    password: payload.password,
    first_name: payload.firstName,
    last_name: payload.lastName,
    full_name: [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim(),
    is_active: payload.isActive,
    status: payload.isActive ? 'ACTIVE' : 'SUSPENDED',
  };
}

export async function fetchUsers() {
  const payload = await requestFirstAvailable<unknown>(userListPaths);

  return extractRows(payload)
    .map(mapUser)
    .sort((left, right) => left.fullName.localeCompare(right.fullName));
}

export async function createUser(payload: SaveUserPayload) {
  return requestFirstAvailable(createUserPaths, {
    method: 'POST',
    body: buildPayload(payload),
  });
}

export async function updateUser(userId: string, payload: SaveUserPayload) {
  return requestFirstAvailable(updateUserPaths(userId), {
    method: 'PATCH',
    body: buildPayload(payload),
  });
}
