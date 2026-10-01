import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse, BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import {
    CreateInventoryReceiptRequest,
    CreateInventoryStocktakeRequest,
    InventoryDocumentSearchRequest,
    InventoryReceiptResponse,
    InventoryReceiptSearchRequest,
    InventoryStocktakeResponse,
    InventoryTransactionResponse,
    InventoryTransactionSearchRequest
} from '../models/inventory.model';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private readonly apiService = inject(ApiService);

    searchTransactions(request: BaseSearchRequest<InventoryTransactionSearchRequest>): Observable<BaseTableResponse<InventoryTransactionResponse>> {
        return this.apiService.post<BaseTableResponse<InventoryTransactionResponse>, BaseSearchRequest<InventoryTransactionSearchRequest>>(
            API_ENDPOINT.INVENTORY.TRANSACTIONS_SEARCH,
            request
        );
    }

    searchReceipts(request: BaseSearchRequest<InventoryReceiptSearchRequest>): Observable<BaseTableResponse<InventoryReceiptResponse>> {
        return this.apiService.post<BaseTableResponse<InventoryReceiptResponse>, BaseSearchRequest<InventoryReceiptSearchRequest>>(
            API_ENDPOINT.INVENTORY.RECEIPTS_SEARCH,
            request
        );
    }

    getReceipt(id: number): Observable<BaseResponse<InventoryReceiptResponse>> {
        return this.apiService.get<BaseResponse<InventoryReceiptResponse>>(API_ENDPOINT.INVENTORY.RECEIPT_DETAIL(id));
    }

    createReceipt(request: CreateInventoryReceiptRequest): Observable<BaseResponse<string>> {
        return this.apiService.post<BaseResponse<string>, CreateInventoryReceiptRequest>(API_ENDPOINT.INVENTORY.RECEIPTS, request);
    }

    searchStocktakes(request: BaseSearchRequest<InventoryDocumentSearchRequest>): Observable<BaseTableResponse<InventoryStocktakeResponse>> {
        return this.apiService.post<BaseTableResponse<InventoryStocktakeResponse>, BaseSearchRequest<InventoryDocumentSearchRequest>>(
            API_ENDPOINT.INVENTORY.STOCKTAKES_SEARCH,
            request
        );
    }

    getStocktake(id: number): Observable<BaseResponse<InventoryStocktakeResponse>> {
        return this.apiService.get<BaseResponse<InventoryStocktakeResponse>>(API_ENDPOINT.INVENTORY.STOCKTAKE_DETAIL(id));
    }

    createStocktake(request: CreateInventoryStocktakeRequest): Observable<BaseResponse<string>> {
        return this.apiService.post<BaseResponse<string>, CreateInventoryStocktakeRequest>(API_ENDPOINT.INVENTORY.STOCKTAKES, request);
    }
}
