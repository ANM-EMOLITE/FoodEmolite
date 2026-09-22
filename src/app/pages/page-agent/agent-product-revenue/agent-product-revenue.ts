import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
    ApexAxisChartSeries,
    ApexChart,
    ApexDataLabels,
    ApexGrid,
    ApexPlotOptions,
    ApexTheme,
    ApexTooltip,
    ApexXAxis,
    ApexYAxis,
    NgApexchartsModule
} from 'ng-apexcharts';

import { RevenueService } from '../../../common/services/revenue.service';
import { OrderService } from '../../../common/services/order.service';
import { ProfileService } from '../../../common/services/profile.service';
import { ToastService } from '../../../common/services/toast.service';
import { TopSellingProduct } from '../../../common/models/revenue.model';
import { OrderResponse } from '../../../common/models/order.model';
import { BaseSearchRequest } from '../../../common/models/base-search.model';

import { AppTableComponent } from '../../../shared/component/table/table';
import { FilterComponent } from '../../../shared/component/filter/filter';
import { DatePickerComponent } from '../../../shared/component/date-picker/date-picker';
import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';
import {
    TableColumn,
    TableRow
} from '../../../common/models/front-end/table/table-column.model';

export type BarChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    theme: ApexTheme;
    colors: string[];
    grid: ApexGrid;
    plotOptions: ApexPlotOptions;
    dataLabels: ApexDataLabels;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    tooltip: ApexTooltip;
};

type RevenueTab = 'PRODUCT' | 'ORDER';

interface ProductFilter {
    keyword: string;
}

@Component({
    selector: 'app-agent-product-revenue',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NgApexchartsModule,
        DatePickerComponent,
        AppTableComponent,
        FilterComponent
    ],
    templateUrl: './agent-product-revenue.html'
})
export class AgentProductRevenueComponent {
    private readonly revenueService = inject(RevenueService);
    private readonly orderService = inject(OrderService);
    private readonly profileService = inject(ProfileService);
    private readonly toastService = inject(ToastService);

    readonly loadingChart = signal(false);
    readonly loadingTable = signal(false);

    readonly fromDate = signal('');
    readonly toDate = signal('');
    readonly activeTab = signal<RevenueTab>('PRODUCT');

    readonly storeRefCode = signal<string | null>(null);
    readonly topProducts = signal<TopSellingProduct[]>([]);

    readonly products = signal<TopSellingProduct[]>([]);
    readonly orders = signal<OrderResponse[]>([]);

    page = signal(1);
    pageSize = signal(20);
    totalPages = signal(1);
    totalRecords = signal(0);

    filter = signal<ProductFilter>({ keyword: '' });

    filterFields: FilterField[] = [
        {
            key: 'keyword',
            label: 'Tìm kiếm',
            type: 'text',
            placeholder: 'Tên món'
        }
    ];

    productColumns: TableColumn[] = [
        {
            key: 'index',
            label: 'STT',
            width: '60px',
            align: 'center'
        },
        {
            key: 'thumbnailUrl',
            label: 'Ảnh',
            width: '70px',
            align: 'center',
            type: 'image'
        },
        {
            key: 'foodName',
            label: 'Tên sản phẩm'
        },
        {
            key: 'quantitySold',
            label: 'Số lượng bán',
            width: '160px',
            align: 'center',
            sortable: true
        },
        {
            key: 'revenue',
            label: 'Doanh thu',
            width: '180px',
            align: 'right',
            sortable: true
        }
    ];

    orderColumns: TableColumn[] = [
        {
            key: 'index',
            label: 'STT',
            width: '60px',
            align: 'center'
        },
        {
            key: 'orderCode',
            label: 'Mã đơn',
            width: '200px'
        },
        {
            key: 'customerName',
            label: 'Khách hàng'
        },
        {
            key: 'itemCount',
            label: 'Số món',
            width: '120px',
            align: 'center'
        },
        {
            key: 'totalAmount',
            label: 'Doanh thu',
            width: '180px',
            align: 'right'
        },
        {
            key: 'createdAt',
            label: 'Ngày tạo',
            width: '180px'
        }
    ];

    barChartOptions: Partial<BarChartOptions> = this.getDefaultBarChartOptions();

    constructor() {
        this.loadMyStore();
    }

    loadMyStore(): void {
        this.profileService.getMyProfile().subscribe({
            next: response => {
                if (!response.isSuccess || !response.data?.store?.refCode) {
                    this.toastService.error('Không tìm thấy cửa hàng của đại lý');
                    return;
                }

                this.storeRefCode.set(response.data.store.refCode);
                this.loadTopProducts();
                this.loadTable();
            },
            error: () => {
                this.toastService.error('Không tải được thông tin đại lý');
            }
        });
    }

