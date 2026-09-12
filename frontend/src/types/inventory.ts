export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  description?: string;
  categoryId: string;
  category?: Category;
}

export interface Location {
  id: string;
  name: string;
  code: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  itemId: string;
}

export interface InventoryRecord {
  id: string;
  itemId: string;
  locationId: string;
  batchId: string | null;
  physicalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  item: Item;
  location: Location;
  batch: Batch | null;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE';
  quantity: number;
  referenceType: string;
  referenceId: string;
  createdById: string;
  createdAt: string;
}

export interface CreateInventoryInput {
  itemId: string;
  locationId: string;
  batchId?: string;
  physicalQuantity: number;
}

export interface AdjustStockInput {
  adjustment: number;
  reason: string;
}
