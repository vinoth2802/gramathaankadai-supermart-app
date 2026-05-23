import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Settings, Search, Pencil, Trash2, X, Check,
  CreditCard, Building2, Banknote, Smartphone, FileText, Wallet,
  Gift, Coins, RefreshCw, Star, Store, QrCode,
  GripVertical, PauseCircle, CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '../../api/client.js';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';

/* ── Constants ──────────────────────────────────────────────── */
const ICON_MAP = {
  CreditCard, Building2, Banknote, Smartphone, FileText, Wallet,
  Gift, Coins, RefreshCw, Star, Store, QrCode,
};
const ICON_OPTIONS = [
  { key: 'CreditCard', label: 'Card' },
  { key: 'Building2',  label: 'Bank' },
  { key: 'Banknote',   label: 'Cash' },
  { key: 'Smartphone', label: 'UPI' },
  { key: 'FileText',   label: 'Cheque' },
  { key: 'Wallet',     label: 'Wallet' },
  { key: 'Gift',       label: 'Voucher' },
  { key: 'Coins',      label: 'Money' },
  { key: 'RefreshCw',  label: 'Transfer' },
  { key: 'Star',       label: 'Points' },
  { key: 'Store',      label: 'Store Credit' },
  { key: 'QrCode',     label: 'Mobile' },
];
const COLOR_OPTIONS = ['blue', 'green', 'purple', 'orange', 'red', 'gray'];
const COLOR_SWATCH = {
  blue:   'bg-blue-500',
  green:  'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
  gray:   'bg-gray-400',
};
const COLOR_ICON = {
  blue:   'bg-blue-100   text-blue-600',
  green:  'bg-green-100  text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  red:    'bg-red-100    text-red-600',
  gray:   'bg-gray-100   text-gray-600',
};

const BLANK = { name: '', description: '', color: 'blue', icon: 'CreditCard', isActive: true };

/* ── API helpers ────────────────────────────────────────────── */
const api = {
  list:    ()           => http.get('/payment-types'),
  create:  (data)       => http.post('/payment-types', data),
  update:  (id, data)   => http.put(`/payment-types/${id}`, data),
  remove:  (id)         => http.delete(`/payment-types/${id}`),
  reorder: (orderedIds) => http.put('/payment-types/reorder', { orderedIds }),
};

