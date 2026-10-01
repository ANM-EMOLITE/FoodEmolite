import { Component, inject, signal } from '@angular/core';
import { InventoryService } from '../../../common/services/inventory.service';
import { ProfileService } from '../../../common/services/profile.service';
import { StoreFoodService } from '../../../common/services/store-food.service';
import { SupplierService } from '../../../common/services/supplier.service';
import { ToastService } from '../../../common/services/toast.service';
import { StoreFoodResponse } from '../../../common/models/store-food.model';
import { SupplierResponse } from '../../../common/models/supplier.model';
import {
    CreateInventoryReceiptRequest,
    CreateInventoryStocktakeRequest,
    InventoryReceiptResponse,
    InventoryStocktakeResponse,
    InventoryTransactionResponse
} from '../../../common/models/inventory.model';
import {
    INVENTORY_TRANSACTION_TYPE_OPTIONS,
    INVENTORY_TRANSACTION_TYPE_TEXT,
    InventoryTransactionType
} from '../../../common/enums/inventory.enum';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import { TableColumn, TableRow } from '../../../common/models/front-end/table/table-column.model';
import { PopUpInventoryReceiptComponent } from './pop-up-inventory-receipt/pop-up-inventory-receipt';
import { PopUpInventoryStocktakeComponent } from './pop-up-inventory-stocktake/pop-up-inventory-stocktake';
import { PopUpInventoryDocumentComponent } from './pop-up-inventory-document/pop-up-inventory-document';

type InventoryTab = 'transactions' | 'receipts' | 'stocktakes';

interface InventoryFilter {
    keyword: string;
    type: InventoryTransactionType | '';
    fromDate: string;
    toDate: string;
}

const TYPE_TONE: Record<InventoryTransactionType, string> = {
    [InventoryTransactionType.Initial]: 'DRAFT',
    [InventoryTransactionType.Import]: 'ACTIVE',
    [InventoryTransactionType.Sale]: 'SCHEDULED',
    [InventoryTransactionType.CancelReturn]: 'PAUSED',
    [InventoryTransactionType.Adjust]: 'DRAFT',
    [InventoryTransactionType.Stocktake]: 'PROMO'
};

const EMPTY_FILTER: InventoryFilter = { keyword: '', type: '', fromDate: '', toDate: '' };

@Component({
    selector: 'app-page-agent-inventory',
    imports: [
        AppTableComponent,
        FilterComponent,
        PopUpInventoryReceiptComponent,
        PopUpInventoryStocktakeComponent,
        PopUpInventoryDocumentComponent
    ],
    templateUrl: './agent-inventory.html'
})
export class PageAgentInventoryComponent {
    private readonly inventoryService = inject(InventoryService);
    private readonly profileService = inject(ProfileService);
    private readonly storeFoodService = inject(StoreFoodService);
    private readonly supplierService = inject(SupplierService);
    private readonly toastService = inject(ToastService);

    readonly tabs: { key: InventoryTab; label: string }[] = [
        { key: 'transactions', label: 'Lịch sử kho' },
        { key: 'receipts', label: 'Phiếu nhập' },
        { key: 'stocktakes', label: 'Phiếu kiểm kho' }
    ];

    activeTab = signal<InventoryTab>('transactions');

    storeRefCode = signal<string | null>(null);
    foods = signal<StoreFoodResponse[]>([]);
    suppliers = signal<SupplierResponse[]>([]);

