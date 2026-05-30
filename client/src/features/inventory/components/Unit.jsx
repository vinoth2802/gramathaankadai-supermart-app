import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MoreVertical, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { UnitsAPI } from '@features/inventory/resources/inventory-service';

export default function UnitTab() {
  const qc = useQueryClient();
  const { data: units = [], isLoading } = useQuery({ queryKey: ['units'], queryFn: UnitsAPI.getAll });

  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [rightPanel, setRightPanel] = useState('conversions'); // 'conversions' | 'new' | 'edit'
  const [rowMenu, setRowMenu] = useState(null);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Unit form state
  const [unitFullName, setUnitFullName] = useState('');
  const [unitShortName, setUnitShortName] = useState('');
  const [editUnitId, setEditUnitId] = useState(null);

  // Conversion modal state
  const [convModal, setConvModal] = useState(false);
  const [convBaseId, setConvBaseId] = useState('');
  const [convFactor, setConvFactor] = useState('1');
  const [convSecId, setConvSecId] = useState('');

  const { data: conversions = [] } = useQuery({
    queryKey: ['unit-conversions', selectedUnitId],
    queryFn: () => UnitsAPI.getConversions(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const createUnitMut = useMutation({
    mutationFn: UnitsAPI.create,
    onSuccess: (unit) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setSelectedUnitId(unit.id);
      setRightPanel('conversions');
      resetUnitForm();
      toast.success('Unit created');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to create unit'),
  });

  const updateUnitMut = useMutation({
    mutationFn: ({ id, data }) => UnitsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      setRightPanel('conversions');
      resetUnitForm();
      toast.success('Unit updated');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to update unit'),
  });

  const deleteUnitMut = useMutation({
    mutationFn: UnitsAPI.delete,
    onSuccess: (_, deletedId) => {
      qc.invalidateQueries({ queryKey: ['units'] });
      if (String(selectedUnitId) === String(deletedId)) {
        setSelectedUnitId(null);
        setRightPanel('conversions');
      }
      toast.success('Unit deleted');
    },
    onError: () => toast.error('Failed to delete unit'),
  });

  const createConvMut = useMutation({
    mutationFn: UnitsAPI.createConversion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-conversions', selectedUnitId] });
      toast.success('Conversion added');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to add conversion'),
  });

  const deleteConvMut = useMutation({
    mutationFn: UnitsAPI.deleteConversion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['unit-conversions', selectedUnitId] });
      toast.success('Conversion deleted');
    },
    onError: () => toast.error('Failed to delete conversion'),
  });

  const resetUnitForm = () => {
    setUnitFullName('');
    setUnitShortName('');
    setEditUnitId(null);
  };

  const openNewUnit = () => {
    resetUnitForm();
    setRightPanel('new');
  };

  const openEdit = (unit) => {
    setEditUnitId(unit.id);
    setUnitFullName(unit.descr);
    setUnitShortName(unit.code);
    setRightPanel('edit');
  };

  const saveUnit = (andNew = false) => {
    if (!unitFullName.trim() || !unitShortName.trim()) {
      toast.error('Both Unit Name and Short Name are required');
      return;
    }
    const payload = { fullName: unitFullName.trim(), shortName: unitShortName.trim() };
    if (editUnitId) {
      updateUnitMut.mutate({ id: editUnitId, data: payload });
    } else {
      createUnitMut.mutate(payload, {
        onSuccess: () => {
          if (andNew) { resetUnitForm(); setRightPanel('new'); }
        },
      });
    }
  };

  const openConvModal = () => {
    setConvBaseId(String(selectedUnitId));
    setConvFactor('1');
    setConvSecId(units.find(u => u.id !== selectedUnitId)?.id?.toString() || '');
    setConvModal(true);
  };

  const saveConversion = (andNew = false) => {
    if (!convBaseId || !convSecId) { toast.error('Select both units'); return; }
    if (convBaseId === convSecId) { toast.error('Base and secondary units must differ'); return; }
    createConvMut.mutate(
      { baseUomId: Number(convBaseId), factor: Number(convFactor) || 1, secondaryUomId: Number(convSecId) },
      {
        onSuccess: () => {
          if (!andNew) setConvModal(false);
          else { setConvFactor('1'); setConvSecId(units.find(u => u.id !== selectedUnitId)?.id?.toString() || ''); }
        },
      }
    );
  };

  const selectedUnit = units.find(u => u.id === selectedUnitId) || null;
  const filtered = units.filter(u =>
    !search || u.descr.toLowerCase().includes(search.toLowerCase()) || u.code.toLowerCase().includes(search.toLowerCase())
  );

  const isPending = createUnitMut.isPending || updateUnitMut.isPending;

  return (
    <div className="flex-1 grid grid-cols-7 gap-4 min-h-0">

      {/* ── Left Panel ── */}
      <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Top bar */}
        <div className="border-b border-slate-200 flex items-center gap-2 px-2 py-2">
          <button
            onClick={() => setShowSearch(s => !s)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition shrink-0">
            <Search size={15} />
          </button>
          {showSearch && (
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search units…"
              className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400" />
          )}
          <button
            onClick={openNewUnit}
            className="ml-auto flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition whitespace-nowrap shrink-0">
            <Plus size={13} /> Add Units
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-800 text-white sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600">Full Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border-r border-slate-600 w-24">Short Name</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="text-center py-6 text-slate-400 text-xs">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-slate-400 text-xs">No units found</td></tr>
              ) : filtered.map(u => {
                const isSelected = u.id === selectedUnitId;
                return (
                  <tr
                    key={u.id}
                    onClick={() => { setSelectedUnitId(u.id); setRightPanel('conversions'); }}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'}`}>
                    <td className="px-3 py-2 text-xs font-semibold text-slate-800 border-r border-slate-100">{u.descr}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 border-r border-slate-100">{u.code}</td>
                    <td className="px-2 py-2 text-center relative" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => { e.stopPropagation(); setRowMenu(rowMenu === u.id ? null : u.id); }}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreVertical size={13} />
                      </button>
                      {rowMenu === u.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setRowMenu(null)} />
                          <div className="absolute right-0 top-7 z-50 bg-white border border-slate-200 rounded-lg shadow-lg w-32 py-1 text-left">
                            <button
                              onClick={() => { setRowMenu(null); setSelectedUnitId(u.id); openEdit(u); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-700">
                              <Pencil size={12} /> View / Edit
                            </button>
                            <button
                              onClick={() => { setRowMenu(null); deleteUnitMut.mutate(u.id); }}
                              className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50">
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="col-span-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">

        {/* Conversions Panel */}
        {(
          <>
            {/* Header */}
            <div className="px-5 py-3 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-sm">{selectedUnit ? selectedUnit.descr : '—'}</p>
                {selectedUnit && <p className="text-xs text-slate-400 mt-0.5">Short: {selectedUnit.code}</p>}
              </div>
              {selectedUnit && (
                <button
                  onClick={openConvModal}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition">
                  <Plus size={13} /> Add Conversion
                </button>
              )}
            </div>

            {/* Conversions table */}
            {!selectedUnit ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Select a unit from the left to view conversions
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Units</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {conversions.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                      No conversions yet. Click "Add Conversion" to add one.
                    </div>
                  ) : (
                    <table className="w-full text-sm border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 border-b border-slate-200 w-12"></th>
                          <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-r border-slate-200">Conversion</th>
                          <th className="px-4 py-2 w-10 border-b border-slate-200"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {conversions.map((conv, idx) => (
                          <tr key={conv.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 text-xs text-slate-400">{idx + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700 border-r border-slate-100">
                              1 {conv.baseUom?.descr} = {conv.factor} {conv.secondaryUom?.descr} ({conv.secondaryUom?.code})
                            </td>
                            <td className="px-3 py-3 text-center">
                              <button
                                onClick={() => deleteConvMut.mutate(conv.id)}
                                className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add / Edit Unit Modal ── */}
      {(rightPanel === 'new' || rightPanel === 'edit') && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">
                {rightPanel === 'edit' ? 'Edit Unit' : 'New Unit'}
              </h2>
              <button
                onClick={() => { setRightPanel('conversions'); resetUnitForm(); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-6 flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Name</label>
                <input
                  autoFocus
                  type="text"
                  value={unitFullName}
                  onChange={e => setUnitFullName(e.target.value)}
                  placeholder="e.g. KILOGRAM"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unit Short Name</label>
                <input
                  type="text"
                  value={unitShortName}
                  onChange={e => setUnitShortName(e.target.value)}
                  placeholder="e.g. KG"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => { setRightPanel('conversions'); resetUnitForm(); }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                Cancel
              </button>
              {rightPanel === 'new' && (
                <button
                  onClick={() => saveUnit(true)}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm transition disabled:opacity-40">
                  Save & New
                </button>
              )}
              <button
                onClick={() => saveUnit(false)}
                disabled={isPending}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm transition disabled:opacity-40">
                {isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Conversion Modal ── */}
      {convModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Add Conversion</h2>
              <button onClick={() => setConvModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-6 flex flex-col gap-5">
              <div className="flex items-end gap-3">
                {/* Base Unit */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Base Unit</label>
                  <select
                    value={convBaseId}
                    onChange={e => setConvBaseId(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 bg-white">
                    <option value="">Select…</option>
                    {units.map(u => (
                      <option key={u.id} value={u.id}>1 {u.descr} ({u.code})</option>
                    ))}
                  </select>
                </div>

                {/* Equals sign */}
                <div className="pb-2 text-slate-500 font-bold text-lg shrink-0">=</div>

                {/* Factor */}
                <div className="flex flex-col gap-1.5 w-24">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={convFactor}
                    onChange={e => setConvFactor(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 text-center" />
                </div>

                {/* Secondary Unit */}
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Secondary Unit</label>
                  <select
                    value={convSecId}
                    onChange={e => setConvSecId(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 bg-white">
                    <option value="">Select…</option>
                    {units.filter(u => String(u.id) !== convBaseId).map(u => (
                      <option key={u.id} value={u.id}>{u.descr} ({u.code})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setConvModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                Cancel
              </button>
              <button
                onClick={() => saveConversion(true)}
                disabled={createConvMut.isPending}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm transition disabled:opacity-40">
                Save & New
              </button>
              <button
                onClick={() => saveConversion(false)}
                disabled={createConvMut.isPending}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition disabled:opacity-40">
                {createConvMut.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
