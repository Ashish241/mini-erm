import { useState, type FormEvent } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { updateWorkOrderStatus } from '../../lib/api';
import type { WorkOrderRecord, WorkOrderStatus } from '../../types/workOrder';

interface Props {
  workOrder: WorkOrderRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

const NEXT_STATUS: Record<WorkOrderStatus, WorkOrderStatus | null> = {
  'ASSIGNED': 'IN_PROGRESS',
  'IN_PROGRESS': 'COMPLETED',
  'COMPLETED': null
};

export default function UpdateStatusModal({ workOrder, onClose, onSuccess }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!workOrder) return null;

  const nextStatus = NEXT_STATUS[workOrder.status];

  if (!nextStatus) {
    // If it's completed, we shouldn't even mount the modal, but just in case:
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center border border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Work Order Completed</h2>
          <p className="text-slate-600 mb-6 font-medium">This work order has already been completed and cannot be updated further.</p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await updateWorkOrderStatus(workOrder.id, { status: nextStatus });
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to update status.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (s: WorkOrderStatus) => {
    switch (s) {
      case 'ASSIGNED': return 'bg-slate-100 text-slate-800 border border-slate-200';
      case 'IN_PROGRESS': return 'bg-brand-50 text-brand-800 border border-brand-200';
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-xl font-extrabold text-slate-900">Update Status</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center text-sm text-slate-600 mb-4 font-medium">
            Are you sure you want to transition Work Order <strong className="text-slate-900 bg-slate-100 px-1 py-0.5 rounded">{workOrder.workOrderNumber}</strong>?
          </div>

          <div className="flex items-center justify-center space-x-4">
            <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm ${getStatusColor(workOrder.status)}`}>
              {workOrder.status.replace('_', ' ')}
            </div>
            <ArrowRight className="h-6 w-6 text-slate-300" />
            <div className={`px-4 py-2 rounded-xl font-bold text-sm shadow-sm ${getStatusColor(nextStatus)}`}>
              {nextStatus.replace('_', ' ')}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <div className="pt-4 flex justify-end space-x-3">
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
              Confirm Transition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
