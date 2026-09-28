import { Injectable, signal } from '@angular/core';

/** Từ khoá tìm món ở màn bán hàng tại quầy (POS): ô tìm kiếm nằm trên topbar agent, trang đặt món đọc để lọc. */
@Injectable({
    providedIn: 'root'
})
export class PosSearchService {
    readonly keyword = signal('');
}
