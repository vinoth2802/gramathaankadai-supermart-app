import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus, Pencil, Trash2, X, Check, GripVertical,
  CreditCard, Building2, Banknote, Smartphone, FileText, Wallet,
  Gift, Coins, RefreshCw, Star, Store, QrCode,
  ExternalLink, ShoppingCart, Receipt, ShoppingBag,
  HandCoins, ArrowUpToLine, TrendingDown, ChevronRight, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import http from '@lib/api';
import ConfirmDialog from '@components/ConfirmDialog';

/* ── Constants ──────────────────────────────────────────────── */
const ICON_MAP = {
  CreditCard, Building2, Banknote, Smartphone, FileText, Wallet,
  Gift, Coins, RefreshCw, Star, Store, QrCode,
};
const ICON_OPTIONS = [
  { key: 'CreditCard', label: 'Card'   }, { key: 'Building2',  label: 'Bank'    },
  { key: 'Banknote',   label: 'Cash'   }, { key: 'Smartphone', label: 'UPI'     },
  { key: 'FileText',   label: 'Cheque' }, { key: 'Wallet',     label: 'Wallet'  },
  { key: 'Gift',       label: 'Voucher'}, { key: 'Coins',      label: 'Money'   },
  { key: 'RefreshCw',  label: 'Transfer'},{ key: 'Star',       label: 'Points'  },
  { key: 'Store',      label: 'Store'  }, { key: 'QrCode',     label: 'Mobile'  },
];
const COLOR_OPTIONS = ['blue','green','purple','orange','red','gray'];
const COLOR_SWATCH  = { blue:'bg-blue-500', green:'bg-green-500', purple:'bg-purple-500', orange:'bg-orange-500', red:'bg-red-500', gray:'bg-gray-400' };
const COLOR_ICON    = { blue:'bg-blue-100 text-blue-600', green:'bg-green-100 text-green-600', purple:'bg-purple-100 text-purple-600', orange:'bg-orange-100 text-orange-600', red:'bg-red-100 text-red-600', gray:'bg-gray-100 text-gray-500' };

const BLANK = { name:'', description:'', color:'blue', icon:'CreditCard', isActive:true };

const USED_IN = [
  { icon: ShoppingCart,  label: 'POS Sale'     },
  { icon: Receipt,       label: 'Sales'         },
  { icon: ShoppingBag,   label: 'Purchase'      },
  { icon: HandCoins,     label: 'Payment In'    },
  { icon: ArrowUpToLine, label: 'Payment Out'   },
  { icon: TrendingDown,  label: 'Loan Accounts' },
];

/* ── API ────────────────────────────────────────────────────── */
const api = {
  list:    ()           => http.get('/payment-types'),
  create:  (data)       => http.post('/payment-types', data),
  update:  (id, data)   => http.put(`/payment-types/${id}`, data),
  remove:  (id)         => http.delete(`/payment-types/${id}`),
  reorder: (orderedIds) => http.put('/payment-types/reorder', { orderedIds }),
};

