import {
    Component,
    inject,
    signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
    ApexAxisChartSeries,
    ApexChart,
    ApexDataLabels,
    ApexFill,
    ApexLegend,
    ApexNonAxisChartSeries,
    ApexPlotOptions,
    ApexResponsive,
    ApexStroke,
    ApexTooltip,
    ApexXAxis,
    ApexYAxis,
    NgApexchartsModule
} from 'ng-apexcharts';

import { RevenueService } from '../../../common/services/revenue.service';
import {
    AgentRevenueResponse,
    RevenueGroupBy
} from '../../../common/models/revenue.model';

import { DropdownComponent, DropdownOption } from '../../../shared/component/dropdown/dropdown';
import { ORDER_DISPLAY_STATUS_TEXT, OrderDisplayStatus } from '../../../common/utils/order-status';

export type LineChartOptions = {
    series: ApexAxisChartSeries;
    chart: ApexChart;
    xaxis: ApexXAxis;
    yaxis: ApexYAxis;
    stroke: ApexStroke;
    dataLabels: ApexDataLabels;
    tooltip: ApexTooltip;
    fill: ApexFill;
    colors: string[];
};

/** Màu dùng chung cho thẻ số liệu và biểu đồ — thẻ nào màu gì thì series tương ứng trên chart cùng màu đó. */
const CHART_COLORS = {
    revenue: '#10b981',
    orders: '#0ea5e9',
    PAID: '#10b981',
    UNPAID: '#f59e0b',
    CANCELLED: '#ef4444'
} as const;

export type DonutChartOptions = {
    series: ApexNonAxisChartSeries;
    chart: ApexChart;
    labels: string[];
    legend: ApexLegend;
    tooltip: ApexTooltip;
    dataLabels: ApexDataLabels;
    plotOptions: ApexPlotOptions;
    responsive: ApexResponsive[];
    colors: string[];
};

@Component({
    selector: 'app-agent-revenue',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        NgApexchartsModule,
        DropdownComponent
    ],
    templateUrl: './agent-revenue.html'
})
export class AgentRevenueComponent {
    private readonly revenueService = inject(RevenueService);

    readonly loading = signal(false);

    readonly fromDate = signal('');
    readonly toDate = signal('');
    readonly groupBy = signal<RevenueGroupBy>('day');

    readonly data = signal<AgentRevenueResponse | null>(null);
    openFromDatePicker = false;
    openToDatePicker = false;

    fromCalendarMonth = new Date().getMonth();
    fromCalendarYear = new Date().getFullYear();

    toCalendarMonth = new Date().getMonth();
    toCalendarYear = new Date().getFullYear();

    calendarMonth = new Date().getMonth();
    calendarYear = new Date().getFullYear();

    readonly weekDays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    readonly groupByOptions: DropdownOption[] = [
        {
            label: 'Theo ngày',
            value: 'day'
        },
        {
            label: 'Theo tháng',
            value: 'month'
        }
    ];

    readonly totalOrders = signal(0);
    readonly totalCancelledOrders = signal(0);
    readonly totalRevenue = signal(0);

    lineChartOptions: Partial<LineChartOptions> = this.getDefaultLineChartOptions();
    donutChartOptions: Partial<DonutChartOptions> = this.getDefaultDonutChartOptions();

    ngOnInit(): void {
        this.loadRevenue();
    }

    loadRevenue(): void {
        this.loading.set(true);

        this.revenueService
            .getAgentRevenue({
                fromDate: this.fromDate() || null,
                toDate: this.toDate() || null,
                groupBy: this.groupBy()
            })
            .subscribe({
                next: (res) => {
                    if (!res.isSuccess || !res.data) {
                        this.data.set(null);
                        this.totalOrders.set(0);
                        this.totalCancelledOrders.set(0);
                        this.totalRevenue.set(0);
                        this.updateCharts(null);
                        return;
                    }

                    this.data.set(res.data);
                    this.totalOrders.set(res.data.totalOrders);
                    this.totalCancelledOrders.set(res.data.totalCancelledOrders ?? 0);
                    this.totalRevenue.set(res.data.totalRevenue);
                    this.updateCharts(res.data);
                },
                complete: () => {
                    this.loading.set(false);
                },
                error: () => {
                    this.loading.set(false);
                }
            });
    }

