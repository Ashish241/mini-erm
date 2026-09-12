import type { Location, Item } from './inventory';
import type { User } from './auth';

export type OrderStatus = 'CREATED' | 'RESERVED' | 'COMPLETED' | 'CANCELLED';

export interface CustomerOrderItem {
  id: string;
  orderId: string;
  itemId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  item: Item;
  location: Location;
}

export interface CustomerOrderRecord {
  id: string;
  orderNumber: string;
  createdById: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  
  createdBy: User;
  items: CustomerOrderItem[];
}

export interface CreateOrderLineItem {
  itemId: string;
  locationId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: CreateOrderLineItem[];
}