    loading = signal(false);
    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);
    asc = signal(false);
    filter = signal<InventoryFilter>({ ...EMPTY_FILTER });

    transactions = signal<InventoryTransactionResponse[]>([]);
    receipts = signal<InventoryReceiptResponse[]>([]);
    stocktakes = signal<InventoryStocktakeResponse[]>([]);

    isReceiptOpen = signal(false);
    isStocktakeOpen = signal(false);
    isSubmitting = signal(false);

    viewingReceipt = signal<InventoryReceiptResponse | null>(null);
    viewingStocktake = signal<InventoryStocktakeResponse | null>(null);

    readonly transactionFilterFields: FilterField[] = [
        { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Tên món, mã món, mã phiếu/đơn' },
        { key: 'type', label: 'Loại', type: 'select', placeholder: 'Tất cả', options: INVENTORY_TRANSACTION_TYPE_OPTIONS },
        { key: 'fromDate', label: 'Từ ngày', type: 'date', placeholder: 'Từ ngày' },
        { key: 'toDate', label: 'Đến ngày', type: 'date', placeholder: 'Đến ngày' }
    ];

    readonly documentFilterFields: FilterField[] = [
        { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Mã phiếu, nhà cung cấp, ghi chú' },
        { key: 'fromDate', label: 'Từ ngày', type: 'date', placeholder: 'Từ ngày' },
        { key: 'toDate', label: 'Đến ngày', type: 'date', placeholder: 'Đến ngày' }
    ];

    readonly transactionColumns: TableColumn[] = [
        { key: 'createdAt', label: 'Thời gian', width: '170px', type: 'date', sortable: true },
        { key: 'food', label: 'Món', width: '240px', type: 'product' },
        { key: 'type', label: 'Loại', width: '160px', align: 'center', type: 'badge' },
        { key: 'quantityChange', label: 'Thay đổi', width: '100px', align: 'right' },
        { key: 'quantityAfter', label: 'Tồn sau', width: '100px', align: 'right' },
        { key: 'referenceCode', label: 'Chứng từ', width: '140px' },
        { key: 'actorName', label: 'Người thực hiện', width: '170px' },
        { key: 'note', label: 'Ghi chú' }
    ];

    readonly receiptColumns: TableColumn[] = [
        { key: 'createdAt', label: 'Thời gian', width: '170px', type: 'date', sortable: true },
        { key: 'receiptCode', label: 'Mã phiếu', width: '130px' },
        { key: 'supplierName', label: 'Nhà cung cấp', width: '200px' },
        { key: 'totalItems', label: 'Số món', width: '100px', align: 'right' },
        { key: 'totalQuantity', label: 'Số lượng', width: '110px', align: 'right' },
        { key: 'totalAmount', label: 'Tổng tiền', width: '150px', align: 'right' },
        { key: 'actorName', label: 'Người nhập', width: '170px' },
        { key: 'note', label: 'Ghi chú' }
    ];

    readonly stocktakeColumns: TableColumn[] = [
        { key: 'createdAt', label: 'Thời gian', width: '170px', type: 'date', sortable: true },
        { key: 'stocktakeCode', label: 'Mã phiếu', width: '130px' },
        { key: 'totalItems', label: 'Số món', width: '100px', align: 'right' },
        { key: 'totalDifference', label: 'Chênh lệch', width: '120px', align: 'right' },
        { key: 'differenceValue', label: 'Giá trị lệch', width: '150px', align: 'right' },
        { key: 'actorName', label: 'Người kiểm', width: '170px' },
        { key: 'note', label: 'Ghi chú' }
    ];

    constructor() {
        this.loadStore();
        this.load();
    }

    columns(): TableColumn[] {
        switch (this.activeTab()) {
            case 'receipts':
                return this.receiptColumns;
            case 'stocktakes':
                return this.stocktakeColumns;
            default:
                return this.transactionColumns;
        }
    }

    rows(): TableRow[] {
        switch (this.activeTab()) {
            case 'receipts':
                return this.receipts().map(x => ({
                    id: x.id,
                    createdAt: x.createdAt,
                    receiptCode: x.receiptCode,
                    supplierName: x.supplierName || '—',
                    totalItems: x.totalItems,
                    totalQuantity: x.totalQuantity,
                    totalAmount: this.formatCurrency(x.totalAmount),
                    actorName: x.actorName || '—',
                    note: x.note || ''
                }));
            case 'stocktakes':
                return this.stocktakes().map(x => ({
                    id: x.id,
                    createdAt: x.createdAt,
                    stocktakeCode: x.stocktakeCode,
                    totalItems: x.totalItems,
                    totalDifference: this.formatDifference(x.totalDifference),
                    differenceValue: this.formatCurrency(x.differenceValue),
                    actorName: x.actorName || '—',
                    note: x.note || ''
                }));
            default:
                return this.transactions().map(x => ({
                    id: x.id,
                    createdAt: x.createdAt,
                    food: { text: x.foodName, sub: x.productCode, image: x.thumbnailUrl },
                    type: { text: INVENTORY_TRANSACTION_TYPE_TEXT[x.type] ?? x.type, value: TYPE_TONE[x.type] ?? 'DRAFT' },
                    quantityChange: this.formatDifference(x.quantityChange),
                    quantityAfter: x.quantityAfter,
                    referenceCode: x.referenceCode || '—',
                    actorName: x.actorName || '—',
                    note: x.note || ''
                }));
        }
    }

    emptyText(): string {
        switch (this.activeTab()) {
            case 'receipts':
                return 'Chưa có phiếu nhập nào';
            case 'stocktakes':
                return 'Chưa có phiếu kiểm kho nào';
            default:
                return 'Chưa có biến động kho';
        }
    }

    switchTab(tab: InventoryTab): void {
        if (tab === this.activeTab()) {
            return;
        }

        this.activeTab.set(tab);
        this.filter.set({ ...EMPTY_FILTER });
        this.page.set(1);
        this.asc.set(false);
        this.load();
    }

    load(): void {
        this.loading.set(true);

        const filter = this.filter();
        const base = {
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: 'createdAt',
            asc: this.asc()
        };
        const dateRange = {
            keyword: filter.keyword || null,
            fromDate: filter.fromDate || null,
            toDate: filter.toDate || null
        };

        const done = (response: { totalPages: number; totalRecords: number }) => {
            this.loading.set(false);
            this.totalPages.set(response.totalPages);
            this.totalRecords.set(response.totalRecords);
        };
        const fail = () => {
            this.loading.set(false);
            this.toastService.error('Không tải được dữ liệu kho');
        };

        switch (this.activeTab()) {
            case 'receipts':
                this.inventoryService.searchReceipts({ ...base, searchParams: dateRange }).subscribe({
                    next: response => {
                        this.receipts.set(response.items ?? []);
                        done(response);
                    },
                    error: fail
                });
                break;
            case 'stocktakes':
                this.inventoryService.searchStocktakes({ ...base, searchParams: dateRange }).subscribe({
                    next: response => {
                        this.stocktakes.set(response.items ?? []);
                        done(response);
                    },
                    error: fail
                });
                break;
            default:
                this.inventoryService.searchTransactions({
                    ...base,
                    searchParams: { ...dateRange, type: filter.type || null }
                }).subscribe({
                    next: response => {
                        this.transactions.set(response.items ?? []);
                        done(response);
                    },
                    error: fail
                });
        }
    }

    onFilterChange(value: InventoryFilter): void {
        this.filter.set({ ...EMPTY_FILTER, ...value });
        this.page.set(1);
        this.load();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.load();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.load();
    }

    onSortChange(): void {
        this.asc.set(!this.asc());
        this.page.set(1);
        this.load();
    }

    onRowClick(row: TableRow): void {
        const id = Number(row.id);

        if (this.activeTab() === 'receipts') {
            this.inventoryService.getReceipt(id).subscribe({
                next: response => response.isSuccess && response.data
                    ? this.viewingReceipt.set(response.data)
                    : this.toastService.error(response.message || 'Không tải được phiếu nhập')
            });
        } else if (this.activeTab() === 'stocktakes') {
            this.inventoryService.getStocktake(id).subscribe({
                next: response => response.isSuccess && response.data
                    ? this.viewingStocktake.set(response.data)
                    : this.toastService.error(response.message || 'Không tải được phiếu kiểm kho')
            });
        }
    }

    closeDocument(): void {
        this.viewingReceipt.set(null);
        this.viewingStocktake.set(null);
    }

    openReceipt(): void {
        this.supplierService.search({ page: 1, pageSize: 1000, sortBy: 'supplierName', asc: true, searchParams: { isActive: true } }).subscribe({
            next: response => this.suppliers.set(response.items ?? [])
        });
        this.loadFoods(() => this.isReceiptOpen.set(true));
    }

    openStocktake(): void {
        this.loadFoods(() => this.isStocktakeOpen.set(true));
    }

    createReceipt(request: CreateInventoryReceiptRequest): void {
        this.isSubmitting.set(true);

        this.inventoryService.createReceipt(request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message || 'Nhập hàng thất bại');
                    return;
                }

                this.toastService.success(`Đã tạo phiếu nhập ${response.data}`);
                this.isReceiptOpen.set(false);
                this.reloadAfterSave('receipts');
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Nhập hàng thất bại');
            }
        });
    }

    createStocktake(request: CreateInventoryStocktakeRequest): void {
        this.isSubmitting.set(true);

        this.inventoryService.createStocktake(request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message || 'Kiểm kho thất bại');
                    return;
                }

                this.toastService.success(`Đã hoàn tất kiểm kho ${response.data}`);
                this.isStocktakeOpen.set(false);
                this.reloadAfterSave('stocktakes');
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Kiểm kho thất bại');
            }
        });
    }

    private reloadAfterSave(tab: InventoryTab): void {
        if (this.activeTab() === tab) {
            this.page.set(1);
            this.load();
        } else {
            this.switchTab(tab);
        }
    }

    private loadStore(): void {
        this.profileService.getMyProfile().subscribe({
            next: response => this.storeRefCode.set(response.data?.store?.refCode ?? null)
        });
    }

    private loadFoods(onLoaded: () => void): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            this.toastService.error('Không tìm thấy cửa hàng của đại lý');
            return;
        }

        this.storeFoodService.getByStoreRefCode(refCode, null, 1, 1000).subscribe({
            next: response => {
                this.foods.set(response.items ?? []);
                onLoaded();
            },
            error: () => this.toastService.error('Không tải được danh sách món')
        });
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }

    private formatDifference(value: number): string {
        return value > 0 ? `+${value}` : `${value}`;
    }
}
