import { inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse } from '../models/base-response.model';
import { StoreNotificationListResponse } from '../models/store-notification.model';

/** Thông báo (chuông topbar) của cửa hàng mà đại lý đang đăng nhập sở hữu — được lưu ở BE. */
@Injectable({
    providedIn: 'root'
})
export class StoreNotificationService {
    private readonly apiService = inject(ApiService);

    /** Số thông báo chưa đọc — topbar (chuông) cập nhật, sidebar (badge mục "Thông Báo") hiển thị. */
    readonly unreadCount = signal(0);

    private readonly changedSubject = new Subject<void>();
    /** Phát khi trạng thái đã đọc thay đổi ở một nơi (vd: trang Thông báo) để nơi khác (chuông topbar) tải lại. */
    readonly changed$ = this.changedSubject.asObservable();

    notifyChanged(): void {
        this.changedSubject.next();
    }

    /**
     * isRead: null = tất cả, true = đã đọc, false = chưa đọc.
     * days: chỉ lấy N ngày gần nhất (null = tất cả) — khi có thì số chưa đọc cũng chỉ tính trong khoảng này.
     */
    getMyStore(page = 1, pageSize = 20, isRead: boolean | null = null, days: number | null = null): Observable<BaseResponse<StoreNotificationListResponse>> {
        return this.apiService.get<BaseResponse<StoreNotificationListResponse>>(
            API_ENDPOINT.STORE_NOTIFICATION.BASE,
            {
                page,
                pageSize,
                ...(isRead === null ? {} : { isRead }),
                ...(days === null ? {} : { days })
            }
        );
    }

    markRead(id: number): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.STORE_NOTIFICATION.READ(id),
            null
        );
    }

    markAllRead(): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.STORE_NOTIFICATION.READ_ALL,
            null
        );
    }
}
