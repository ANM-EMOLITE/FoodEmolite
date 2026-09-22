import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse } from '../models/base-response.model';
import { BaseTableResponse } from '../models/base-response.model';
import {
    CreateGuestOrderRequest,
    CreateOrderRequest,
    CreateOrderResponse,
    OrderResponse,
    OrderSearchRequest,
    UpdateOrderStatusRequest,
    UpdatePaymentStatusRequest
} from '../models/order.model';
import { BaseSearchRequest } from '../models/base-search.model';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    private readonly apiService = inject(ApiService);

    create(
        request: CreateOrderRequest
    ): Observable<BaseResponse<CreateOrderResponse>> {
        return this.apiService.post<
            BaseResponse<CreateOrderResponse>,
            CreateOrderRequest
        >(
            API_ENDPOINT.ORDER.BASE,
            request
        );
    }

    createGuest(
        request: CreateGuestOrderRequest
    ): Observable<BaseResponse<CreateOrderResponse>> {
        return this.apiService.post<
            BaseResponse<CreateOrderResponse>,
            CreateGuestOrderRequest
        >(
            API_ENDPOINT.ORDER.GUEST,
            request
        );
    }

    getPaymentStatus(orderCode: string) {
        return this.apiService.get<BaseResponse<string>>(
            API_ENDPOINT.ORDER.PAYMENT_STATUS(orderCode)
        );
    }

    getMyOrders(
        page: number = 1,
        pageSize: number = 10
    ): Observable<BaseTableResponse<OrderResponse>> {
        return this.apiService.get<BaseTableResponse<OrderResponse>>(
            `${API_ENDPOINT.ORDER.MY}?page=${page}&pageSize=${pageSize}`
        );
    }

    getDetail(
        id: number
    ): Observable<BaseResponse<OrderResponse>> {
        return this.apiService.get<BaseResponse<OrderResponse>>(
            API_ENDPOINT.ORDER.DETAIL(id)
        );
    }

    /** Chi tiết đơn hàng cho đại lý — lọc theo cửa hàng của đại lý thay vì theo khách hàng đặt đơn. */
    getStoreDetail(
        id: number
    ): Observable<BaseResponse<OrderResponse>> {
        return this.apiService.get<BaseResponse<OrderResponse>>(
            API_ENDPOINT.ORDER.STORE_DETAIL(id)
        );
    }

    getStorePaymentInfo(orderCode: string) {
        return this.apiService.get<any>(
            API_ENDPOINT.PROFILE.STORE_PAYMENT(orderCode)
        );
    }

    getByStoreRefCode(
        request: BaseSearchRequest<OrderSearchRequest>
    ): Observable<BaseTableResponse<OrderResponse>> {
        return this.apiService.post<
            BaseTableResponse<OrderResponse>,
            BaseSearchRequest<OrderSearchRequest>
        >(
            API_ENDPOINT.ORDER.BY_STORE,
            request
        );
    }

    updateStatus(
        id: number,
        request: UpdateOrderStatusRequest
    ): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, UpdateOrderStatusRequest>(
            API_ENDPOINT.ORDER.STATUS(id),
            request
        );
    }

    updatePaymentStatus(
        id: number,
        request: UpdatePaymentStatusRequest
    ): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, UpdatePaymentStatusRequest>(
            API_ENDPOINT.ORDER.STATUS_PAYMENT(id),
            request
        );
    }

    cancelOrder(id: number): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, null>(
            API_ENDPOINT.ORDER.ORDER_CANCEL(id),
            null
        );
    }

    checkPendingOrder(deviceId: string): Observable<BaseResponse<string | null>> {
        return this.apiService.get<BaseResponse<string | null>>(
            API_ENDPOINT.ORDER.PENDING_ORDER,
            {
                deviceId
            }
        );
    }
}