    loadTopProducts(): void {
        this.loadingChart.set(true);

        this.revenueService
            .getAgentTopProducts({
                fromDate: this.fromDate() || null,
                toDate: this.toDate() || null
            }, 10)
            .subscribe({
                next: response => {
                    this.loadingChart.set(false);

                    if (!response.isSuccess || !response.data) {
                        this.topProducts.set([]);
                        this.updateBarChart([]);
                        return;
                    }

                    this.topProducts.set(response.data);
                    this.updateBarChart(response.data);
                },
                error: () => {
                    this.loadingChart.set(false);
                    this.toastService.error('Không tải được top sản phẩm bán chạy');
                }
            });
    }

    selectTab(tab: RevenueTab): void {
        if (this.activeTab() === tab) {
            return;
        }

        this.activeTab.set(tab);
        this.page.set(1);
        this.loadTable();
    }

    loadTable(): void {
        if (this.activeTab() === 'PRODUCT') {
            this.loadProductTable();
        } else {
            this.loadOrderTable();
        }
    }

    loadProductTable(): void {
        this.loadingTable.set(true);

        const request: BaseSearchRequest<{
            fromDate: string | null;
            toDate: string | null;
            keyword: string | null;
        }> = {
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: 'revenue',
            asc: false,
            searchParams: {
                fromDate: this.fromDate() || null,
                toDate: this.toDate() || null,
                keyword: this.filter().keyword || null
            }
        };

        this.revenueService.searchAgentProductRevenue(request).subscribe({
            next: response => {
                this.loadingTable.set(false);
                this.products.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loadingTable.set(false);
                this.toastService.error('Không tải được doanh thu theo sản phẩm');
            }
        });
    }

    loadOrderTable(): void {
        const refCode = this.storeRefCode();

        if (!refCode) {
            return;
        }

        this.loadingTable.set(true);

        this.orderService.getByStoreRefCode({
            page: this.page(),
            pageSize: this.pageSize(),
            sortBy: 'createdAt',
            asc: false,
            searchParams: {
                storeRefCode: refCode,
                paymentStatus: 'PAID',
                fromDate: this.fromDate() || null,
                toDate: this.toDate() || null,
                keyword: this.filter().keyword || null
            }
        }).subscribe({
            next: response => {
                this.loadingTable.set(false);
                this.orders.set(response.items ?? []);
                this.totalPages.set(response.totalPages);
                this.totalRecords.set(response.totalRecords);
            },
            error: () => {
                this.loadingTable.set(false);
                this.toastService.error('Không tải được doanh thu theo đơn hàng');
            }
        });
    }

    productRows(): TableRow[] {
        return this.products().map((product, index) => ({
            index: (this.page() - 1) * this.pageSize() + index + 1,
            thumbnailUrl: product.thumbnailUrl,
            foodName: product.foodName,
            quantitySold: product.quantitySold,
            revenue: this.formatCurrency(product.revenue)
        }));
    }

    orderRows(): TableRow[] {
        return this.orders().map((order, index) => ({
            index: (this.page() - 1) * this.pageSize() + index + 1,
            orderCode: order.orderCode,
            customerName: order.customerName,
            itemCount: order.items?.length ?? 0,
            totalAmount: this.formatCurrency(order.totalAmount),
            createdAt: new Date(order.createdAt).toLocaleString('vi-VN')
        }));
    }

    applyFilter(): void {
        this.loadTopProducts();
        this.page.set(1);
        this.loadTable();
    }

    resetFilter(): void {
        this.fromDate.set('');
        this.toDate.set('');
        this.filter.set({ keyword: '' });
        this.applyFilter();
    }

    onFilterChange(value: ProductFilter): void {
        this.filter.set(value);
        this.page.set(1);
        this.loadTable();
    }

    onPageSizeChange(size: number): void {
        this.pageSize.set(size);
        this.page.set(1);
        this.loadTable();
    }

    onPageChange(page: number): void {
        this.page.set(page);
        this.loadTable();
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    }

    private updateBarChart(items: TopSellingProduct[]): void {
        const sorted = [...items].reverse();

        this.barChartOptions = {
            ...this.getDefaultBarChartOptions(),
            series: [
                {
                    name: 'Số lượng bán',
                    data: sorted.map(x => x.quantitySold)
                }
            ],
            xaxis: {
                categories: sorted.map(x => x.foodName),
                labels: {
                    style: {
                        colors: '#6b7280',
                        fontSize: '12px'
                    }
                }
            }
        };
    }

    private getDefaultBarChartOptions(): Partial<BarChartOptions> {
        return {
            series: [{ name: 'Số lượng bán', data: [] }],
            chart: {
                type: 'bar',
                height: 380,
                toolbar: { show: false },
                fontFamily: 'inherit',
                foreColor: '#6b7280'
            },
            theme: {
                mode: 'light'
            },
            colors: ['#7c3aed'],
            grid: {
                borderColor: 'rgba(0,0,0,0.08)'
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    borderRadius: 4,
                    barHeight: '55%'
                }
            },
            dataLabels: {
                enabled: false
            },
            yaxis: {
                labels: {
                    style: {
                        colors: '#6b7280',
                        fontSize: '12px'
                    }
                }
            },
            tooltip: {
                y: {
                    formatter: (value: number) => `${value} đã bán`
                }
            }
        };
    }
}
