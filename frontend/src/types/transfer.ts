import type { Location, Item } from './inventory';

export type TransferStatus = 'REQUESTED' | 'DISPATCHED' | 'RECEIVED';

export interface TransferRecord {
  id: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  quantity: number;
  status: TransferStatus;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  
  sourceLocation: Location;
  destinationLocation: Location;
  item: Item;
}

export interface CreateTransferInput {
  sourceLocationId: string;
  destinationLocationId: string;
  itemId: string;
  quantity: number;
}