/* ── Toggle ─────────────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={onChange} disabled={disabled}
      className={`relative w-8 h-4 rounded-full transition-colors shrink-0
        ${checked ? 'bg-blue-500' : 'bg-gray-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform
        ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  );
}

/* ── LEFT panel: draggable inactive mode row ────────────────── */
function DraggableRow({ type, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, isDragging } =
    useDraggable({ id: `left-${type.id}`, data: { type: 'left-mode', modeId: type.id } });
  const Icon = ICON_MAP[type.icon] || CreditCard;

  return (
    <div ref={setNodeRef}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition select-none
        ${isDragging ? 'opacity-40' : 'border-gray-200 bg-white hover:border-blue-200 hover:shadow-sm cursor-grab active:cursor-grabbing'}`}
      {...attributes} {...listeners}>

      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[type.color] || COLOR_ICON.gray}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{type.name}</p>
        {type.description && <p className="text-[11px] text-gray-400 truncate">{type.description}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0" onPointerDown={e => e.stopPropagation()}>
        <button onClick={onEdit}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
          <Pencil size={12} />
        </button>
        {!type.isDefault && (
          <button onClick={onDelete}
            className="p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <GripVertical size={14} className="text-gray-300 shrink-0 pointer-events-none" />
    </div>
  );
}

/* ── RIGHT panel: sortable active row ───────────────────────── */
function SortableActiveRow({ id, name, icon, color, isDefault, isBank, accountNo, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon  = isBank ? Building2 : (ICON_MAP[icon] || CreditCard);
  const cKey  = color || (isBank ? 'gray' : 'gray');

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition
        ${isDragging ? 'shadow-xl border-blue-300 bg-blue-50 opacity-90 z-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>

      <button className="text-gray-300 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none shrink-0"
        {...attributes} {...listeners}>
        <GripVertical size={14} />
      </button>

      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[cKey]}`}>
        <Icon size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-800">{name}</span>
          {isDefault && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 uppercase tracking-wide">Default</span>}
          {isBank    && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 uppercase tracking-wide">Bank</span>}
        </div>
        {isBank && accountNo && <p className="text-[11px] text-gray-400">Acc: {accountNo}</p>}
      </div>

      {!isDefault ? (
        <button onClick={onRemove}
          className="p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition shrink-0">
          <X size={14} />
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
    </div>
  );
}

/* ── Drag overlay card (shown while dragging from left) ─────── */
function DragCard({ type }) {
  const Icon = ICON_MAP[type?.icon] || CreditCard;
  const cKey = type?.color || 'blue';
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-blue-300 bg-white shadow-2xl w-56 opacity-95">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[cKey]}`}>
        <Icon size={15} />
      </div>
      <span className="text-sm font-semibold text-gray-800 flex-1">{type?.name}</span>
      <ArrowRight size={14} className="text-blue-400 shrink-0" />
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
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-5 overflow-y-auto flex-1">{children}</div>
        <div className="px-6 py-4 border-t flex gap-3 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onSave} disabled={saving}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40 transition">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function FormBody({ form, setF, isDefault }) {
  return (
    <>
      <Field label="Payment Type Name *">
        <input value={form.name} onChange={e => setF({ name: e.target.value })} disabled={isDefault}
          placeholder="e.g. Google Pay" autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
      </Field>
      <Field label="Description">
        <textarea value={form.description} onChange={e => setF({ description: e.target.value })}
          placeholder="Brief description…" rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-500" />
      </Field>
      <Field label="Icon Color">
        <div className="flex gap-2">
          {COLOR_OPTIONS.map(c => (
            <button key={c} type="button" onClick={() => setF({ color: c })}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${COLOR_SWATCH[c]} ring-2 ring-offset-1 transition
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
              <button key={key} type="button" title={label} onClick={() => setF({ icon: key })}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition
                  ${sel ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-300 text-gray-500'}`}>
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

/* ── Dropdown preview — permanently expanded list ────────────── */
function PreviewSelect({ items }) {
  const [selected, setSelected] = useState(items[0]?.id ?? null);

  useEffect(() => {
    if (selected && !items.find(i => i.id === selected)) setSelected(items[0]?.id ?? null);
  }, [items, selected]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm divide-y divide-gray-50">
      {items.map((item) => {
        const Icon = item.isBank ? Building2 : (ICON_MAP[item.icon] || CreditCard);
        const isSel = item.id === selected;
        return (
          <button key={item.id} type="button"
            onClick={() => setSelected(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition
              ${isSel ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
              ${isSel ? 'bg-blue-100 text-blue-600' : COLOR_ICON[item.color || 'gray']}`}>
              <Icon size={12} />
            </div>
            <span className={`text-sm flex-1 ${isSel ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
              {item.name}
            </span>
            {isSel && <Check size={13} className="text-blue-500 shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Right panel drop zone wrapper ──────────────────────────── */
function RightDropZone({ children, isOver }) {
  const { setNodeRef } = useDroppable({ id: 'right-zone' });
  return (
    <div ref={setNodeRef}
      className={`min-h-[60px] transition-colors rounded-xl ${isOver ? 'bg-blue-50 ring-2 ring-blue-300 ring-dashed' : ''}`}>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ */
export default function PaymentTypes() {
  const qc = useQueryClient();

  const { data: types = [], isLoading } = useQuery({ queryKey: ['paymentTypes'], queryFn: api.list });
  const { data: banks = [] }            = useQuery({ queryKey: ['bankAccounts'], queryFn: () => http.get('/accounts/bank') });

  const [showAdd,       setShowAdd]       = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [form,          setForm]          = useState(BLANK);
  const [rightOrder,    setRightOrder]    = useState(null);
  const [activeLeft,    setActiveLeft]    = useState(null);
  const [overRight,     setOverRight]     = useState(false);
  const [excludedBanks, setExcludedBanks] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pt_excluded_banks') || '[]')); }
    catch { return new Set(); }
  });

  /* sensors — only pointer (no keyboard for cross-panel DnD) */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  /* ── Derived ── */
  const cashMode     = types.find(t => t.name.trim().toLowerCase() === 'cash');
  const nonCashTypes = types.filter(t => t.name.trim().toLowerCase() !== 'cash');
  const activeModes  = nonCashTypes.filter(t => t.isActive);
  const inactiveModes = nonCashTypes.filter(t => !t.isActive);

  /* right panel: Cash always first (pinned), then visible bank accounts, then other active modes */
  const seen = new Set();
  const rightItems = [];
  if (cashMode) {
    seen.add('cash');
    rightItems.push({ id: `mode-${cashMode.id}`, name: cashMode.name, icon: cashMode.icon, color: cashMode.color, isDefault: true, isBank: false, modeId: cashMode.id });
  }
  banks.filter(b => !excludedBanks.has(b.id)).forEach(b => {
    const k = b.bankName.trim().toLowerCase();
    if (!seen.has(k)) { seen.add(k); rightItems.push({ id: `bank-${b.id}`, name: b.bankName, icon: 'Building2', color: 'gray', isDefault: false, isBank: true, accountNo: b.accountNo, bankId: b.id }); }
  });
  activeModes.forEach(m => {
    const k = m.name.trim().toLowerCase();
    if (!seen.has(k)) { seen.add(k); rightItems.push({ id: `mode-${m.id}`, name: m.name, icon: m.icon, color: m.color, isDefault: false, isBank: false, modeId: m.id }); }
  });

  /* apply local sort order to right panel */
  const orderedRight = rightOrder
    ? rightOrder.map(id => rightItems.find(r => r.id === id)).filter(Boolean)
    : rightItems;

  /* ── Mutations ── */
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['paymentTypes'] });
    qc.invalidateQueries({ queryKey: ['paymentOptions'] });
    qc.invalidateQueries({ queryKey: ['bankAccounts'] });
  };

  const createMut  = useMutation({ mutationFn: api.create,  onSuccess: () => { invalidate(); setShowAdd(false); setForm(BLANK); toast.success('Payment type added'); }, onError: e => toast.error(e.message || 'Failed') });
  const updateMut  = useMutation({ mutationFn: ({ id, data }) => api.update(id, data), onSuccess: () => { invalidate(); setEditTarget(null); toast.success('Updated'); }, onError: e => toast.error(e.message || 'Failed') });
  const deleteMut  = useMutation({ mutationFn: api.remove,  onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Deleted'); }, onError: e => toast.error(e.message || 'Failed') });
  const reorderMut = useMutation({ mutationFn: api.reorder, onSuccess: () => invalidate() });

  const openEdit = (type) => {
    setForm({ name: type.name, description: type.description || '', color: type.color || 'blue', icon: type.icon || 'CreditCard', isActive: type.isActive });
    setEditTarget(type);
  };

  /* ── DnD handlers ── */
  const handleDragStart = useCallback(({ active }) => {
    if (String(active.id).startsWith('left-')) {
      const modeId = Number(String(active.id).replace('left-', ''));
      const found  = inactiveModes.find(t => t.id === modeId);
      setActiveLeft(found || null);
    }
  }, [inactiveModes]);

  const handleDragOver = useCallback(({ over }) => {
    if (!over) { setOverRight(false); return; }
    const overId = String(over.id);
    setOverRight(overId === 'right-zone' || overId.startsWith('mode-') || overId.startsWith('bank-'));
  }, []);

  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveLeft(null);
    setOverRight(false);
    if (!over) return;

    const activeId = String(active.id);
    const overId   = String(over.id);

    /* ── Drag from left to right → activate payment mode ── */
    if (activeId.startsWith('left-')) {
      const isOverRight = overId === 'right-zone' || overId.startsWith('mode-') || overId.startsWith('bank-');
      if (!isOverRight) return;
      const modeId = Number(activeId.replace('left-', ''));
      updateMut.mutate({ id: modeId, data: { isActive: true } });
      return;
    }

    /* ── Reorder within right panel ── */
    if ((activeId.startsWith('mode-') || activeId.startsWith('bank-')) &&
        (overId.startsWith('mode-')   || overId.startsWith('bank-'))) {
      if (activeId === overId) return;
      const ids    = orderedRight.map(r => r.id);
      const newIds = arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
      setRightOrder(newIds);
      /* persist order for payment modes only */
      const modeIds = newIds
        .filter(id => id.startsWith('mode-'))
        .map(id => Number(id.replace('mode-', '')));
      if (modeIds.length) reorderMut.mutate(modeIds);
    }
  }, [orderedRight, updateMut, reorderMut]);

  /* remove from right (deactivate) */
  const handleRemove = (item) => {
    if (item.isBank) {
      setExcludedBanks(prev => {
        const next = new Set(prev);
        next.add(item.bankId);
        localStorage.setItem('pt_excluded_banks', JSON.stringify([...next]));
        return next;
      });
      return;
    }
    updateMut.mutate({ id: item.modeId, data: { isActive: false } });
  };

  const handleAddBank = (bankId) => {
    setExcludedBanks(prev => {
      const next = new Set(prev);
      next.delete(bankId);
      localStorage.setItem('pt_excluded_banks', JSON.stringify([...next]));
      return next;
    });
  };

  /* add via button click */
  const handleAdd = (type) => {
    updateMut.mutate({ id: type.id, data: { isActive: true } });
  };

  const setF = (patch) => setForm(f => ({ ...f, ...patch }));

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="p-6">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-lg font-bold text-gray-800">Payment Types</h1>
          <p className="text-xs text-gray-500 mt-0.5">Drag methods from left to add to the dropdown. Drag within right panel to reorder.</p>
        </div>

        {/* Two-column layout */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}>

          <div className="grid grid-cols-12 gap-5 items-stretch">

            {/* ══ LEFT PANEL ══ */}
            <div className="col-span-5">

              {/* Single combined card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Available Payment Methods</h2>
                    <p className="text-[11px] text-gray-400">Drag to right panel or click + to add to dropdown</p>
                  </div>
                  <button onClick={() => { setForm(BLANK); setShowAdd(true); }}
                    className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    <Plus size={12} /> Add
                  </button>
                </div>

                {/* ── Cash — pinned default ── */}
                {cashMode && (() => {
                  const Icon = ICON_MAP[cashMode.icon] || Banknote;
                  return (
                    <div className="px-4 pt-3 pb-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide block mb-2">Default</span>
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-200 bg-amber-50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[cashMode.color] || COLOR_ICON.green}`}>
                          <Icon size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-800">{cashMode.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800 uppercase">Default</span>
                          </div>
                          <p className="text-[11px] text-gray-400">Always in dropdown · Cannot be removed</p>
                        </div>
                        <button onClick={() => openEdit(cashMode)}
                          className="p-1 rounded-lg hover:bg-amber-100 text-amber-400 hover:text-amber-600 transition shrink-0">
                          <Pencil size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Other Payment Modes ── */}
                <div className="px-4 pt-1 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Other Payment Modes</span>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="text-green-600 font-semibold">{activeModes.length} active</span>
                      {inactiveModes.length > 0 && <span>· {inactiveModes.length} inactive</span>}
                    </div>
                  </div>

                  {isLoading ? (
                    <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
                  ) : nonCashTypes.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No other payment modes</p>
                  ) : (
                    <div className="space-y-1.5">
                      {/* Inactive — draggable */}
                      {inactiveModes.map(type => (
                        <div key={type.id} className="relative group">
                          <DraggableRow
                            type={type}
                            onEdit={() => openEdit(type)}
                            onDelete={() => setDeleteTarget(type)}
                          />
                          <button
                            onClick={() => handleAdd(type)}
                            title="Add to dropdown"
                            className="absolute right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100
                              bg-blue-500 hover:bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center transition">
                            <Plus size={11} />
                          </button>
                        </div>
                      ))}
                      {/* Active — muted with checkmark */}
                      {activeModes.map(type => {
                        const Icon = ICON_MAP[type.icon] || CreditCard;
                        return (
                          <div key={type.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 bg-gray-50 opacity-50 select-none">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${COLOR_ICON[type.color] || COLOR_ICON.gray}`}>
                              <Icon size={13} />
                            </div>
                            <span className="text-sm text-gray-500 flex-1">{type.name}</span>
                            <Check size={13} className="text-green-500 shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Bank Accounts section ── */}
                <div className="border-t border-gray-100 px-4 pt-3 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Bank Accounts</span>
                    <Link to="/accounts/bank"
                      className="flex items-center gap-0.5 text-blue-600 hover:text-blue-700 text-[10px] font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition">
                      Manage <ExternalLink size={10} />
                    </Link>
                  </div>
                  {banks.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-400">No bank accounts added</p>
                      <Link to="/accounts/bank" className="text-xs text-blue-500 hover:underline mt-1 inline-flex items-center gap-0.5">
                        Add bank account <ChevronRight size={11} />
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {banks.map(b => {
                        const isExcluded = excludedBanks.has(b.id);
                        return (
                          <div key={b.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition
                            ${isExcluded ? 'border-dashed border-gray-200 bg-white' : 'border-gray-100 bg-indigo-50/40'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                              ${isExcluded ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-600'}`}>
                              <Building2 size={15} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${isExcluded ? 'text-gray-400' : 'text-gray-700'}`}>{b.bankName}</p>
                              <p className="text-[11px] text-gray-400">{b.accountNo ? `Acc: ${b.accountNo}` : b.type}</p>
                            </div>
                            {isExcluded ? (
                              <button onClick={() => handleAddBank(b.id)} title="Add back to dropdown"
                                className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition">
                                <Plus size={11} /> Add
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 uppercase">Active</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ══ RIGHT PANEL ══ */}
            <div className="col-span-7 flex flex-col gap-4">

              {/* Used-in */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h2 className="text-sm font-bold text-gray-800 mb-1">Payment Dropdown</h2>
                <p className="text-[11px] text-gray-400 mb-3">These payment options appear in:</p>
                <div className="flex flex-wrap gap-2">
                  {USED_IN.map(({ icon: Icon, label }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg">
                      <Icon size={11} /> {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Drop zone + sortable list */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col flex-1">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800">Active in Dropdown</h2>
                    <p className="text-[11px] text-gray-400">Drag from left to add · Drag here to reorder · × to remove</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {orderedRight.length} method{orderedRight.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto">
                  <RightDropZone isOver={overRight}>
                    {orderedRight.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                        <ArrowRight size={24} className="mb-2 opacity-30" />
                        <p className="text-sm">Drag payment methods here</p>
                        <p className="text-xs mt-1">or click the + button on a method</p>
                      </div>
                    ) : (
                      <SortableContext
                        items={orderedRight.map(r => r.id)}
                        strategy={verticalListSortingStrategy}>
                        <div className="space-y-1.5">
                          {orderedRight.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <span className="w-5 text-center text-xs font-bold text-gray-300 shrink-0">{idx + 1}</span>
                              <div className="flex-1">
                                <SortableActiveRow
                                  {...item}
                                  onRemove={() => handleRemove(item)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    )}
                  </RightDropZone>
                </div>

                {/* Dropdown Preview */}
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Dropdown Preview</p>
                    <span className="text-[10px] text-gray-400">{orderedRight.length} option{orderedRight.length !== 1 ? 's' : ''}</span>
                  </div>
                  {orderedRight.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-3">No options configured yet</p>
                  ) : (
                    <PreviewSelect items={orderedRight} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Drag overlay — shown while dragging from left */}
          <DragOverlay dropAnimation={null}>
            {activeLeft ? <DragCard type={activeLeft} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {showAdd && (
        <Modal title="Add Payment Type" onClose={() => setShowAdd(false)}
          onSave={() => createMut.mutate(form)} saving={createMut.isPending}>
          <FormBody form={form} setF={setF} isDefault={false} />
        </Modal>
      )}
      {editTarget && (
        <Modal title="Edit Payment Type" onClose={() => setEditTarget(null)}
          onSave={() => updateMut.mutate({ id: editTarget.id, data: form })} saving={updateMut.isPending}>
          <FormBody form={form} setF={setF} isDefault={editTarget.isDefault} />
        </Modal>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Payment Type"
        message={`Remove "${deleteTarget?.name}" from all payment options?`}
        confirmLabel="Delete"
        onConfirm={() => deleteMut.mutate(deleteTarget.id)}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