/* ── Toggle switch ──────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button" onClick={onChange} disabled={disabled}
      className={`relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0
        ${checked ? 'bg-blue-500' : 'bg-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200
        ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

/* ── Sortable payment type card ─────────────────────────────── */
function SortableCard({ type, onToggle, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: type.id });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon  = ICON_MAP[type.icon] || CreditCard;

  return (
    <div ref={setNodeRef} style={style}
      className={`bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3
        hover:shadow-sm transition-shadow ${isDragging ? 'shadow-lg opacity-80 z-50' : ''}`}>

      {/* Drag handle */}
      <button
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes} {...listeners}>
        <GripVertical size={16} />
      </button>

      {/* Icon */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[type.color] || COLOR_ICON.gray}`}>
        <Icon size={18} />
      </div>

      {/* Name + desc + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-800">{type.name}</span>
          {type.isDefault && (
            <span className="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Default
            </span>
          )}
          {!type.isActive && (
            <span className="bg-red-100 text-red-500 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Inactive
            </span>
          )}
        </div>
        {type.description && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{type.description}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Toggle checked={type.isActive} onChange={() => onToggle(type)} />
        <button onClick={() => onEdit(type)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
          <Pencil size={14} />
        </button>
        {!type.isDefault && (
          <button onClick={() => onDelete(type)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Modal ──────────────────────────────────────────────────── */
function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onSave} disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Form fields ────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function FormBody({ form, setF, isDefault }) {
  return (
    <>
      <Field label="Payment Type Name *">
        <input
          value={form.name}
          onChange={e => setF({ name: e.target.value })}
          disabled={isDefault}
          placeholder="e.g. Google Pay"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm
                     focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
        />
      </Field>

      <Field label="Description">
        <textarea
          value={form.description}
          onChange={e => setF({ description: e.target.value })}
          placeholder="Brief description…"
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none
                     focus:outline-none focus:border-blue-500"
        />
      </Field>

      <Field label="Icon Color">
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button
              key={c} type="button"
              onClick={() => setF({ color: c })}
              className={`w-7 h-7 rounded-full flex items-center justify-center
                ${COLOR_SWATCH[c]} transition ring-2 ring-offset-1
                ${form.color === c ? 'ring-gray-700' : 'ring-transparent hover:ring-gray-300'}`}>
              {form.color === c && <Check size={12} className="text-white" />}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Payment Icon">
        <div className="grid grid-cols-6 gap-2">
          {ICON_OPTIONS.map(({ key, label }) => {
            const Ico = ICON_MAP[key];
            const sel = form.icon === key;
            return (
              <button
                key={key} type="button"
                title={label}
                onClick={() => setF({ icon: key })}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition
                  ${sel
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}>
                <Ico size={16} />
                <span className="text-[9px] leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Status">
        <div className="flex items-center gap-3">
          <Toggle checked={form.isActive} onChange={() => setF({ isActive: !form.isActive })} />
          <span className="text-sm text-gray-600">{form.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      </Field>
    </>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function PaymentTypes() {
  const qc = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['paymentTypes'],
    queryFn:  api.list,
  });

  const [search,       setSearch]       = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [showAdd,      setShowAdd]      = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form,         setForm]         = useState(BLANK);
  const [localOrder,   setLocalOrder]   = useState(null);

  const orderedTypes = localOrder
    ? localOrder.map(id => types.find(t => t.id === id)).filter(Boolean)
    : types;

  /* ── Sensors ── */
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /* ── Derived lists ── */
  const filtered = orderedTypes.filter(t => {
    if (!showInactive && !t.isActive) return false;
    if (search) return t.name.toLowerCase().includes(search.toLowerCase());
    return true;
  });

  const total    = types.length;
  const active   = types.filter(t => t.isActive).length;
  const inactive = types.filter(t => !t.isActive).length;

  /* ── Mutations ── */
  const createMut = useMutation({
    mutationFn: (data) => api.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paymentTypes'] });
      setShowAdd(false);
      setForm(BLANK);
      toast.success('Payment type added');
    },
    onError: (e) => toast.error(e.message || e.error || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => api.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paymentTypes'] });
      setEditTarget(null);
      toast.success('Payment type updated');
    },
    onError: (e) => toast.error(e.message || e.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paymentTypes'] });
      setDeleteTarget(null);
      toast.success('Payment type deleted');
    },
    onError: (e) => toast.error(e.message || e.error || 'Failed'),
  });

  const reorderMut = useMutation({
    mutationFn: (orderedIds) => api.reorder(orderedIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paymentTypes'] }),
  });

  /* ── Handlers ── */
  const handleToggle = (type) => {
    updateMut.mutate({ id: type.id, data: { isActive: !type.isActive } });
  };

  const openEdit = (type) => {
    setForm({
      name:        type.name,
      description: type.description || '',
      color:       type.color || 'blue',
      icon:        type.icon  || 'CreditCard',
      isActive:    type.isActive,
    });
    setEditTarget(type);
  };

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIds = (localOrder || types.map(t => t.id));
    const oldIdx = oldIds.indexOf(active.id);
    const newIdx = oldIds.indexOf(over.id);
    const newIds = arrayMove(oldIds, oldIdx, newIdx);
    setLocalOrder(newIds);
    reorderMut.mutate(newIds);
  }, [localOrder, types, reorderMut]);

  const setF = (patch) => setForm(f => ({ ...f, ...patch }));

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="h-full overflow-y-auto">
    <div className="p-6 max-w-3xl mx-auto">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-gray-800">Payment Types</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setForm(BLANK); setShowAdd(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            <Plus size={15} /> Add Payment Type
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <CreditCard size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Payment Types</p>
            <p className="text-xl font-bold text-gray-800">{total}</p>
            <p className="text-xs text-gray-400 mt-0.5">All configured payment methods</p>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Types</p>
            <p className="text-xl font-bold text-gray-800">{active}</p>
            <p className="text-xs text-gray-400 mt-0.5">Currently enabled methods</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
            <PauseCircle size={16} className="text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Inactive Types</p>
            <p className="text-xl font-bold text-gray-800">{inactive}</p>
            <p className="text-xs text-gray-400 mt-0.5">Disabled payment methods</p>
          </div>
        </div>
      </div>

      {/* ── List header ── */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <h2 className="text-sm font-bold text-gray-700 shrink-0">Payment Methods</h2>
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search payment types…"
              className="border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs
                         focus:outline-none focus:border-blue-400 w-52"
            />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
            <Toggle checked={showInactive} onChange={() => setShowInactive(s => !s)} />
            Show Inactive
          </label>
        </div>
      </div>

      {/* ── Sortable list ── */}
      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No payment types found</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={filtered.map(t => t.id)}
            strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {filtered.map(type => (
                <SortableCard
                  key={type.id}
                  type={type}
                  onToggle={handleToggle}
                  onEdit={openEdit}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* ── Add Modal ── */}
      {showAdd && (
        <Modal
          title="Add Payment Type"
          onClose={() => setShowAdd(false)}
          onSave={() => createMut.mutate(form)}
          saving={createMut.isPending}>
          <FormBody form={form} setF={setF} isDefault={false} />
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <Modal
          title="Edit Payment Type"
          onClose={() => setEditTarget(null)}
          onSave={() => updateMut.mutate({ id: editTarget.id, data: form })}
          saving={updateMut.isPending}>
          <FormBody form={form} setF={setF} isDefault={editTarget.isDefault} />
        </Modal>
      )}

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Payment Type"
        message={`This will remove "${deleteTarget?.name}" from all payment options.`}
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
    </div>
  );
}
