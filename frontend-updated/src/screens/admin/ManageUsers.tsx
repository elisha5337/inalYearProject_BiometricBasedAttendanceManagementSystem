import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../lib/translations';

import { ApiError, apiRequest } from '../../lib/api';
import {
  createUser,
  fetchUsers,
  updateUser,
  type ManagedUserRecord,
  type SaveUserPayload,
} from '../../lib/users';
import type { AppUserRole } from '../../types';

interface Department {
  id: string;
  name: string;
}

interface Position {
  id: string;
  name: string;
}

const emptyFormState: SaveUserPayload = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'employee',
  isActive: true,
  password: '',
  departmentId: '',
  position: '',
  hireDate: new Date().toISOString().split('T')[0],
  biometricEnrolled: false,
};

function getRoleClasses(role: AppUserRole) {
  switch (role) {
    case 'admin':
      return 'bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200';
    case 'hr':
      return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200';
    default:
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
  }
}

function getStatusClasses(isActive: boolean) {
  return isActive
    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
    : 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200';
}

function buildFormFromUser(user: ManagedUserRecord): SaveUserPayload {
  return {
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    password: '',
    departmentId: user.departmentId || '',
    position: user.position || '',
    hireDate: user.hireDate || new Date().toISOString().split('T')[0],
    biometricEnrolled: user.biometricEnrolled,
  };
}

