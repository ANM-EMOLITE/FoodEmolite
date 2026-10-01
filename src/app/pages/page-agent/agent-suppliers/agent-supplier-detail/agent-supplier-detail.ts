import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryService } from '../../../../common/services/inventory.service';
import { SupplierService } from '../../../../common/services/supplier.service';
import { ToastService } from '../../../../common/services/toast.service';
import { SaveSupplierRequest, SupplierResponse } from '../../../../common/models/supplier.model';
import { InventoryReceiptResponse } from '../../../../common/models/inventory.model';
import { TableColumn, TableRow } from '../../../../common/models/front-end/table/table-column.model';
import { URL_ENDPOINT } from '../../../../common/constants/url-endpoint';
import { AppTableComponent } from '../../../../shared/component/table/table';
import { ConfirmPopupComponent } from '../../../../shared/component/confirm-popup/confirm-popup';
import { PopUpInventoryDocumentComponent } from '../../agent-inventory/pop-up-inventory-document/pop-up-inventory-document';
import { PopUpSupplierFormComponent } from '../pop-up-supplier-form/pop-up-supplier-form';

type SupplierDetailTab = 'info' | 'receipts';

@Component({
    selector: 'app-page-agent-supplier-detail',
    imports: [DatePipe, AppTableComponent, ConfirmPopupComponent, PopUpInventoryDocumentComponent, PopUpSupplierFormComponent],
    templateUrl: './agent-supplier-detail.html'
})
export class PageAgentSupplierDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly supplierService = inject(SupplierService);
    private readonly inventoryService = inject(InventoryService);
    private readonly toastService = inject(ToastService);

    private readonly supplierId = Number(this.route.snapshot.paramMap.get('id'));

    readonly tabs: { key: SupplierDetailTab; label: string }[] = [
        { key: 'info', label: 'Thông tin' },
        { key: 'receipts', label: 'Nhập kho' }
    ];

    readonly activeTab = signal<SupplierDetailTab>('info');

    readonly supplier = signal<SupplierResponse | null>(null);
    readonly loadingSupplier = signal(true);

    readonly receipts = signal<InventoryReceiptResponse[]>([]);
    readonly loading = signal(false);
    readonly page = signal(1);
    readonly pageSize = signal(20);
    readonly totalPages = signal(1);
    readonly totalRecords = signal(0);
    readonly asc = signal(false);
    readonly receiptsLoaded = signal(false);

    readonly viewingReceipt = signal<InventoryReceiptResponse | null>(null);
    readonly isFormOpen = signal(false);
    readonly isDeleteOpen = signal(false);
    readonly isSubmitting = signal(false);

    readonly columns: TableColumn[] = [
        { key: 'createdAt', label: 'Thời gian', width: '170px', type: 'date', sortable: true },
        { key: 'receiptCode', label: 'Mã phiếu', width: '130px' },
        { key: 'totalItems', label: 'Số món', width: '100px', align: 'right' },
        { key: 'totalQuantity', label: 'Số lượng', width: '110px', align: 'right' },
        { key: 'totalAmount', label: 'Tổng tiền', width: '150px', align: 'right' },
        { key: 'actorName', label: 'Người nhập', width: '170px' },
        { key: 'note', label: 'Ghi chú' }
    ];

    constructor() {
        this.loadSupplier();
    }

    rows(): TableRow[] {
        return this.receipts().map(x => ({
            id: x.id,
            createdAt: x.createdAt,
            receiptCode: x.receiptCode,
            totalItems: x.totalItems,
            totalQuantity: x.totalQuantity,
            totalAmount: this.formatCurrency(x.totalAmount),
            actorName: x.actorName || '—',
            note: x.note || ''
        }));
    }

    loadSupplier(): void {
        this.supplierService.getDetail(this.supplierId).subscribe({
            next: response => {
                this.loadingSupplier.set(false);

                if (!response.isSuccess || !response.data) {
                    this.toastService.error(response.message || 'Không tìm thấy nhà cung cấp');
                    return;
                }

                this.supplier.set(response.data);
            },
            error: () => {
                this.loadingSupplier.set(false);
                this.toastService.error('Không tải được nhà cung cấp');
            }
        });
    }

    switchTab(tab: SupplierDetailTab): void {
        this.activeTab.set(tab);

        if (tab === 'receipts' && !this.receiptsLoaded()) {
            this.loadReceipts();
        }
    }

    loadReceipts(): void {
        this.loading.set(true);

        this.inventoryService.searchReceipts({
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: 'createdAt',
            asc: this.asc(),
            searchParams: { supplierId: this.supplierId }
        }).subscribe({
            next: response => {
                this.loading.set(false);
                this.receiptsLoaded.set(true);
                this.receipts.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được phiếu nhập');
            }
        });
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadReceipts();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadReceipts();
    }

    onSortChange(): void {
        this.asc.set(!this.asc());
        this.page.set(1);
        this.loadReceipts();
    }

    openReceipt(row: TableRow): void {
        this.inventoryService.getReceipt(Number(row.id)).subscribe({
            next: response => response.isSuccess && response.data
                ? this.viewingReceipt.set(response.data)
                : this.toastService.error(response.message || 'Không tải được phiếu nhập')
        });
    }

    save(request: SaveSupplierRequest): void {
        this.isSubmitting.set(true);

        this.supplierService.update(this.supplierId, request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message || 'Lưu nhà cung cấp thất bại');
                    return;
                }

                this.toastService.success('Đã cập nhật nhà cung cấp');
                this.isFormOpen.set(false);
                this.loadSupplier();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Lưu nhà cung cấp thất bại');
            }
        });
    }

    confirmDelete(): void {
        this.isSubmitting.set(true);

        this.supplierService.delete(this.supplierId).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message || 'Xoá nhà cung cấp thất bại');
                    return;
                }

                this.toastService.success('Đã xoá nhà cung cấp');
                this.goBack();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Xoá nhà cung cấp thất bại');
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_SUPPLIERS]);
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
}
