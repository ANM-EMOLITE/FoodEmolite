import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse, BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import { SaveSupplierRequest, SupplierResponse, SupplierSearchRequest } from '../models/supplier.model';

@Injectable({
    providedIn: 'root'
})
export class SupplierService {
    private readonly apiService = inject(ApiService);

    search(request: BaseSearchRequest<SupplierSearchRequest>): Observable<BaseTableResponse<SupplierResponse>> {
        return this.apiService.post<BaseTableResponse<SupplierResponse>, BaseSearchRequest<SupplierSearchRequest>>(
            API_ENDPOINT.SUPPLIER.SEARCH,
            request
        );
    }

    getDetail(id: number): Observable<BaseResponse<SupplierResponse>> {
        return this.apiService.get<BaseResponse<SupplierResponse>>(API_ENDPOINT.SUPPLIER.DETAIL(id));
    }

    create(request: SaveSupplierRequest): Observable<BaseResponse<string>> {
        return this.apiService.post<BaseResponse<string>, SaveSupplierRequest>(API_ENDPOINT.SUPPLIER.BASE, request);
    }

    update(id: number, request: SaveSupplierRequest): Observable<BaseResponse<string>> {
        return this.apiService.put<BaseResponse<string>, SaveSupplierRequest>(API_ENDPOINT.SUPPLIER.DETAIL(id), request);
    }

    delete(id: number): Observable<BaseResponse<string>> {
        return this.apiService.delete<BaseResponse<string>>(API_ENDPOINT.SUPPLIER.DETAIL(id));
    }
}