    resetFilter(): void {
        this.fromDate.set('');
        this.toDate.set('');
        this.groupBy.set('day');
        this.loadRevenue();
    }

    onGroupByChange(value: unknown): void {
        this.groupBy.set(value as RevenueGroupBy);
    }

    toggleFromDatePicker() {
        this.openFromDatePicker = !this.openFromDatePicker;
        this.openToDatePicker = false;
    }

    toggleToDatePicker() {
        this.openToDatePicker = !this.openToDatePicker;
        this.openFromDatePicker = false;
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(value);
    }

    private updateCharts(data: AgentRevenueResponse | null): void {
        const lineItems = data?.lineChart ?? [];
        const pieItems = data?.pieChart ?? [];

        this.lineChartOptions = {
            ...this.getDefaultLineChartOptions(),
            series: [
                {
                    name: 'Doanh thu',
                    data: lineItems.map(x => x.revenue)
                },
                {
                    name: 'Số đơn',
                    data: lineItems.map(x => x.orderCount)
                }
            ],
            xaxis: {
                categories: lineItems.map(x => x.label),
                labels: {
                    style: {
                        colors: '#6b7280',
                        fontSize: '12px'
                    }
                }
            }
        };

        this.donutChartOptions = {
            ...this.getDefaultDonutChartOptions(),
            series: pieItems.map(x => x.value),
            labels: pieItems.map(x => this.getStatusLabel(x.label)),
            colors: pieItems.map(x => CHART_COLORS[x.label as keyof typeof CHART_COLORS] ?? '#a78bfa')
        };
    }

    private getDefaultLineChartOptions(): Partial<LineChartOptions> {
        return {
            series: [
                {
                    name: 'Doanh thu',
                    data: []
                },
                {
                    name: 'Số đơn',
                    data: []
                }
            ],
            chart: {
                type: 'line',
                height: 330,
                toolbar: {
                    show: false
                },
                zoom: {
                    enabled: false
                },
                fontFamily: 'inherit'
            },
            colors: [CHART_COLORS.revenue, CHART_COLORS.orders],
            stroke: {
                curve: 'smooth',
                width: [3, 2]
            },
            dataLabels: {
                enabled: false
            },
            fill: {
                opacity: 1
            },
            xaxis: {
                categories: [],
                labels: {
                    style: {
                        colors: '#6b7280',
                        fontSize: '12px'
                    }
                }
            },
            yaxis: {
                labels: {
                    formatter: (value: number) =>
                        value >= 1000000
                            ? `${Math.round(value / 1000000)}tr`
                            : `${Math.round(value)}`,
                    style: {
                        colors: '#6b7280',
                        fontSize: '12px'
                    }
                }
            },
            tooltip: {
                y: {
                    formatter: (value: number, opts) => {
                        const seriesName =
                            opts.w.globals.seriesNames[opts.seriesIndex];

                        if (seriesName === 'Doanh thu') {
                            return this.formatCurrency(value);
                        }

                        return `${Math.round(value)} đơn`;
                    }
                }
            }
        };
    }

