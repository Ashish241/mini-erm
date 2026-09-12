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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Work Order Completed</h2>
          <p className="text-gray-600 mb-6">This work order has already been completed and cannot be updated further.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
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
      case 'ASSIGNED': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b bg-gray-50">
          <h2 className="text-xl font-bold text-gray-900">Update Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center text-sm text-gray-600 mb-4">
            Are you sure you want to transition Work Order <strong>{workOrder.workOrderNumber}</strong>?
          </div>

          <div className="flex items-center justify-center space-x-4">
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${getStatusColor(workOrder.status)}`}>
              {workOrder.status.replace('_', ' ')}
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400" />
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${getStatusColor(nextStatus)}`}>
              {nextStatus.replace('_', ' ')}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-white bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
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
