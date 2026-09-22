import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import { BaseResponse, BaseTableResponse } from '../models/base-response.model';
import { BaseSearchRequest } from '../models/base-search.model';
import {
  CreateStoreFoodRequest,
  GetStoreFoodsRequest,
  StoreFoodOptionGroupRequest,
  StoreFoodOptionRequest,
  StoreFoodResponse,
  UpdateStoreFoodRequest
} from '../models/store-food.model';

@Injectable({
  providedIn: 'root'
})
export class StoreFoodService {
  private readonly apiService = inject(ApiService);

  getAll(
    page: number,
    pageSize: number
  ): Observable<BaseTableResponse<StoreFoodResponse>> {
    return this.apiService.get<BaseTableResponse<StoreFoodResponse>>(
      API_ENDPOINT.STORE_FOOD.BASE,
      {
        page,
        pageSize
      }
    );
  }

  getByStoreRefCode(
    storeRefCode: string,
    storeFoodCategoryId: number | null,
    page: number,
    pageSize: number,
    sortBy: string | null = null,
    asc: boolean = false,
    isAvailable: boolean | null = null
  ): Observable<BaseTableResponse<StoreFoodResponse>> {
    const request: BaseSearchRequest<GetStoreFoodsRequest> = {
      page,
      pageSize,
      sortBy,
      asc,
      searchParams: {
        storeRefCode,
        storeFoodCategoryId: storeFoodCategoryId ?? undefined,
        isAvailable: isAvailable ?? undefined
      }
    };

    return this.apiService.post<BaseTableResponse<StoreFoodResponse>, BaseSearchRequest<GetStoreFoodsRequest>>(
      API_ENDPOINT.STORE_FOOD.BY_STORE,
      request
    );
  }

  getDetail(
    id: number
  ): Observable<BaseResponse<StoreFoodResponse>> {
    return this.apiService.get<BaseResponse<StoreFoodResponse>>(
      API_ENDPOINT.STORE_FOOD.DETAIL(id)
    );
  }

  create(
    request: CreateStoreFoodRequest
  ): Observable<BaseResponse<string>> {
    const formData = this.toCreateFormData(request);

    return this.apiService.post<BaseResponse<string>, FormData>(
      API_ENDPOINT.STORE_FOOD.BASE,
      formData
    );
  }

  update(
    id: number,
    request: UpdateStoreFoodRequest
  ): Observable<BaseResponse<string>> {
    const formData = this.toUpdateFormData(request);

    return this.apiService.put<BaseResponse<string>, FormData>(
      API_ENDPOINT.STORE_FOOD.DETAIL(id),
      formData
    );
  }

  delete(
    id: number
  ): Observable<BaseResponse<string>> {
    return this.apiService.delete<BaseResponse<string>>(
      API_ENDPOINT.STORE_FOOD.DETAIL(id)
    );
  }

  private toCreateFormData(
    request: CreateStoreFoodRequest
  ): FormData {
    const formData = new FormData();

    formData.append('StoreRefCode', request.storeRefCode);
    formData.append('FoodName', request.foodName);

    if (request.productCode) {
      formData.append('ProductCode', request.productCode);
    }

    formData.append('Price', String(request.price));
    formData.append('Quantity', String(request.quantity));
    formData.append('Description', request.description ?? '');
    formData.append('StoreFoodCategoryId', String(request.storeFoodCategoryId));

    if (request.thumbnailFile) {
      formData.append('ThumbnailFile', request.thumbnailFile);
    }

    this.appendOptionGroups(formData, request.optionGroups ?? []);

    return formData;
  }

  private toUpdateFormData(
    request: UpdateStoreFoodRequest
  ): FormData {
    const formData = new FormData();

    formData.append('FoodName', request.foodName);
    formData.append('ProductCode', request.productCode);
    formData.append('Price', String(request.price));
    formData.append('Quantity', String(request.quantity));
    formData.append('IsAvailable', String(request.isAvailable));
    formData.append('Description', request.description ?? '');
    formData.append('StoreFoodCategoryId', String(request.storeFoodCategoryId));

    if (request.thumbnailFile) {
      formData.append('ThumbnailFile', request.thumbnailFile);
    }

    if (request.thumbnailUrl) {
      formData.append('ThumbnailUrl', request.thumbnailUrl);
    }

    this.appendOptionGroups(formData, request.optionGroups ?? []);

    return formData;
  }

  private appendOptionGroups(
    formData: FormData,
    optionGroups: StoreFoodOptionGroupRequest[]
  ): void {
    optionGroups.forEach((group, groupIndex) => {
      if (group.id) {
        formData.append(`OptionGroups[${groupIndex}].Id`, String(group.id));
      }

      formData.append(`OptionGroups[${groupIndex}].GroupName`, group.groupName);
      formData.append(`OptionGroups[${groupIndex}].IsRequired`, String(group.isRequired));
      formData.append(`OptionGroups[${groupIndex}].MinSelect`, String(group.minSelect));
      formData.append(`OptionGroups[${groupIndex}].MaxSelect`, String(group.maxSelect));
      formData.append(`OptionGroups[${groupIndex}].SortOrder`, String(group.sortOrder));
      formData.append(`OptionGroups[${groupIndex}].IsDeleted`, String(group.isDeleted ?? false));

      group.options.forEach((option, optionIndex) => {
        this.appendOption(
          formData,
          option,
          groupIndex,
          optionIndex
        );
      });
    });
  }

  private appendOption(
    formData: FormData,
    option: StoreFoodOptionRequest,
    groupIndex: number,
    optionIndex: number
  ): void {
    const prefix = `OptionGroups[${groupIndex}].Options[${optionIndex}]`;

    if (option.id) {
      formData.append(`${prefix}.Id`, String(option.id));
    }

    formData.append(`${prefix}.OptionName`, option.optionName);
    formData.append(`${prefix}.AdditionalPrice`, String(option.additionalPrice));
    formData.append(`${prefix}.IsAvailable`, String(option.isAvailable));
    formData.append(`${prefix}.SortOrder`, String(option.sortOrder));
    formData.append(`${prefix}.IsDeleted`, String(option.isDeleted ?? false));
  }
}