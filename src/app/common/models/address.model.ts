/** Tỉnh/Thành phố hoặc Phường/Xã — danh mục open-source provinces.open-api.vn (sau sáp nhập 01/07/2025). */
export interface AdministrativeUnit {
    code: string;
    name: string;
}

/** Kết quả đổi tọa độ GPS -> địa chỉ (Photon / OpenStreetMap), chưa khớp với danh mục. */
export interface ReverseGeocodeResult {
    /** Các tên có thể là Tỉnh/Thành phố, ưu tiên theo thứ tự. */
    provinceCandidates: string[];
    /** Các tên có thể là Phường/Xã, ưu tiên theo thứ tự. */
    wardCandidates: string[];
    /** "17 Phố Trần Nguyên Hãn" — rỗng nếu không có. */
    street: string;
}

/**
 * Ghim trên bản đồ đến từ đâu:
 * - gps: vị trí thiết bị; map: khách tự chạm / kéo ghim — coi như khách đã xác nhận vị trí.
 * - address: tự đặt theo Tỉnh/Phường/đường đã nhập — chỉ gần đúng, vẫn bắt nhập đủ địa chỉ.
 */
export type LocationSource = 'gps' | 'map' | 'address';

/** Giá trị form địa chỉ giao hàng (xem DeliveryAddressFormComponent). */
export interface DeliveryAddressValue {
    phone: string;
    provinceCode: string | null;
    provinceName: string | null;
    wardCode: string | null;
    wardName: string | null;
    street: string;
    latitude: number | null;
    longitude: number | null;
    locationSource: LocationSource | null;
}

export const EMPTY_DELIVERY_ADDRESS: DeliveryAddressValue = {
    phone: '',
    provinceCode: null,
    provinceName: null,
    wardCode: null,
    wardName: null,
    street: '',
    latitude: null,
    longitude: null,
    locationSource: null
};

/** Vị trí tìm được theo địa chỉ chữ + mức zoom phù hợp (đường 17, phường 15, tỉnh 11). */
export interface GeocodeLocation {
    latitude: number;
    longitude: number;
    zoom: number;
}
