import { useState } from 'react';
import { useAdminUsers, useUpdateUserRole } from '../../hooks/useAdmin';
import { FullPageSpinner } from '../../components/ui/Spinner';

const roles = ['CUSTOMER', 'STAFF', 'ADMIN'];

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useAdminUsers({ page, limit: 20, q: search || undefined, role: roleFilter || undefined });
  const updateRole = useUpdateUserRole();

  const users = data?.items || data?.users || [];

  return (
    <div>
      <h1 className="text-headline-lg text-text mb-6">Users</h1>

      <div className="flex gap-3 flex-wrap mb-4">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name or email…"
          className="w-full max-w-sm h-10 px-3 rounded-standard border border-border bg-surface text-body-sm outline-none focus:border-primary"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="h-10 px-3 rounded-standard border border-border bg-surface text-body-sm outline-none"
        >
          <option value="">All roles</option>
          {roles.map((role) => <option key={role} value={role}>{role}</option>)}
        </select>
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="bg-surface border border-border rounded-container overflow-x-auto">
          <table className="w-full text-body-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-border text-left text-text-secondary">
                <th className="p-3.5 font-medium">Name</th>
                <th className="p-3.5 font-medium">Email</th>
                <th className="p-3.5 font-medium">Phone</th>
                <th className="p-3.5 font-medium">Role</th>
                <th className="p-3.5 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="p-3.5 text-text font-medium">{user.name}</td>
                  <td className="p-3.5 text-text-secondary">{user.email}</td>
                  <td className="p-3.5 text-text-secondary font-mono">{user.phone}</td>
                  <td className="p-3.5">
                    <select
                      defaultValue={user.role}
                      onChange={(e) => updateRole.mutate({ id: user.id, role: e.target.value })}
                      className="h-9 px-2 rounded-standard border border-border bg-surface text-body-sm outline-none"
                    >
                      {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td className="p-3.5 text-text-secondary">{user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && <p className="text-body-sm text-text-secondary text-center py-10">No users found.</p>}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-9 px-3 rounded-standard border border-border text-body-sm disabled:opacity-50">Previous</button>
          <span className="text-body-sm text-text-secondary px-2">Page {page} of {data.totalPages}</span>
          <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 px-3 rounded-standard border border-border text-body-sm disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
