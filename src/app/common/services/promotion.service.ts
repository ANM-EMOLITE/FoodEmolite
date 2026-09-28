import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse, BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import {
    CreatePromotionRequest,
    PromotionResponse,
    PromotionSearchRequest,
    PromotionStatsResponse
} from '../models/promotion.model';

@Injectable({
    providedIn: 'root'
})
export class PromotionService {
    private readonly apiService = inject(ApiService);

    search(
        request: BaseSearchRequest<PromotionSearchRequest>
    ): Observable<BaseTableResponse<PromotionResponse>> {
        return this.apiService.post<
            BaseTableResponse<PromotionResponse>,
            BaseSearchRequest<PromotionSearchRequest>
        >(
            API_ENDPOINT.PROMOTION.SEARCH,
            request
        );
    }

    getDetail(id: number): Observable<BaseResponse<PromotionResponse>> {
        return this.apiService.get<BaseResponse<PromotionResponse>>(
            API_ENDPOINT.PROMOTION.DETAIL(id)
        );
    }

    getStats(id: number): Observable<BaseResponse<PromotionStatsResponse>> {
        return this.apiService.get<BaseResponse<PromotionStatsResponse>>(
            API_ENDPOINT.PROMOTION.STATS(id)
        );
    }

    /** Danh sách promotion đang ACTIVE của 1 cửa hàng — công khai, không cần đăng nhập. */
    getActiveByStore(storeRefCode: string): Observable<BaseResponse<PromotionResponse[]>> {
        return this.apiService.get<BaseResponse<PromotionResponse[]>>(
            API_ENDPOINT.PROMOTION.ACTIVE_BY_STORE(storeRefCode)
        );
    }

    /** Khách hiện tại (theo deviceId nếu là khách vãng lai, hoặc theo token nếu đã đăng nhập) có đủ
     * điều kiện dùng chương trình giảm giá "toàn bộ sản phẩm" đang active của cửa hàng hay không. */
    checkStoreWideDiscountEligibility(storeRefCode: string, deviceId?: string | null): Observable<BaseResponse<boolean>> {
        return this.apiService.get<BaseResponse<boolean>>(
            API_ENDPOINT.PROMOTION.STORE_WIDE_DISCOUNT_ELIGIBILITY(storeRefCode),
            deviceId ? { deviceId } : undefined
        );
    }

    create(request: CreatePromotionRequest): Observable<BaseResponse<string>> {
        return this.apiService.post<BaseResponse<string>, CreatePromotionRequest>(
            API_ENDPOINT.PROMOTION.BASE,
            request
        );
    }

    /** Chỉ áp dụng khi chương trình đang ở dạng nháp (DRAFT). */
    update(id: number, request: CreatePromotionRequest): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, CreatePromotionRequest>(
            API_ENDPOINT.PROMOTION.DETAIL(id),
            request
        );
    }

    pause(id: number): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.PROMOTION.PAUSE(id),
            null
        );
    }

    resume(id: number): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.PROMOTION.RESUME(id),
            null
        );
    }

    cancel(id: number): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.PROMOTION.CANCEL(id),
            null
        );
    }

    delete(id: number): Observable<BaseResponse<string>> {
        return this.apiService.delete<BaseResponse<string>>(
            API_ENDPOINT.PROMOTION.DETAIL(id)
        );
    }
}
