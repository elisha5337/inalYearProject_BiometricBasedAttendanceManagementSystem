import { useEffect, useMemo, useState, type FormEvent } from 'react';

import { ApiError } from '../../lib/api';
import {
  createUser,
  fetchUsers,
  updateUser,
  type ManagedUserRecord,
  type SaveUserPayload,
} from '../../lib/users';
import type { AppUserRole } from '../../types';

const emptyFormState: SaveUserPayload = {
  username: '',
  email: '',
  firstName: '',
  lastName: '',
  role: 'employee',
  isActive: true,
  password: '',
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
  };
}

function applyUserChanges(
  user: ManagedUserRecord,
  payload: SaveUserPayload,
): ManagedUserRecord {
  const fullName =
    [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim() || payload.username;

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
  };
}

export default function ManageUsers() {
  const [users, setUsers] = useState<ManagedUserRecord[]>([]);
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

  useEffect(() => {
    let cancelled = false;

    async function loadUsers() {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchUsers();

        if (!cancelled) {
          setUsers(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof ApiError ? loadError.message : 'Unable to load users right now.';

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [user.fullName, user.username, user.email, user.role]
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
              })
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

      const payload: SaveUserPayload = {
        ...formState,
        username: formState.username.trim(),
        email: formState.email.trim(),
        firstName: formState.firstName.trim(),
        lastName: formState.lastName.trim(),
        isActive: Boolean(formState.isActive),
      };

      if (editingUserId) {
        const existingUser = users.find((user) => user.id === editingUserId) || null;
        await updateUser(editingUserId, payload);

        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === editingUserId
              ? applyUserChanges(user, payload)
              : user,
          ),
        );

        if (existingUser && existingUser.isActive !== payload.isActive) {
          setSuccessMessage(
            `User ${payload.isActive ? 'activated' : 'suspended'} successfully.`,
          );
        } else {
          setSuccessMessage('User updated successfully.');
        }
      } else {
        if (!payload.password?.trim()) {
          setError('A password is required when creating a new user.');
          return;
        }

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
              Administration
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Manage Users</h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Create, update, and review users from live backend account data while preserving the
              existing admin experience.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Total Users
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-violet-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-700">
                Admin
              </p>
              <p className="mt-2 text-2xl font-semibold text-violet-900">{stats.admins}</p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-700">HR</p>
              <p className="mt-2 text-2xl font-semibold text-sky-900">{stats.hr}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-700">
                Employees
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-900">{stats.employees}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:items-start xl:grid-cols-[minmax(0,1.4fr)_420px]">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm xl:flex xl:h-[calc(100vh-10rem)] xl:flex-col">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Search users</span>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by name, username, or email..."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | AppUserRole)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="all">All roles</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
              </label>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-slate-500 xl:flex-1">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="px-6 py-10 text-sm text-slate-500 xl:flex-1">
              No users matched the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto xl:min-h-0 xl:flex-1 xl:overflow-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Role
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="align-top">
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-medium text-slate-900">{user.fullName}</p>
                          <p className="mt-1 text-sm text-slate-500">@{user.username}</p>
                          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase ${getRoleClasses(
                            user.role,
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              user.isActive,
                            )}`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>

                          {user.mustChangePassword ? (
                            <span className="inline-flex w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                              Password reset required
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditing(user)}
                            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          {isProtectedSystemUser(user) ? (
                            <span className="inline-flex items-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                              Protected
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStatusToggle(user)}
                              disabled={saving || statusActionUserId === user.id}
                              className={`rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                user.isActive
                                  ? 'border border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100'
                                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              {statusActionUserId === user.id
                                ? 'Updating...'
                                : user.isActive
                                  ? 'Suspend'
                                  : 'Activate'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-6 xl:max-h-[calc(100vh-10rem)] xl:self-start xl:overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                {editingUserId ? 'Update User' : 'Create User'}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {editingUserId ? 'Edit selected account' : 'Add a new account'}
              </h2>
            </div>

            {editingUserId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">First name</span>
                <input
                  type="text"
                  value={formState.firstName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, firstName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Last name</span>
                <input
                  type="text"
                  value={formState.lastName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, lastName: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Username</span>
              <input
                type="text"
                value={formState.username}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, username: event.target.value }))
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, email: event.target.value }))
                }
                required
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Role</span>
                <select
                  value={formState.role}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      role: event.target.value as AppUserRole,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                >
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="employee">Employee</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  type="password"
                  value={formState.password ?? ''}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder={editingUserId ? 'Leave blank to keep current password' : 'Required'}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <input
                type="checkbox"
                checked={formState.isActive}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, isActive: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">User account is active</span>
            </label>

            {willSuspendOnUpdate ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Updating with this unchecked will suspend the user account.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
            </button>
          </form>
        </section>
      </section>
    </div>
  );
}
