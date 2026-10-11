export interface Product {
  id: string;
  sku: string;
  name: string;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
}

export interface InventoryItem {
  warehouse_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  sku: string;
  product_name: string;
  warehouse_code: string;
  warehouse_name: string;
}

export interface SimulationResult {
  totalRequests: number;
  successful: number;
  rejected: number;
  executionTimeMs: number;
  reservations: Array<{ id: string; userId: string; status: string }>;
}