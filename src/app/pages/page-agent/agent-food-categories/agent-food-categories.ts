import { Component, inject, signal } from '@angular/core';

import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';

import { ToastService } from '../../../common/services/toast.service';
import { StoreFoodCategoryService } from '../../../common/services/store-food-category.service';

import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';

import {
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';

import {
    CreateStoreFoodCategoryRequest,
    StoreFoodCategoryResponse,
    StoreFoodCategorySearchRequest
} from '../../../common/models/store-food-category.model';

import { BaseSearchRequest } from '../../../common/models/base-search.model';

import { PopUpAgentFoodCategoryAddComponent } from './pop-up-agent-food-category-add/pop-up-agent-food-category-add';

interface StoreFoodCategoryFilter {
    keyword: string;
}

@Component({
    selector: 'app-page-agent-food-categories',
    standalone: true,
    imports: [
        AppTableComponent,
        FilterComponent,
        PopUpAgentFoodCategoryAddComponent
    ],
    templateUrl: './agent-food-categories.html'
})
export class PageAgentFoodCategoriesComponent {
    private readonly categoryService =
        inject(StoreFoodCategoryService);

    private readonly toastService =
        inject(ToastService);

    categories =
        signal<StoreFoodCategoryResponse[]>([]);

    loading = signal(false);

    isSubmitting = signal(false);

    isAddOpen = signal(false);

    page = signal(1);

    pageSize = signal(20);

    totalPages = signal(1);

    totalRecords = signal(0);

    sortBy = signal('');

    asc = signal(false);

    filter =
        signal<StoreFoodCategoryFilter>({
            keyword: ''
        });

    columns: TableColumn[] = [
        {
            key: 'index',
            label: 'STT',
            width: '80px',
            align: 'center'
        },
        {
            key: 'categoryName',
            label: 'Tên danh mục',
            sortable: true
        },
        {
            key: 'description',
            label: 'Mô tả'
        },
        {
            key: 'createdAt',
            label: 'Ngày tạo',
            width: '180px',
            sortable: true
        }
    ];

    filterFields: FilterField[] = [
        {
            key: 'keyword',
            label: 'Tên danh mục',
            type: 'text',
            placeholder: 'Nhập tên danh mục'
        }
    ];

    constructor() {
        this.loadCategories();
    }

    rows(): TableRow[] {
        return this.categories().map((x, index) => ({
            index:
                (this.page() - 1)
                * this.pageSize()
                + index + 1,

            id: x.id,

            refCode: x.refCode,

            categoryName: x.categoryName,

            description:
                x.description ?? '',

            createdAt:
                this.formatDate(x.createdAt)
        }));
    }

    loadCategories(): void {
        this.loading.set(true);

        const request:
            BaseSearchRequest<StoreFoodCategorySearchRequest> = {
            page: this.page(),
            pageSize: this.pageSize(),

            sortBy:
                this.sortBy() || undefined,

            asc:
                this.asc(),

            searchParams: {
                keyword:
                    this.filter().keyword
            }
        };

        this.categoryService
            .search(request)
            .subscribe({
                next: response => {
                    this.loading.set(false);

                    this.categories.set(
                        response.items ?? []
                    );

                    this.totalPages.set(
                        response.totalPages
                    );

                    this.totalRecords.set(
                        response.totalRecords
                    );
                },
                error: () => {
                    this.loading.set(false);

                    this.toastService.error(
                        'Không tải được danh mục'
                    );
                }
            });
    }

    openCreateModal(): void {
        this.isAddOpen.set(true);
    }

    closeCreateModal(): void {
        this.isAddOpen.set(false);
    }

    createCategory(
        request: CreateStoreFoodCategoryRequest
    ): void {
        this.isSubmitting.set(true);

        this.categoryService
            .create(request)
            .subscribe({
                next: response => {
                    this.isSubmitting.set(false);

                    if (!response.isSuccess) {
                        this.toastService.error(
                            response.message
                        );

                        return;
                    }

                    this.toastService.success(
                        response.message
                    );

                    this.closeCreateModal();

                    this.loadCategories();
                },
                error: () => {
                    this.isSubmitting.set(false);

                    this.toastService.error(
                        'Thêm danh mục thất bại'
                    );
                }
            });
    }

    deleteCategory(
        id: number
    ): void {
        this.isSubmitting.set(true);

        this.categoryService
            .delete(id)
            .subscribe({
                next: response => {
                    this.isSubmitting.set(false);

                    if (!response.isSuccess) {
                        this.toastService.error(
                            response.message
                        );

                        return;
                    }

                    this.toastService.success(
                        response.message
                    );

                    this.loadCategories();
                },
                error: () => {
                    this.isSubmitting.set(false);

                    this.toastService.error(
                        'Xóa danh mục thất bại'
                    );
                }
            });
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadCategories();
    }

    onPageChange(
        page: number
    ): void {
        this.page.set(page);

        this.loadCategories();
    }

    onFilterChange(
        value: StoreFoodCategoryFilter
    ): void {
        this.filter.set(value);

        this.page.set(1);

        this.loadCategories();
    }

    onSortChange(
        key: string
    ): void {
        if (this.sortBy() === key) {
            this.asc.set(!this.asc());
        } else {
            this.sortBy.set(key);

            this.asc.set(true);
        }

        this.loadCategories();
    }

    private formatDate(
        value: string
    ): string {
        return new Date(value)
            .toLocaleDateString('vi-VN');
    }
}