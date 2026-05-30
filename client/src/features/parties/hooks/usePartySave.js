import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PartiesAPI } from '../resources/parties-service';

export function usePartySave({ editParty = null, onClose, onSaved, onSaveAndNewSuccess } = {}) {
  const qc = useQueryClient();

  const saveMut = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, type: (data.partyGroup || 'customer').toLowerCase() };
      return editParty ? PartiesAPI.update(editParty.id, payload) : PartiesAPI.create(payload);
    },
    onSuccess: (savedParty, data) => {
      qc.invalidateQueries({ queryKey: ['parties'] });
      onSaved?.(savedParty, data);
      onClose?.();
      toast.success(editParty ? 'Party updated' : 'Party added');
    },
    onError: () => toast.error('Failed to save party'),
  });

  const saveAndNewMut = useMutation({
    mutationFn: (data) => PartiesAPI.create({ ...data, type: (data.partyGroup || 'customer').toLowerCase() }),
    onSuccess: (savedParty, data) => {
      qc.invalidateQueries({ queryKey: ['parties'] });
      onSaved?.(savedParty, data);
      onSaveAndNewSuccess?.();
      toast.success('Party added');
    },
    onError: () => toast.error('Failed to save party'),
  });

  return {
    saveMut,
    handleSave: (data) => saveMut.mutate(data),
    handleSaveAndNew: (data) => saveAndNewMut.mutate(data),
    isSaving: saveMut.isPending || saveAndNewMut.isPending,
  };
}
