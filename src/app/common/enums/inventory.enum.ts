export enum InventoryTransactionType {
    Initial = 'INITIAL',
    Import = 'IMPORT',
    Sale = 'SALE',
    CancelReturn = 'CANCEL_RETURN',
    Adjust = 'ADJUST',
    Stocktake = 'STOCKTAKE'
}

export const INVENTORY_TRANSACTION_TYPE_TEXT: Record<InventoryTransactionType, string> = {
    [InventoryTransactionType.Initial]: 'Tồn đầu',
    [InventoryTransactionType.Import]: 'Nhập hàng',
    [InventoryTransactionType.Sale]: 'Bán hàng',
    [InventoryTransactionType.CancelReturn]: 'Huỷ đơn hoàn kho',
    [InventoryTransactionType.Adjust]: 'Sửa tay',
    [InventoryTransactionType.Stocktake]: 'Kiểm kho'
};

export const INVENTORY_TRANSACTION_TYPE_OPTIONS = Object.values(InventoryTransactionType).map(value => ({
    label: INVENTORY_TRANSACTION_TYPE_TEXT[value],
    value
}));
