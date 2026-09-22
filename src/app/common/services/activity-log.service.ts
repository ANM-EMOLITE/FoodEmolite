import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import { ActivityLogResponse, ActivityLogSearchRequest } from '../models/activity-log.model';

@Injectable({
    providedIn: 'root'
})
export class ActivityLogService {
    private readonly apiService = inject(ApiService);

    /** Lịch sử hoạt động liên quan tới cửa hàng của đại lý đang đăng nhập (không gồm log tạo đơn). */
    searchStoreLogs(
        request: BaseSearchRequest<ActivityLogSearchRequest>
    ): Observable<BaseTableResponse<ActivityLogResponse>> {
        return this.apiService.post<
            BaseTableResponse<ActivityLogResponse>,
            BaseSearchRequest<ActivityLogSearchRequest>
        >(
            API_ENDPOINT.ACTIVITY_LOG.STORE_SEARCH,
            request
        );
    }
}
