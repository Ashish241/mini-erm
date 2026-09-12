import type { Location, Item } from './inventory';
import type { User } from './auth';

export type WorkOrderStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

export interface WorkOrderRecord {
  id: string;
  workOrderNumber: string;
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  status: WorkOrderStatus;
  assignedUserId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  
  location: Location;
  item: Item;
  assignedUser: User | null;
  materials: WorkOrderMaterial[];
}

export interface WorkOrderMaterial {
  id: string;
  workOrderId: string;
  itemId: string;
  quantity: number;
  item: Item;
}

export interface CreateWorkOrderInput {
  locationId: string;
  itemId: string;
  requiredQuantity: number;
  assignedUserId?: string;
}

export interface UpdateWorkOrderStatusInput {
  status: WorkOrderStatus;
}

export interface StockCheckResponse {
  item: Item;
  location: Location;
  requiredQuantity: number;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  shortageQuantity: number;
  hasSufficientStock: boolean;
}
