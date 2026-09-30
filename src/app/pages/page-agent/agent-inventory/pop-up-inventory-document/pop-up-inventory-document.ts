import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { InventoryReceiptResponse, InventoryStocktakeResponse } from '../../../../common/models/inventory.model';

@Component({
    selector: 'app-pop-up-inventory-document',
    imports: [DatePipe],
    templateUrl: './pop-up-inventory-document.html'
})
export class PopUpInventoryDocumentComponent {
    readonly receipt = input<InventoryReceiptResponse | null>(null);
    readonly stocktake = input<InventoryStocktakeResponse | null>(null);

    readonly closed = output<void>();

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    }

    formatDifference(value: number): string {
        return value > 0 ? `+${value}` : `${value}`;
    }
}
