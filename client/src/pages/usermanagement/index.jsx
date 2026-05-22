import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, X, Check, ChevronRight, Trash2,
  Shield, Users, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

/* ══════════════════════════════
   CONSTANTS
══════════════════════════════ */
const MODULES = ['sales','purchases','items','parties','reports','accounts','settings','users'];
const ACTIONS = ['view','create','edit','delete'];

const ROLE_COLORS = {
  Owner:       'bg-purple-100 text-purple-700',
  Admin:       'bg-red-100 text-red-700',
  Manager:     'bg-blue-100 text-blue-700',
  Accountant:  'bg-green-100 text-green-700',
  'Sales Staff':'bg-amber-100 text-amber-700',
  Viewer:      'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  true:  'bg-green-100 text-green-700',
  false: 'bg-red-100 text-red-600',
};

/* ══════════════════════════════
   HELPERS
══════════════════════════════ */
function UserAvatar({ name, size = 'md' }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors   = [
    'bg-blue-500','bg-purple-500','bg-green-500','bg-amber-500',
    'bg-red-500','bg-teal-500','bg-pink-500','bg-indigo-500',
  ];
  const color = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  const sz    = size === 'lg' ? 'w-14 h-14 text-xl' : size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function api(path, opts = {}) {
  const res  = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

/* ══════════════════════════════
   ADD / EDIT USER MODAL
══════════════════════════════ */
function UserModal({ user, roles, onClose, onSaved }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:     user?.name     ?? '',
    email:    user?.email    ?? '',
    phone:    user?.phone    ?? '',
    password: '',
    roleId:   user?.roleId   ?? (roles[0]?.id ?? ''),
    isActive: user?.isActive ?? true,
  });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.roleId) { setErr('Name, email and role are required.'); return; }
    if (!isEdit && !form.password) { setErr('Password is required for new users.'); return; }
    setSaving(true); setErr('');
    try {
      const body = { ...form, roleId: Number(form.roleId) };
      if (isEdit && !body.password) delete body.password;
      const saved = isEdit
        ? await api(`/users/${user.id}`, { method: 'PUT', body: JSON.stringify(body) })
        : await api('/users',            { method: 'POST', body: JSON.stringify(body) });
      toast.success(isEdit ? 'User updated' : 'User created');
      onSaved(saved);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">{isEdit ? 'Edit User' : 'Add New User'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded transition"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} />{err}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Full Name *</label>
              <input value={form.name} onChange={f('name')} placeholder="John Doe" className={inp} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Phone</label>
              <input value={form.phone} onChange={f('phone')} placeholder="9876543210" className={inp} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Email *</label>
            <input type="email" value={form.email} onChange={f('email')} placeholder="user@example.com" className={inp} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">
              {isEdit ? 'New Password (leave blank to keep)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={f('password')}
                placeholder={isEdit ? '••••••••' : 'Min 6 characters'}
                className={`${inp} pr-10`}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Role *</label>
              <select value={form.roleId} onChange={f('roleId')} className={inp}>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Status</label>
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent
                    transition-colors ${form.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform
                    ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <span className="text-sm text-gray-600">{form.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition disabled:bg-gray-300">
              {saving ? 'Saving…' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   USER PROFILE DRAWER
══════════════════════════════ */
function UserDrawer({ user, roles, onClose, onUpdated, onDeleted }) {
  const [editing,  setEditing]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const toggleStatus = async () => {
    setToggling(true);
    try {
      const updated = await api(`/users/${user.id}/status`, {
        method: 'PATCH', body: JSON.stringify({ isActive: !user.isActive }),
      });
      toast.success(`User ${updated.isActive ? 'activated' : 'deactivated'}`);
      onUpdated(updated);
    } catch (e) { toast.error(e.message); }
    finally { setToggling(false); }
  };

  const deleteUser = async () => {
    setDeleting(true);
    try {
      await api(`/users/${user.id}`, { method: 'DELETE' });
      toast.success('User deleted');
      onDeleted(user.id);
    } catch (e) { toast.error(e.message); setDeleting(false); }
  };

  if (editing) return (
    <UserModal user={user} roles={roles} onClose={() => setEditing(false)}
      onSaved={u => { setEditing(false); onUpdated(u); }} />
  );

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white w-80 h-full shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-800">User Profile</p>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5">
          <div className="flex flex-col items-center gap-3">
            <UserAvatar name={user.name} size="lg" />
            <div className="text-center">
              <p className="font-bold text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <div className="flex gap-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[user.role?.name] ?? 'bg-gray-100 text-gray-600'}`}>
                {user.role?.name}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[user.isActive]}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            {[
              { label: 'Phone',      value: user.phone      || '—' },
              { label: 'Last Login', value: fmtDate(user.lastLogin) },
              { label: 'Created',    value: fmtDate(user.createdAt) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-500">{label}</span>
                <span className="text-gray-700 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <button onClick={() => setEditing(true)}
            className="w-full text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition">
            Edit User
          </button>
          <button onClick={toggleStatus} disabled={toggling}
            className={`w-full text-sm font-semibold py-2 rounded-lg transition
              ${user.isActive
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200'}`}>
            {toggling ? '…' : user.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={deleteUser} disabled={deleting}
            className="w-full text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2 rounded-lg transition">
            {deleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════
   USERS TAB
══════════════════════════════ */
function UsersTab({ users, roles, loading, onRefresh }) {
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [drawer,     setDrawer]     = useState(null);

  const filtered = useMemo(() => users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) &&
        !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter   && String(u.roleId) !== roleFilter)              return false;
    if (statusFilter !== '' && String(u.isActive) !== statusFilter)   return false;
    return true;
  }), [users, search, roleFilter, statusFilter]);

  const handleSaved = u => {
    setAddOpen(false);
    setDrawer(null);
    onRefresh();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search users…"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white">
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
          <Plus size={14} /> Add User
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Loading users…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <Users size={32} className="text-gray-300" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(u => (
                <tr key={u.id}
                  onClick={() => setDrawer(u)}
                  className="hover:bg-blue-50 cursor-pointer transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.name} size="sm" />
                      <div>
                        <p className="font-medium text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLORS[u.role?.name] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[u.isActive]}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.lastLogin)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-gray-400">
                    <ChevronRight size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer count */}
      <div className="shrink-0 px-6 py-2 border-t border-gray-100 text-xs text-gray-400">
        {filtered.length} of {users.length} users
      </div>

      {addOpen && (
        <UserModal roles={roles} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
      )}
      {drawer && (
        <UserDrawer
          user={drawer}
          roles={roles}
          onClose={() => setDrawer(null)}
          onUpdated={u => { setDrawer(u); onRefresh(); }}
          onDeleted={() => { setDrawer(null); onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════
   ROLES & PERMISSIONS TAB
══════════════════════════════ */
function RolesTab({ roles, permissions, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [checked,  setChecked]  = useState(new Set());

  useEffect(() => {
    if (!selected) return;
    const role = roles.find(r => r.id === selected);
    if (!role) return;
    const ids = new Set(role.rolePermissions?.map(rp => rp.permissionId) ?? []);
    setChecked(ids);
  }, [selected, roles]);

  const toggle = (permId) => {
    const role = roles.find(r => r.id === selected);
    if (role?.name === 'Owner') return;
    setChecked(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  };

  const toggleModule = (module) => {
    const role = roles.find(r => r.id === selected);
    if (role?.name === 'Owner') return;
    const modPerms = permissions.filter(p => p.module === module);
    const allOn    = modPerms.every(p => checked.has(p.id));
    setChecked(prev => {
      const next = new Set(prev);
      modPerms.forEach(p => allOn ? next.delete(p.id) : next.add(p.id));
      return next;
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      await api(`/roles/${selected}/permissions`, {
        method: 'PUT',
        body:   JSON.stringify({ permissionIds: [...checked] }),
      });
      toast.success('Permissions saved');
      onRefresh();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const selectedRole = roles.find(r => r.id === selected);
  const isOwner      = selectedRole?.name === 'Owner';

  return (
    <div className="flex h-full overflow-hidden">
      {/* Role sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase">Roles</p>
        </div>
        {roles.map(r => (
          <button key={r.id} onClick={() => setSelected(r.id)}
            className={`w-full text-left px-4 py-3 flex items-center justify-between transition
              ${selected === r.id ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'}`}>
            <div>
              <p className={`text-sm font-medium ${selected === r.id ? 'text-blue-700' : 'text-gray-700'}`}>
                {r.name}
              </p>
              <p className="text-xs text-gray-400">{r._count?.users ?? 0} users</p>
            </div>
            {r.isSystem && <Shield size={12} className="text-gray-400" />}
          </button>
        ))}
      </div>

      {/* Permissions grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Shield size={32} className="text-gray-300" />
            <p className="text-sm">Select a role to manage permissions</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-800">{selectedRole?.name}</p>
                <p className="text-xs text-gray-500">{selectedRole?.description}</p>
              </div>
              {!isOwner && (
                <button onClick={savePermissions} disabled={saving}
                  className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:bg-gray-300">
                  <Check size={14} /> {saving ? 'Saving…' : 'Save'}
                </button>
              )}
            </div>

            {isOwner && (
              <div className="mx-6 mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Owner has full access to all features and cannot be modified.
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-36">Module</th>
                    {ACTIONS.map(a => (
                      <th key={a} className="px-4 py-3 text-center text-xs font-semibold text-gray-600 capitalize">{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MODULES.map(module => {
                    const modPerms = permissions.filter(p => p.module === module);
                    const allOn    = modPerms.every(p => checked.has(p.id));
                    return (
                      <tr key={module} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleModule(module)}
                            disabled={isOwner}
                            className={`flex items-center gap-1.5 font-semibold capitalize text-gray-700
                              ${!isOwner ? 'hover:text-blue-600 cursor-pointer' : 'cursor-default'}`}>
                            <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center
                              ${allOn ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                              {allOn && <Check size={9} className="text-white" />}
                            </span>
                            {module}
                          </button>
                        </td>
                        {ACTIONS.map(action => {
                          const perm = modPerms.find(p => p.action === action);
                          const on   = perm ? checked.has(perm.id) : false;
                          return (
                            <td key={action} className="px-4 py-3 text-center">
                              {perm ? (
                                <button
                                  onClick={() => toggle(perm.id)}
                                  disabled={isOwner}
                                  className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition
                                    ${on
                                      ? 'bg-blue-500 border-blue-500'
                                      : 'border-gray-300 hover:border-blue-400'}
                                    ${isOwner ? 'cursor-default' : 'cursor-pointer'}`}>
                                  {on && <Check size={11} className="text-white" />}
                                </button>
                              ) : (
                                <span className="text-gray-200">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════
   MAIN PAGE
══════════════════════════════ */
export default function UserManagement() {
  const [tab,         setTab]         = useState('users');
  const [users,       setUsers]       = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [u, r, p] = await Promise.all([
        api('/users'),
        api('/roles'),
        api('/roles/permissions'),
      ]);
      setUsers(u);
      setRoles(r);
      setPermissions(p);
    } catch (e) {
      toast.error('Failed to load data: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const TAB_CLS = active =>
    `px-5 py-3 text-sm font-semibold border-b-2 transition ${
      active ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
    }`;

  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* Page header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-bold text-gray-800">User Management</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage users, roles and permissions</p>
      </div>

      {/* Stats strip */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-3 flex gap-6">
        {[
          { label: 'Total Users',  value: users.length },
          { label: 'Active',       value: users.filter(u => u.isActive).length },
          { label: 'Inactive',     value: users.filter(u => !u.isActive).length },
          { label: 'Roles',        value: roles.length },
        ].map(s => (
          <div key={s.label}>
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-white border-b border-gray-200 flex px-6">
        <button className={TAB_CLS(tab === 'users')} onClick={() => setTab('users')}>
          <span className="flex items-center gap-2"><Users size={14} /> Users</span>
        </button>
        <button className={TAB_CLS(tab === 'roles')} onClick={() => setTab('roles')}>
          <span className="flex items-center gap-2"><Shield size={14} /> Roles &amp; Permissions</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden bg-white">
        {tab === 'users'
          ? <UsersTab users={users} roles={roles} loading={loading} onRefresh={fetchAll} />
          : <RolesTab roles={roles} permissions={permissions} onRefresh={fetchAll} />
        }
      </div>

    </div>
  );
}
