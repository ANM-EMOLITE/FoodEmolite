import { InventoryTransactionType } from '../enums/inventory.enum';

export interface InventoryTransactionSearchRequest {
    keyword?: string | null;
    storeFoodId?: number | null;
    type?: InventoryTransactionType | null;
    fromDate?: string | null;
    toDate?: string | null;
}

export interface InventoryTransactionResponse {
    id: number;
    createdAt: string;
    storeFoodId: number;
    foodName: string;
    productCode: string;
    thumbnailUrl: string | null;
    type: InventoryTransactionType;
    quantityChange: number;
    quantityAfter: number;
    unitCost: number | null;
    orderId: number | null;
    referenceCode: string | null;
    note: string | null;
    actorName: string | null;
}

export interface InventoryDocumentSearchRequest {
    keyword?: string | null;
    fromDate?: string | null;
    toDate?: string | null;
}

export interface InventoryReceiptSearchRequest extends InventoryDocumentSearchRequest {
    supplierId?: number | null;
}

export interface CreateInventoryReceiptRequest {
    supplierId?: number | null;
    note?: string | null;
    items: { storeFoodId: number; quantity: number; unitCost: number }[];
}

export interface InventoryReceiptItemResponse {
    storeFoodId: number;
    foodName: string;
    productCode: string;
    thumbnailUrl: string | null;
    quantity: number;
    unitCost: number;
    totalCost: number;
}

export interface InventoryReceiptResponse {
    id: number;
    receiptCode: string;
    supplierId: number | null;
    supplierName: string | null;
    note: string | null;
    totalQuantity: number;
    totalAmount: number;
    totalItems: number;
    createdAt: string;
    actorName: string | null;
    items: InventoryReceiptItemResponse[];
}

export interface CreateInventoryStocktakeRequest {
    note?: string | null;
    items: { storeFoodId: number; actualQuantity: number; note?: string | null }[];
}

export interface InventoryStocktakeItemResponse {
    storeFoodId: number;
    foodName: string;
    productCode: string;
    thumbnailUrl: string | null;
    systemQuantity: number;
    actualQuantity: number;
    difference: number;
    unitCost: number;
    note: string | null;
}

export interface InventoryStocktakeResponse {
    id: number;
    stocktakeCode: string;
    note: string | null;
    totalItems: number;
    totalDifference: number;
    differenceValue: number;
    createdAt: string;
    actorName: string | null;
    items: InventoryStocktakeItemResponse[];
}
