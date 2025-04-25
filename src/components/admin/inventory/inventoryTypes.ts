// Interface definitions for inventory management

// Core entity types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  status: string;
  category_id?: string;
  category?: string;
  image_url?: string;
  metadata?: any;
  avg_cost: number;
  min_stock_level: number;
  max_stock_level: number;
  stock_unit: string;
  weight_unit?: string;
  vendor_ids?: string[];
  last_purchase_cost: number;
  organization_id: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  sku: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  address?: string;
  description?: string;
  is_active: boolean;
  metadata?: any;
  organization_id: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  location_id: string;
  current_stock: number;
  committed_stock: number;
  shelf_location?: string;
  last_count_date?: string;
  status?: string;
  metadata?: any;
  organization_id: string;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  location_id: string;
  transaction_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  metadata?: any;
  source_location_id?: string;
  destination_location_id?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
}

// Joined/View types
export interface InventoryWithDetails {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  location_id: string;
  location_name: string;
  current_stock: number;
  committed_stock: number;
  available_stock: number;
  avg_cost: number;
  inventory_value: number;
  min_stock_level?: number;
  max_stock_level?: number;
  stock_unit?: string;
  shelf_location?: string;
  organization_id: string;
}

export interface TransactionWithDetails {
  id: string;
  product_id: string;
  product: {
    name: string;
    sku: string;
    stock_unit?: string;
  };
  location_id: string;
  location: {
    name: string;
  };
  transaction_type: string;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  source_location_id?: string;
  source_location?: {
    name: string;
  };
  destination_location_id?: string;
  destination_location?: {
    name: string;
  };
  created_by: string;
  created_at: string;
  user?: {
    name?: string;
    email?: string;
  };
}

// Form data types
export interface ReceiveInventoryItem {
  id: string; // temp id for UI
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number | '';
  unit_cost: number | '';
  total_cost: number;
  stock_unit: string;
}

export interface TransferInventoryItem {
  id: string; // temp id for UI
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number | '';
  available_quantity: number;
  stock_unit: string;
}

export interface AdjustInventoryItem {
  id: string; // temp id for UI
  product_id: string;
  product_name: string;
  sku: string;
  current_quantity: number;
  new_quantity: number | '';
  adjustment: number;
  reason: string;
  stock_unit: string;
}

// Request Types for Supabase RPC calls
export interface ReceiveInventoryRequest {
  p_product_id: string;
  p_location_id: string;
  p_quantity: number;
  p_unit_cost: number;
  p_reference_id: string;
  p_reference_type?: string;
  p_notes?: string;
  p_metadata?: any;
}

export interface ProcessSaleRequest {
  p_product_id: string;
  p_location_id: string;
  p_quantity: number;
  p_reference_id: string;
  p_reference_type?: string;
  p_notes?: string;
  p_metadata?: any;
}

export interface ReserveInventoryRequest {
  p_product_id: string;
  p_location_id: string;
  p_quantity: number;
  p_reference_id: string;
  p_reference_type?: string;
  p_notes?: string;
}

export interface ReleaseReservationRequest {
  p_product_id: string;
  p_location_id: string;
  p_quantity: number;
  p_reference_id: string;
  p_notes?: string;
}

export interface TransferInventoryRequest {
  p_product_id: string;
  p_source_location_id: string;
  p_destination_location_id: string;
  p_quantity: number;
  p_reference_id: string;
  p_notes?: string;
}

// Enums
export enum TransactionType {
  PURCHASE = 'purchase',
  SALE = 'sale',
  ADJUSTMENT = 'adjustment',
  TRANSFER_IN = 'transfer_in',
  TRANSFER_OUT = 'transfer_out',
  RETURN = 'return',
  COUNT = 'count'
}

export enum LocationType {
  WAREHOUSE = 'warehouse',
  STORE = 'store',
  SUPPLIER = 'supplier',
  CUSTOMER = 'customer',
  TRANSIT = 'transit',
  OTHER = 'other'
}

export enum StockStatus {
  IN_STOCK = 'in_stock',
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  OVERSTOCKED = 'overstocked'
}

// Helper functions
export const calculateStockStatus = (
  currentStock: number,
  minStockLevel: number,
  maxStockLevel: number
): StockStatus => {
  if (currentStock <= 0) {
    return StockStatus.OUT_OF_STOCK;
  }
  
  if (currentStock < minStockLevel) {
    return StockStatus.LOW_STOCK;
  }
  
  if (maxStockLevel > 0 && currentStock > maxStockLevel) {
    return StockStatus.OVERSTOCKED;
  }
  
  return StockStatus.IN_STOCK;
};

export const getTransactionTypeLabel = (type: string): string => {
  switch (type) {
    case TransactionType.PURCHASE:
      return 'Purchase';
    case TransactionType.SALE:
      return 'Sale';
    case TransactionType.ADJUSTMENT:
      return 'Adjustment';
    case TransactionType.TRANSFER_IN:
      return 'Transfer In';
    case TransactionType.TRANSFER_OUT:
      return 'Transfer Out';
    case TransactionType.RETURN:
      return 'Return';
    case TransactionType.COUNT:
      return 'Inventory Count';
    default:
      return type;
  }
};

export const getStockStatusLabel = (status: StockStatus): string => {
  switch (status) {
    case StockStatus.IN_STOCK:
      return 'In Stock';
    case StockStatus.LOW_STOCK:
      return 'Low Stock';
    case StockStatus.OUT_OF_STOCK:
      return 'Out of Stock';
    case StockStatus.OVERSTOCKED:
      return 'Overstocked';
    default:
      return 'Unknown';
  }
};

export const getStockStatusColor = (status: StockStatus): string => {
  switch (status) {
    case StockStatus.IN_STOCK:
      return 'text-green-600';
    case StockStatus.LOW_STOCK:
      return 'text-orange-600';
    case StockStatus.OUT_OF_STOCK:
      return 'text-red-600';
    case StockStatus.OVERSTOCKED:
      return 'text-blue-600';
    default:
      return 'text-gray-600';
  }
};