import { Component, inject, signal } from '@angular/core';
import { ActivityLogService } from '../../../common/services/activity-log.service';
import { ToastService } from '../../../common/services/toast.service';
import { ActivityLogResponse, ActivityLogSearchRequest } from '../../../common/models/activity-log.model';
import { BaseSearchRequest } from '../../../common/models/base-search.model';

import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import {
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';

interface ActivityLogFilter {
    keyword: string;
    fromDate: string;
    toDate: string;
}

const ACTION_TEXT: Record<string, string> = {
    CREATE_STORE: 'Tạo cửa hàng',
    UPDATE_STORE: 'Cập nhật cửa hàng',
    DELETE_STORE: 'Xoá cửa hàng',
    CREATE_CATEGORY: 'Tạo danh mục',
    UPDATE_CATEGORY: 'Cập nhật danh mục',
    DELETE_CATEGORY: 'Xoá danh mục',
    CREATE_FOOD: 'Thêm món',
    UPDATE_FOOD: 'Cập nhật món',
    DELETE_FOOD: 'Xoá món',
    CREATE_PROMOTION: 'Tạo khuyến mãi',
    UPDATE_PROMOTION: 'Cập nhật khuyến mãi',
    PAUSE_PROMOTION: 'Tạm dừng khuyến mãi',
    RESUME_PROMOTION: 'Tiếp tục khuyến mãi',
    CANCEL_PROMOTION: 'Huỷ khuyến mãi',
    DELETE_PROMOTION: 'Xoá khuyến mãi',
    CONFIRM_PAYMENT: 'Xác nhận thanh toán',
    CANCEL_ORDER: 'Huỷ đơn hàng'
};

/** Màu badge theo nhóm hành động (dùng lại các giá trị màu có sẵn của bảng): tạo/tiếp tục = xanh lá, cập nhật = xanh dương, tạm dừng = vàng, xoá/huỷ = đỏ. */
function getActionTone(action: string): string {
    if (action.startsWith('CREATE_') || action === 'RESUME_PROMOTION' || action === 'CONFIRM_PAYMENT') return 'ACTIVE';
    if (action.startsWith('UPDATE_')) return 'SCHEDULED';
    if (action === 'PAUSE_PROMOTION') return 'PAUSED';
    if (action.startsWith('DELETE_') || action.startsWith('CANCEL_')) return 'ENDED';
    return 'DRAFT';
}

@Component({
    selector: 'app-page-agent-activity-logs',
    imports: [
        AppTableComponent,
        FilterComponent
    ],
    templateUrl: './agent-activity-logs.html'
})
export class PageAgentActivityLogsComponent {
    private readonly activityLogService = inject(ActivityLogService);
    private readonly toastService = inject(ToastService);

    logs = signal<ActivityLogResponse[]>([]);
    loading = signal(false);

    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);

    asc = signal(false);

    filter = signal<ActivityLogFilter>({
        keyword: '',
        fromDate: '',
        toDate: ''
    });

    filterFields: FilterField[] = [
        {
            key: 'keyword',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Nội dung hoặc người thực hiện'
        },
        {
            key: 'fromDate',
            label: 'Từ ngày',
            type: 'date',
            placeholder: 'Từ ngày'
        },
        {
            key: 'toDate',
            label: 'Đến ngày',
            type: 'date',
            placeholder: 'Đến ngày'
        }
    ];

    columns: TableColumn[] = [
        {
            key: 'createdAt',
            label: 'Thời gian',
            width: '180px',
            type: 'date',
            sortable: true
        },
        {
            key: 'actorName',
            label: 'Người thực hiện',
            width: '200px'
        },
        {
            key: 'actionText',
            label: 'Hành động',
            width: '200px',
            align: 'center',
            type: 'badge'
        },
        {
            key: 'description',
            label: 'Mô tả'
        }
    ];

    constructor() {
        this.loadLogs();
    }

    rows(): TableRow[] {
        return this.logs().map(log => ({
            id: log.id,
            createdAt: log.createdAt,
            actorName: log.actorName || '—',
            actionText: {
                text: ACTION_TEXT[log.action] ?? log.action,
                value: getActionTone(log.action)
            },
            description: log.description
        }));
    }

    loadLogs(): void {
        this.loading.set(true);

        const filter = this.filter();

        const request: BaseSearchRequest<ActivityLogSearchRequest> = {
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: 'createdAt',
            asc: this.asc(),
            searchParams: {
                keyword: filter.keyword || null,
                fromDate: filter.fromDate || null,
                toDate: filter.toDate || null
            }
        };

        this.activityLogService.searchStoreLogs(request).subscribe({
            next: response => {
                this.loading.set(false);
                this.logs.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loading.set(false);
                this.toastService.error('Không tải được lịch sử hoạt động');
            }
        });
    }

    onFilterChange(value: ActivityLogFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.loadLogs();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadLogs();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadLogs();
    }

    onSortChange(): void {
        this.asc.set(!this.asc());
        this.page.set(1);
        this.loadLogs();
    }
}
