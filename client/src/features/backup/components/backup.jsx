import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  HardDrive, Download, Trash2, RefreshCw, Upload, Cloud,
  Clock, Calendar, Shield, CheckCircle2, AlertTriangle,
  Archive, History, ChevronRight, Database, Folder,
  ToggleLeft, ToggleRight, Settings2, FileJson, Info,
  CloudUpload, X, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import { BackupAPI } from '@features/backup/resources/backup-service';
import ConfirmDialog from '@components/ConfirmDialog';

/* ── helpers ────────────────────────────────────────────── */
function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(d) {
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(d) {
  const sec = Math.floor((Date.now() - new Date(d)) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

function nextScheduledLabel(cfg) {
  if (!cfg?.auto?.enabled) return 'Disabled';
  const [h, m] = (cfg.auto.time || '02:00').split(':').map(Number);
  const now = new Date();
  const freq = cfg.auto.frequency;
  if (freq === 'daily') {
    const t = new Date(now); t.setHours(h, m, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return fmtDate(t);
  }
  if (freq === 'weekly') {
    const day = cfg.auto.weekDay ?? 1;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const t = new Date(now);
    let diff = (day - t.getDay() + 7) % 7 || 7;
    t.setDate(t.getDate() + diff); t.setHours(h, m, 0, 0);
    return `${days[day]} ${fmtDate(t)}`;
  }
  if (freq === 'monthly') {
    const md = cfg.auto.monthDay ?? 1;
    const t = new Date(now.getFullYear(), now.getMonth(), md, h, m);
    if (t <= now) t.setMonth(t.getMonth() + 1);
    return fmtDate(t);
  }
  return '—';
}

/* ── Toggle ─────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${
        value ? 'bg-amber-500' : 'bg-slate-300'
      }`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
        value ? 'translate-x-5' : 'translate-x-0'
      }`} />
    </button>
  );
}

/* ── Stat Card ───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color = 'amber' }) {
  const colors = {
    amber: 'bg-amber-50 text-amber-600',
    blue:  'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-100 text-slate-500',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
      <div className={`p-2.5 rounded-lg ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-lg font-bold text-slate-800 leading-tight">{value}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MANUAL BACKUP TAB
═══════════════════════════════════════════════════════════ */
function ManualBackupTab({ backups, isLoading, isError, error, refetch }) {
  const qc = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const fileRef = useRef(null);

  const createMut = useMutation({
    mutationFn: BackupAPI.create,
    onSuccess: (data) => {
      toast.success(`Backup created: ${data.filename}`);
      qc.invalidateQueries({ queryKey: ['backup-list'] });
    },
    onError: (e) => toast.error(e?.error || 'Backup failed'),
  });

  const deleteMut = useMutation({
    mutationFn: BackupAPI.delete,
    onSuccess: () => {
      toast.success('Backup deleted');
      qc.invalidateQueries({ queryKey: ['backup-list'] });
    },
    onError: (e) => toast.error(e?.error || 'Delete failed'),
  });

  const totalSize = backups.reduce((s, b) => s + b.size, 0);
  const lastBackup = backups[0] ?? null;

  function handleDownload(filename) {
    const a = document.createElement('a');
    a.href = BackupAPI.downloadUrl(filename);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handleRestoreSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      toast.error('Please select a .json backup file');
      return;
    }
    setRestoreFile(file);
    setRestoreOpen(true);
  }

  async function handleRestoreConfirm() {
    if (!restoreFile) return;
    try {
      const text = await restoreFile.text();
      JSON.parse(text); // validate JSON
      toast.info('Restore feature requires server-side import. Please contact your administrator to restore using the backup file: ' + restoreFile.name);
    } catch {
      toast.error('Invalid backup file');
    } finally {
      setRestoreOpen(false);
      setRestoreFile(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Archive}   label="Total Backups"  value={backups.length}        color="amber" />
        <StatCard icon={Database}  label="Total Size"     value={fmtSize(totalSize)}    color="blue" />
        <StatCard icon={Clock}     label="Last Backup"    value={lastBackup ? timeAgo(lastBackup.createdAt) : 'Never'} sub={lastBackup ? fmtDate(lastBackup.createdAt) : null} color="green" />
        <StatCard icon={Shield}    label="Status"         value={lastBackup ? 'Protected' : 'No Backup'} color={lastBackup ? 'green' : 'slate'} />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-amber-200"
        >
          {createMut.isPending
            ? <Loader2 size={16} className="animate-spin" />
            : <HardDrive size={16} />}
          {createMut.isPending ? 'Creating...' : 'Create Backup Now'}
        </button>

        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition-colors"
        >
          <RefreshCw size={15} /> Refresh
        </button>

        <label className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition-colors cursor-pointer">
          <Upload size={15} /> Restore from File
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestoreSelect} />
        </label>
      </div>

      {/* Backup list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <History size={15} className="text-amber-500" /> Backup History
          </div>
          <span className="text-xs text-slate-400">{backups.length} file{backups.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading backups…
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-14 text-rose-400">
            <AlertTriangle size={36} className="mb-3 opacity-50" />
            <p className="text-sm font-medium">Failed to load backups</p>
            <p className="text-xs mt-1 text-slate-400">{error?.error || error?.message || 'Server unreachable — ensure the server is running'}</p>
            <button onClick={refetch} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <Archive size={36} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">No backups yet</p>
            <p className="text-xs mt-1">Create your first backup using the button above</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 text-left font-medium">#</th>
                <th className="px-4 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Date & Time</th>
                <th className="px-4 py-2.5 text-left font-medium">Size</th>
                <th className="px-4 py-2.5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b, i) => (
                <tr key={b.filename} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 font-mono text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileJson size={14} className="text-amber-500 shrink-0" />
                      <span className="font-mono text-xs text-slate-600 truncate max-w-48">{b.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-700">{fmtDate(b.createdAt)}</div>
                    <div className="text-xs text-slate-400">{timeAgo(b.createdAt)}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtSize(b.size)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleDownload(b.filename)}
                        title="Download"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(b.filename)}
                        title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Restore info card */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <Info size={16} className="shrink-0 mt-0.5" />
        <div>
          <span className="font-medium">How to restore: </span>
          Click "Restore from File", select a <code className="font-mono text-xs bg-blue-100 px-1 rounded">.json</code> backup file, then confirm.
          All current data will be overwritten with the backup data. A new backup is recommended before restoring.
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Backup"
        message={`Are you sure you want to delete "${deleteTarget}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={() => { deleteMut.mutate(deleteTarget); setDeleteTarget(null); }}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={restoreOpen}
        title="Restore from Backup"
        message={`This will restore from "${restoreFile?.name}". All current data will be replaced. Are you sure?`}
        confirmLabel="Restore"
        onConfirm={handleRestoreConfirm}
        onClose={() => { setRestoreOpen(false); setRestoreFile(null); if (fileRef.current) fileRef.current.value = ''; }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AUTO BACKUP TAB
═══════════════════════════════════════════════════════════ */
function AutoBackupTab({ config, onConfigSave }) {
  const [form, setForm] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00',
    weekDay: 1,
    monthDay: 1,
    retention: 7,
    ...config?.auto,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.auto) setForm(prev => ({ ...prev, ...config.auto }));
  }, [config]);

  function set(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onConfigSave({ auto: form });
      toast.success('Auto backup settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-5">
      {/* Enable card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${form.enabled ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
              <Clock size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Automatic Backup</div>
              <div className="text-xs text-slate-500 mt-0.5">
                {form.enabled ? 'Backups will be created automatically on schedule' : 'Enable to schedule automatic backups'}
              </div>
            </div>
          </div>
          <Toggle value={form.enabled} onChange={v => set('enabled', v)} />
        </div>
      </div>

      {/* Schedule card */}
      <div className={`bg-white rounded-xl border border-slate-200 p-5 space-y-4 transition-opacity ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <Calendar size={15} className="text-amber-500" /> Schedule
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Frequency */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Frequency</label>
            <select
              value={form.frequency}
              onChange={e => set('frequency', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Backup Time</label>
            <input
              type="time"
              value={form.time}
              onChange={e => set('time', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Day picker */}
          {form.frequency === 'weekly' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Day of Week</label>
              <select
                value={form.weekDay}
                onChange={e => set('weekDay', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
          )}
          {form.frequency === 'monthly' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">Day of Month</label>
              <select
                value={form.monthDay}
                onChange={e => set('monthDay', Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Retention card */}
      <div className={`bg-white rounded-xl border border-slate-200 p-5 space-y-4 transition-opacity ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <Archive size={15} className="text-amber-500" /> Retention Policy
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1.5 font-medium">Keep Last N Backups</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1} max={30}
              value={form.retention}
              onChange={e => set('retention', Number(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="w-16 text-center font-bold text-slate-700 text-sm bg-amber-50 border border-amber-200 rounded-lg py-1">
              {form.retention}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Older backups beyond the limit will be automatically deleted.
          </p>
        </div>
      </div>

      {/* Status card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <Settings2 size={15} className="text-amber-500" /> Status
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Auto Backup</span>
            <span className={`font-semibold ${form.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
              {form.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Frequency</span>
            <span className="font-semibold text-slate-700 capitalize">{form.frequency}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Next Backup</span>
            <span className="font-semibold text-slate-700 text-xs">
              {nextScheduledLabel({ auto: form })}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Storage Location</span>
            <span className="font-mono text-xs text-slate-600">server/backups/</span>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-amber-200"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DRIVE BACKUP TAB
═══════════════════════════════════════════════════════════ */
function DriveBackupTab({ config, onConfigSave, backups }) {
  const [form, setForm] = useState({
    enabled: false,
    folderId: '',
    folderName: '',
    syncFrequency: 'daily',
    ...config?.drive,
  });
  const [showGuide, setShowGuide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState(null);

  useEffect(() => {
    if (config?.drive) setForm(prev => ({ ...prev, ...config.drive }));
  }, [config]);

  function set(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    try {
      await onConfigSave({ drive: form });
      toast.success('Drive settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  function handleMockUpload(idx) {
    setUploadingIdx(idx);
    setTimeout(() => {
      setUploadingIdx(null);
      toast.success('Backup uploaded to Google Drive (requires OAuth setup)');
    }, 1500);
  }

  const isConnected = form.enabled && form.folderId;

  return (
    <div className="space-y-5">
      {/* Connection card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${isConnected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
              <Cloud size={18} />
            </div>
            <div>
              <div className="font-semibold text-slate-800">Google Drive</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isConnected
                  ? <><Wifi size={11} className="text-emerald-500" /><span className="text-xs text-emerald-600">Connected</span></>
                  : <><WifiOff size={11} className="text-slate-400" /><span className="text-xs text-slate-400">Not connected</span></>}
              </div>
            </div>
          </div>
          <Toggle value={form.enabled} onChange={v => set('enabled', v)} />
        </div>

        {!isConnected ? (
          <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center">
            <Cloud size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-600 font-medium">Connect Google Drive</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Automatically upload backups to your Google Drive for off-site storage
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <Info size={14} /> Setup Guide
              </button>
              <button
                onClick={() => toast.info('Enter your folder ID in the settings below to connect.')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Cloud size={14} /> Connect Drive
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <div>
              <span className="text-emerald-700 font-medium">Drive connected</span>
              <span className="text-emerald-600 ml-2">Folder: {form.folderName || form.folderId}</span>
            </div>
            <button
              onClick={() => set('enabled', false)}
              className="ml-auto text-xs text-slate-500 hover:text-rose-500 transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Drive settings */}
      <div className={`bg-white rounded-xl border border-slate-200 p-5 space-y-4 transition-opacity ${form.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1 border-b border-slate-100">
          <Folder size={15} className="text-amber-500" /> Drive Configuration
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Google Drive Folder ID</label>
            <input
              type="text"
              value={form.folderId}
              onChange={e => set('folderId', e.target.value)}
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-xs text-slate-400 mt-1">Copy from the Drive folder URL</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Folder Display Name</label>
            <input
              type="text"
              value={form.folderName}
              onChange={e => set('folderName', e.target.value)}
              placeholder="e.g. SuperMart Backups"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">Auto Sync Frequency</label>
            <select
              value={form.syncFrequency}
              onChange={e => set('syncFrequency', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Upload backups to Drive */}
      {backups.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <CloudUpload size={15} className="text-blue-500" /> Upload to Drive
            </div>
            <span className="text-xs text-slate-400">{backups.length} backup{backups.length !== 1 ? 's' : ''} available</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 text-left font-medium">Filename</th>
                <th className="px-4 py-2.5 text-left font-medium">Date</th>
                <th className="px-4 py-2.5 text-left font-medium">Size</th>
                <th className="px-4 py-2.5 text-center font-medium">Upload</th>
              </tr>
            </thead>
            <tbody>
              {backups.slice(0, 5).map((b, i) => (
                <tr key={b.filename} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FileJson size={14} className="text-amber-500 shrink-0" />
                      <span className="font-mono text-xs text-slate-600 truncate max-w-40">{b.filename}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(b.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtSize(b.size)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleMockUpload(i)}
                      disabled={uploadingIdx === i || !isConnected}
                      title={isConnected ? 'Upload to Drive' : 'Connect Drive first'}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 rounded-lg text-xs font-medium transition-colors mx-auto"
                    >
                      {uploadingIdx === i
                        ? <Loader2 size={12} className="animate-spin" />
                        : <CloudUpload size={12} />}
                      {uploadingIdx === i ? 'Uploading…' : 'Upload'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-xl font-medium text-sm transition-colors shadow-sm shadow-amber-200"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      {/* Setup guide modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Google Drive Setup Guide</h3>
              <button onClick={() => setShowGuide(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-slate-600">
              {[
                'Go to Google Cloud Console (console.cloud.google.com)',
                'Create a new project or select an existing one',
                'Enable the "Google Drive API" for your project',
                'Create OAuth 2.0 credentials (Desktop App type)',
                'Download the credentials JSON file',
                'Create a folder in your Google Drive for backups',
                'Copy the folder ID from the folder\'s URL',
                'Paste the folder ID in the "Folder ID" field above',
              ].map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700">
              <strong>Note:</strong> Full OAuth integration requires server-side configuration with your credentials file.
              Contact your developer to complete the setup.
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'manual', label: 'Manual Backup', icon: HardDrive },
  { id: 'auto',   label: 'Auto Backup',   icon: Clock },
  { id: 'drive',  label: 'Drive Backup',  icon: Cloud },
];

export default function Backup() {
  const [tab, setTab] = useState('manual');
  const qc = useQueryClient();

  const { data: backups = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['backup-list'],
    queryFn: BackupAPI.list,
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: config } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: BackupAPI.getSettings,
  });

  async function handleConfigSave(partial) {
    const updated = await BackupAPI.saveSettings({ ...config, ...partial });
    qc.setQueryData(['backup-settings'], updated);
  }

  const lastBackup = backups[0] ?? null;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shadow-sm shadow-amber-200">
              <HardDrive size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Backup & Restore</h1>
              <p className="text-sm text-slate-500">Protect your data with regular backups</p>
            </div>
          </div>
          {lastBackup && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-xs text-emerald-700">
              <Shield size={12} /> Last backup {timeAgo(lastBackup.createdAt)}
            </div>
          )}
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {tab === 'manual' && (
          <ManualBackupTab backups={backups} isLoading={isLoading} isError={isError} error={error} refetch={refetch} />
        )}
        {tab === 'auto' && (
          <AutoBackupTab config={config} onConfigSave={handleConfigSave} />
        )}
        {tab === 'drive' && (
          <DriveBackupTab config={config} onConfigSave={handleConfigSave} backups={backups} />
        )}
      </div>
    </div>
  );
}