function applyUserChanges(
  user: ManagedUserRecord,
  payload: SaveUserPayload,
  departments: Department[]
): ManagedUserRecord {
  const fullName =
    [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim() || payload.username;

  const departmentName = departments.find(d => d.id === payload.departmentId)?.name || 'No Department';

  return {
    ...user,
    username: payload.username,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    fullName,
    role: payload.role,
    isActive: payload.isActive,
    status: payload.isActive ? 'ACTIVE' : 'SUSPENDED',
    departmentId: payload.departmentId,
    department: departmentName,
    position: payload.position,
    hireDate: payload.hireDate,
  };
}

export default function ManageUsers() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availablePositions, setAvailablePositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusActionUserId, setStatusActionUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | AppUserRole>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<SaveUserPayload>(emptyFormState);
  const willSuspendOnUpdate = Boolean(editingUserId && !formState.isActive);
  const routeSearchTerm = searchParams.get('search') ?? '';

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      try {
        setLoading(true);
        setError(null);

        const [usersData, deptsData] = await Promise.all([
          fetchUsers(),
          apiRequest<{ success: boolean; departments: Department[] }>('/accounts/api/departments/')
        ]);

        if (!cancelled) {
          setUsers(usersData);
          if (deptsData.success) {
            setDepartments(deptsData.departments);
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof ApiError ? loadError.message : 'Unable to load initial data right now.';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch positions when department changes
  useEffect(() => {
    let cancelled = false;

    async function loadPositions() {
      if (!formState.departmentId) {
        setAvailablePositions([]);
        return;
      }

      try {
        const data = await apiRequest<{ success: boolean; positions: Position[] }>(
          `/accounts/api/positions/?departmentId=${formState.departmentId}`
        );
        if (!cancelled && data.success) {
          setAvailablePositions(data.positions);
        }
      } catch (err) {
        console.error("Failed to load positions", err);
      }
    }

    loadPositions();
    return () => { cancelled = true; };
  }, [formState.departmentId]);

  useEffect(() => {
    setSearchTerm(routeSearchTerm);
  }, [routeSearchTerm]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [user.fullName, user.username, user.email, user.role, user.department, user.position]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [roleFilter, searchTerm, users]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((user) => user.role === 'admin').length,
      hr: users.filter((user) => user.role === 'hr').length,
      employees: users.filter((user) => user.role === 'employee').length,
    };
  }, [users]);

  function resetForm() {
    setEditingUserId(null);
    setFormState(emptyFormState);
  }

  function startEditing(user: ManagedUserRecord) {
    setSuccessMessage(null);
    setError(null);
    setEditingUserId(user.id);
    setFormState(buildFormFromUser(user));
  }

  function isProtectedSystemUser(user: ManagedUserRecord) {
    return ['admin', 'elsa'].includes(user.username.toLowerCase());
  }

  async function handleStatusToggle(user: ManagedUserRecord) {
    const nextIsActive = !user.isActive;
    const actionLabel = nextIsActive ? 'activate' : 'suspend';

    const confirmed = window.confirm(
      `Are you sure you want to ${actionLabel} ${user.fullName || user.username}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setStatusActionUserId(user.id);
      setError(null);
      setSuccessMessage(null);

      await updateUser(user.id, {
        ...buildFormFromUser(user),
        isActive: nextIsActive,
      });

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) =>
          currentUser.id === user.id
            ? applyUserChanges(currentUser, {
                ...buildFormFromUser(currentUser),
                isActive: nextIsActive,
              }, departments)
            : currentUser,
        ),
      );

      if (editingUserId === user.id) {
        setFormState((current) => ({
          ...current,
          isActive: nextIsActive,
        }));
      }

      setSuccessMessage(`User ${nextIsActive ? 'activated' : 'suspended'} successfully.`);
    } catch (actionError) {
      const message =
        actionError instanceof ApiError
          ? actionError.message
          : `Unable to ${actionLabel} this user right now.`;
      setError(message);
    } finally {
      setStatusActionUserId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const username = formState.username.trim();

      // Check if username exists before submittion
      const duplicateUsername = users.some(u => 
        u.username.toLowerCase() === username.toLowerCase() && u.id !== editingUserId
      );

      if (duplicateUsername) {
        setError('This username is already taken. Please choose another.');
        setSaving(false);
        return;
      }

      const payload: SaveUserPayload = {
        ...formState,
        username,
        email: formState.email.trim(),
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        isActive: Boolean(formState.isActive),
        position: formState.position,
        hireDate: formState.hireDate,
        departmentId: formState.departmentId,
      };

      if (editingUserId) {
        await updateUser(editingUserId, payload);

        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === editingUserId
              ? applyUserChanges(user, payload, departments)
              : user,
          ),
        );

        setSuccessMessage('User updated successfully.');
      } else {
        await createUser(payload);
        const refreshedUsers = await fetchUsers();
        setUsers(refreshedUsers);
        setSuccessMessage('User created successfully.');
      }

      resetForm();
    } catch (saveError) {
      const message =
        saveError instanceof ApiError ? saveError.message : 'Unable to save user changes.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  const currentEditingRecord = users.find(u => u.id === editingUserId);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">{t('Administration')}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{t('Manage Users')}</h1>
            <p className="max-w-2xl text-sm text-slate-600">{t('Browse employee database and manage profile details in a single workspace.')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">{t('Total Users')}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-700">{t('Admin')}</p>
              <p className="mt-2 text-2xl font-semibold text-violet-900">{stats.admins}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">HR</p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">{stats.hr}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">{t('Employees')}</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.employees}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        <div className="lg:col-span-7 xl:col-span-8 relative min-h-[600px]">
          <div className="lg:absolute lg:inset-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
            <div className="p-6 border-b border-slate-200 bg-white shrink-0">
              <div className="grid gap-4 md:grid-cols-[1fr_200px]">
                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('Search Database')}</span>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={t('Search by name, position, or department...')}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('Filter Role')}</span>
                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value as 'all' | AppUserRole)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                  >
                    <option value="all">{t('All roles')}</option>
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white scrollbar-thin">
              {loading ? (
                <div className="px-6 py-10 text-sm text-slate-500 text-center">Synchronizing user data...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="px-6 py-10 text-sm text-slate-500 text-center">No matching records found.</div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0">
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 bg-slate-50">Profile</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 bg-slate-50">Department</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 bg-slate-50">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 bg-slate-50">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="align-top hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-900">{user.fullName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">@{user.username}</p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-medium text-slate-700">{user.department}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{user.position || 'Position Unset'}</p>
                          <div className="mt-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getRoleClasses(user.role)}`}>{user.role}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${user.biometricEnrolled ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-200'}`}>
                              {user.biometricEnrolled ? `Enrolled ${user.enrollmentInfo}` : 'Pending'}
                            </span>
                            <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${getStatusClasses(user.isActive)}`}>
                              {user.isActive ? 'Active' : 'Suspended'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => startEditing(user)} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600">Edit</button>
                            {!isProtectedSystemUser(user) && (
                              <button type="button" onClick={() => handleStatusToggle(user)} disabled={saving || statusActionUserId === user.id} className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50 ${user.isActive ? 'border border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-100'}`}>{statusActionUserId === user.id ? '...' : user.isActive ? 'Suspend' : 'Activate'}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 h-full">
          <aside className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col h-full sticky top-6">
            <div className="flex items-start justify-between gap-4 shrink-0 mb-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{editingUserId ? 'User Management' : 'System Enrollment'}</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">{editingUserId ? 'Update Profile' : 'New Employee'}</h2>
              </div>
              {editingUserId && (
                <button type="button" onClick={resetForm} className="rounded-2xl border border-slate-200 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest transition-all hover:bg-white hover:text-slate-900">Cancel</button>
              )}
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">First name</span>
                  <input type="text" value={formState.firstName} onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Last name</span>
                  <input type="text" value={formState.lastName} onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5" />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Username</span>
                  <input type="text" value={formState.username} onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5" />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                  <input type="email" value={formState.email} onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5" />
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Department</span>
                <select value={formState.departmentId} onChange={(event) => setFormState((current) => ({ ...current, departmentId: event.target.value, position: "" }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white">
                  <option value="">Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Position</span>
                  <select value={formState.position} onChange={(event) => setFormState((current) => ({ ...current, position: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white">
                    <option value="">{formState.departmentId ? 'Select Role' : 'Pick Dept First'}</option>
                    {availablePositions.map((pos) => (
                      <option key={pos.id} value={pos.name}>{pos.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Hire Date</span>
                  <input type="date" value={formState.hireDate} onChange={(event) => setFormState((current) => ({ ...current, hireDate: event.target.value }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white" />
                </label>
              </div>

              <div className="grid gap-4">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Access Role</span>
                  <select value={formState.role} onChange={(event) => setRoleFilter(event.target.value as any)} className="hidden invisible" tabIndex={-1} aria-hidden="true" />
                  <select value={formState.role} onChange={(event) => setFormState((current) => ({ ...current, role: event.target.value as AppUserRole }))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white">
                    <option value="admin">Admin</option>
                    <option value="hr">HR</option>
                    <option value="employee">Employee</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 cursor-pointer group hover:bg-white transition-all">
                  <input type="checkbox" checked={formState.isActive} onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Active</span>
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-3 cursor-not-allowed opacity-80">
                  <input type="checkbox" checked={formState.biometricEnrolled} readOnly disabled className="h-4 w-4 rounded border-slate-300 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                    Enrolled {currentEditingRecord?.enrollmentInfo}
                  </span>
                </div>
              </div>

              {error && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 text-center uppercase tracking-wider">{error}</div>}
              {successMessage && <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-600 text-center uppercase tracking-wider">{successMessage}</div>}

              <button type="submit" disabled={saving} className="w-full rounded-2xl bg-slate-900 px-4 py-4 text-sm font-bold text-white transition-all hover:bg-indigo-600 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Processing...' : editingUserId ? 'Update Profile' : 'Register Employee'}
              </button>
            </form>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6"></path>
      <path d="M1 20v-6h6"></path>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
  );
}