    private getDefaultDonutChartOptions(): Partial<DonutChartOptions> {
        return {
            series: [],
            labels: [],
            colors: [],
            chart: {
                type: 'donut',
                height: 330,
                fontFamily: 'inherit'
            },
            legend: {
                position: 'bottom',
                fontSize: '13px',
                labels: {
                    colors: '#374151'
                }
            },
            dataLabels: {
                enabled: true,
                // formatter: (value: number) => `${value.toFixed(0)}%`
            },
            tooltip: {
                y: {
                    formatter: (value: number) => this.formatCurrency(value)
                }
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: '68%',
                        labels: {
                            show: true,
                            value: {
                                formatter: (value: string) =>
                                    this.formatCurrency(Number(value))
                            },
                            total: {
                                show: true,
                                label: 'Tổng',
                                formatter: () => {
                                    const total =
                                        (this.donutChartOptions.series as number[])
                                            ?.reduce((a, b) => a + b, 0) ?? 0;

                                    return this.formatCurrency(total);
                                }
                            }
                        }
                    }
                }
            },
            responsive: [
                {
                    breakpoint: 768,
                    options: {
                        chart: {
                            height: 280
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            ]
        };
    }

    previousMonth(): void {
        if (this.calendarMonth === 0) {
            this.calendarMonth = 11;
            this.calendarYear--;
        } else {
            this.calendarMonth--;
        }
    }

    nextMonth(): void {
        if (this.calendarMonth === 11) {
            this.calendarMonth = 0;
            this.calendarYear++;
        } else {
            this.calendarMonth++;
        }
    }

    previousFromMonth() {
        this.fromCalendarMonth--;

        if (this.fromCalendarMonth < 0) {
            this.fromCalendarMonth = 11;
            this.fromCalendarYear--;
        }
    }

    nextFromMonth() {
        this.fromCalendarMonth++;

        if (this.fromCalendarMonth > 11) {
            this.fromCalendarMonth = 0;
            this.fromCalendarYear++;
        }
    }

    previousToMonth() {
        this.toCalendarMonth--;

        if (this.toCalendarMonth < 0) {
            this.toCalendarMonth = 11;
            this.toCalendarYear--;
        }
    }

    nextToMonth() {
        this.toCalendarMonth++;

        if (this.toCalendarMonth > 11) {
            this.toCalendarMonth = 0;
            this.toCalendarYear++;
        }
    }

    formatDateDisplay(value: string): string {
        if (!value) {
            return '';
        }

        const date = new Date(value);

        return date.toLocaleDateString('vi-VN');
    }

    getCalendarDays(month: number, year: number) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDay = (firstDay.getDay() + 6) % 7;

        const days: {
            value: string;
            label: number;
            isCurrentMonth: boolean;
            isToday: boolean;
        }[] = [];

        const prevMonthLastDay = new Date(
            year,
            month,
            0
        ).getDate();

        for (let i = startDay - 1; i >= 0; i--) {
            const d = prevMonthLastDay - i;

            const date = new Date(
                year,
                month - 1,
                d
            );

            days.push({
                value: this.toDateValue(date),
                label: d,
                isCurrentMonth: false,
                isToday: this.isToday(date)
            });
        }

        for (let d = 1; d <= lastDay.getDate(); d++) {
            const date = new Date(
                year,
                month,
                d
            );

            days.push({
                value: this.toDateValue(date),
                label: d,
                isCurrentMonth: true,
                isToday: this.isToday(date)
            });
        }

        while (days.length < 42) {
            const next = days.length - (startDay + lastDay.getDate()) + 1;

            const date = new Date(
                year,
                month + 1,
                next
            );

            days.push({
                value: this.toDateValue(date),
                label: next,
                isCurrentMonth: false,
                isToday: this.isToday(date)
            });
        }

        return days;
    }

    selectFromDate(value: string): void {
        this.fromDate.set(value);
        this.openFromDatePicker = false;
    }

    clearFromDate(): void {
        this.fromDate.set('');
        this.openFromDatePicker = false;
    }

    selectTodayFrom(): void {
        const today = this.toDateValue(new Date());

        this.fromDate.set(today);

        this.fromCalendarMonth = new Date().getMonth();
        this.fromCalendarYear = new Date().getFullYear();

        this.openFromDatePicker = false;
    }

    selectToDate(value: string): void {
        this.toDate.set(value);
        this.openToDatePicker = false;
    }

    clearToDate(): void {
        this.toDate.set('');
        this.openToDatePicker = false;
    }

    selectTodayTo(): void {
        const today = this.toDateValue(new Date());

        this.toDate.set(today);

        this.toCalendarMonth = new Date().getMonth();
        this.toCalendarYear = new Date().getFullYear();
        
        this.openToDatePicker = false;
    }

    private toDateValue(date: Date): string {
        return date.toISOString().split('T')[0];
    }

    private isToday(date: Date): boolean {
        const today = new Date();

        return (
            today.getFullYear() === date.getFullYear() &&
            today.getMonth() === date.getMonth() &&
            today.getDate() === date.getDate()
        );
    }

    private getStatusLabel(value: string): string {
        return ORDER_DISPLAY_STATUS_TEXT[value as OrderDisplayStatus] ?? value;
    }
}