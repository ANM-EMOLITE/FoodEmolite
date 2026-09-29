import { Injectable } from '@angular/core';

export interface CartSnapshot<TItem> {
    items: TItem[];
    nextItemId: number;
    note: string;
}

/**
 * Giữ giỏ hàng theo từng cửa hàng khi chuyển trang trong app (vd: sang "Thông tin nhận hàng" rồi quay lại)
 * — trang đặt món bị huỷ khi rời đi nên không tự giữ được. Chỉ lưu trong bộ nhớ, tải lại trang là mất như trước.
 */
@Injectable({
    providedIn: 'root'
})
export class CartStateService {
    private readonly carts = new Map<string, CartSnapshot<unknown>>();

    get<TItem>(storeRefCode: string): CartSnapshot<TItem> | null {
        return (this.carts.get(storeRefCode) as CartSnapshot<TItem> | undefined) ?? null;
    }

    set<TItem>(storeRefCode: string, snapshot: CartSnapshot<TItem>): void {
        if (snapshot.items.length === 0 && !snapshot.note) {
            this.carts.delete(storeRefCode);
            return;
        }

        this.carts.set(storeRefCode, snapshot);
    }
}
