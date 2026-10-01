import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupplierService } from '../../../common/services/supplier.service';
import { ToastService } from '../../../common/services/toast.service';
import { SaveSupplierRequest, SupplierResponse } from '../../../common/models/supplier.model';
import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import { TableColumn, TableRow } from '../../../common/models/front-end/table/table-column.model';
import { PopUpSupplierFormComponent } from './pop-up-supplier-form/pop-up-supplier-form';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

interface SupplierFilter {
    keyword: string;
    isActive: string;
}

const EMPTY_FILTER: SupplierFilter = { keyword: '', isActive: '' };

@Component({
    selector: 'app-page-agent-suppliers',
    imports: [
        AppTableComponent,
        FilterComponent,
        PopUpSupplierFormComponent
    ],
    templateUrl: './agent-suppliers.html'
})
export class PageAgentSuppliersComponent {
    private readonly supplierService = inject(SupplierService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);

    suppliers = signal<SupplierResponse[]>([]);

    loading = signal(false);
    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);
    sortBy = signal('createdAt');
    asc = signal(false);
    filter = signal<SupplierFilter>({ ...EMPTY_FILTER });

    isFormOpen = signal(false);
    isSubmitting = signal(false);

    readonly filterFields: FilterField[] = [
        { key: 'keyword', label: 'Tìm kiếm', type: 'text', placeholder: 'Mã, tên, người liên hệ, SĐT' },
        {
            key: 'isActive', label: 'Trạng thái', type: 'select', placeholder: 'Tất cả', options: [
                { label: 'Đang giao dịch', value: 'true' },
                { label: 'Ngừng giao dịch', value: 'false' }
            ]
        }
    ];

    readonly columns: TableColumn[] = [
        { key: 'supplierCode', label: 'Mã NCC', width: '120px' },
        { key: 'supplierName', label: 'Tên nhà cung cấp', width: '240px', sortable: true },
        { key: 'contactName', label: 'Người liên hệ', width: '170px' },
        { key: 'phone', label: 'SĐT', width: '130px' },
        { key: 'totalReceipts', label: 'Số phiếu nhập', width: '130px', align: 'right' },
        { key: 'totalAmount', label: 'Tổng tiền nhập', width: '160px', align: 'right' },
        { key: 'status', label: 'Trạng thái', width: '150px', align: 'center', type: 'badge' },
        { key: 'createdAt', label: 'Ngày tạo', width: '170px', type: 'date', sortable: true }
    ];

    constructor() {
        this.load();
    }

    rows(): TableRow[] {
        return this.suppliers().map(x => ({
            id: x.id,
            supplierCode: x.supplierCode,
            supplierName: x.supplierName,
            contactName: x.contactName || '—',
            phone: x.phone || '—',
            totalReceipts: x.totalReceipts,
            totalAmount: this.formatCurrency(x.totalAmount),
            status: x.isActive
                ? { text: 'Đang giao dịch', value: 'ACTIVE' }
                : { text: 'Ngừng giao dịch', value: 'DRAFT' },
            createdAt: x.createdAt
        }));
    }

    load(): void {
        this.loading.set(true);

        const filter = this.filter();

        this.supplierService.search({
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: this.sortBy(),
            asc: this.asc(),
            searchParams: {
                keyword: filter.keyword || null,
                isActive: filter.isActive === '' ? null : filter.isActive === 'true'
            }
        }).subscribe({
            next: response => {
                this.loading.set(false);
                this.suppliers.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được danh sách nhà cung cấp');
            }
        });
    }

    onFilterChange(value: SupplierFilter): void {
        this.filter.set({ ...EMPTY_FILTER, ...value, isActive: String(value?.isActive ?? '') });
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

    onSortChange(key: string): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);
            this.asc.set(true);
        }

        this.page.set(1);
        this.load();
    }


    openDetail(row: TableRow): void {
        this.router.navigate(['/', URL_ENDPOINT.AGENT, URL_ENDPOINT.AGENT_SUPPLIERS, row.id]);
    }

    create(request: SaveSupplierRequest): void {
        this.isSubmitting.set(true);

        this.supplierService.create(request).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message || 'Thêm nhà cung cấp thất bại');
                    return;
                }

                this.toastService.success(`Đã thêm nhà cung cấp ${response.data}`);
                this.isFormOpen.set(false);
                this.load();
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Thêm nhà cung cấp thất bại');
            }
        });
    }

    private formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }
}
