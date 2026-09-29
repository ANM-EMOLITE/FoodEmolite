import { computed, Injectable, signal } from '@angular/core';
import { DeliveryAddressValue, EMPTY_DELIVERY_ADDRESS } from '../models/address.model';
import { getFullDeliveryAddress } from '../utils/delivery-address';

const STORAGE_KEY = 'fe_delivery_address';

/**
 * Thông tin nhận hàng của khách (SĐT, địa chỉ, ghim bản đồ) — nhập ở trang "Thông tin nhận hàng",
 * lưu trên máy (localStorage) và tự gửi kèm khi đặt đơn. Không bắt buộc: chưa nhập vẫn đặt đơn được.
 */
@Injectable({
    providedIn: 'root'
})
export class DeliveryInfoService {
    readonly info = signal<DeliveryAddressValue>(this.load());

    /** Đã có ít nhất SĐT, địa chỉ hoặc ghim bản đồ. */
    readonly hasInfo = computed(() => {
        const v = this.info();

        return !!v.phone || !!v.provinceName || !!v.street.trim() || v.latitude !== null;
    });

    /** "123 Lê Lợi, Phường Bến Thành, Thành phố Hồ Chí Minh" — rỗng nếu chỉ có ghim / SĐT. */
    readonly addressText = computed(() => {
        const v = this.info();

        return getFullDeliveryAddress({
            deliveryStreet: v.street,
            deliveryWardName: v.wardName,
            deliveryProvinceName: v.provinceName
        });
    });

    save(value: DeliveryAddressValue): void {
        const cleaned: DeliveryAddressValue = {
            ...value,
            phone: value.phone.replace(/[\s.-]/g, ''),
            street: value.street.trim()
        };

        this.info.set(cleaned);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        } catch {
            // Trình duyệt chặn lưu trữ — vẫn dùng được trong phiên hiện tại
        }
    }

    /** Các field gửi kèm request tạo đơn (CreateOrderRequest.delivery*). */
    toOrderRequest() {
        const v = this.info();

        return {
            deliveryPhone: v.phone || null,
            deliveryProvinceCode: v.provinceCode,
            deliveryProvinceName: v.provinceName,
            deliveryWardCode: v.wardCode,
            deliveryWardName: v.wardName,
            deliveryStreet: v.street || null,
            deliveryLatitude: v.latitude,
            deliveryLongitude: v.longitude
        };
    }

    private load(): DeliveryAddressValue {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) return { ...EMPTY_DELIVERY_ADDRESS };

            const saved = { ...EMPTY_DELIVERY_ADDRESS, ...(JSON.parse(raw) as Partial<DeliveryAddressValue>) };

            // Chỉ giữ Tỉnh/Phường khi có đủ mã + tên (dữ liệu cũ chỉ có mã)
            if (!saved.provinceCode || !saved.provinceName) {
                Object.assign(saved, { provinceCode: null, provinceName: null, wardCode: null, wardName: null });
            } else if (!saved.wardCode || !saved.wardName) {
                Object.assign(saved, { wardCode: null, wardName: null });
            }

            if (saved.latitude === null || saved.longitude === null) {
                Object.assign(saved, { latitude: null, longitude: null, locationSource: null });
            }

            return saved;
        } catch {
            return { ...EMPTY_DELIVERY_ADDRESS };
        }
    }
}
