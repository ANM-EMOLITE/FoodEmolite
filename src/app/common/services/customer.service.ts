import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse, BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import { CustomerDetail, CustomerListItem, CustomerSearchRequest } from '../models/customer.model';

@Injectable({
    providedIn: 'root'
})
export class CustomerService {
    private readonly apiService = inject(ApiService);

    searchAgentCustomers(
        request: BaseSearchRequest<CustomerSearchRequest>
    ): Observable<BaseTableResponse<CustomerListItem>> {
        return this.apiService.post<
            BaseTableResponse<CustomerListItem>,
            BaseSearchRequest<CustomerSearchRequest>
        >(
            API_ENDPOINT.CUSTOMER.AGENT_SEARCH,
            request
        );
    }

    getAgentCustomerDetail(refCode: string, isGuest: boolean): Observable<BaseResponse<CustomerDetail>> {
        return this.apiService.get<BaseResponse<CustomerDetail>>(API_ENDPOINT.CUSTOMER.AGENT_DETAIL(refCode), { isGuest });
    }
}
