import { useState, useEffect, type FormEvent } from 'react';
import { X, Loader2 } from 'lucide-react';
import { createWorkOrder, fetchItems, fetchLocations, fetchUsers } from '../../lib/api';
import type { Item, Location } from '../../types/inventory';
import type { User } from '../../types/auth';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateWorkOrderModal({ isOpen, onClose, onSuccess }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [itemId, setItemId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [requiredQuantity, setRequiredQuantity] = useState(1);
  const [assignedUserId, setAssignedUserId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      Promise.all([fetchItems(), fetchLocations(), fetchUsers()])
        .then(([itemsData, locsData, usersData]) => {
          setItems(itemsData);
          setLocations(locsData);
          setUsers(usersData);
        })
        .catch(() => setError('Failed to load reference data.'));
    } else {
      setItemId('');
      setLocationId('');
      setRequiredQuantity(1);
      setAssignedUserId('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (requiredQuantity <= 0) {
      setError('Required quantity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createWorkOrder({
        itemId,
        locationId,
        requiredQuantity,
        ...(assignedUserId ? { assignedUserId } : {}),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to create work order.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Create Work Order</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Item to Produce/Work On</label>
            <select
              required
              value={itemId}
              onChange={e => setItemId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
            >
              <option value="">Select Item...</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>{item.name} ({item.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Location</label>
            <select
              required
              value={locationId}
              onChange={e => setLocationId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
            >
              <option value="">Select Location...</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Required Quantity</label>
            <input
              type="number"
              required
              min="1"
              value={requiredQuantity}
              onChange={e => setRequiredQuantity(parseInt(e.target.value) || 0)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Assign User (Optional)</label>
            <select
              value={assignedUserId}
              onChange={e => setAssignedUserId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 shadow-sm transition-all"
            >
              <option value="">Unassigned</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
              ))}
            </select>
          </div>

          <div className="pt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-slate-900 bg-brand-500 hover:bg-brand-400 rounded-xl font-bold flex items-center transition-all shadow-sm disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Work Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
