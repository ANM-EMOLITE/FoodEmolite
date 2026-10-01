export interface SupplierSearchRequest {
    keyword?: string | null;
    isActive?: boolean | null;
}

export interface SaveSupplierRequest {
    supplierName: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    taxCode?: string | null;
    note?: string | null;
    isActive: boolean;
}

export interface SupplierResponse {
    id: number;
    supplierCode: string;
    supplierName: string;
    contactName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    taxCode: string | null;
    note: string | null;
    isActive: boolean;
    totalReceipts: number;
    totalQuantity: number;
    totalAmount: number;
    lastReceiptAt: string | null;
    createdAt: string;
}
