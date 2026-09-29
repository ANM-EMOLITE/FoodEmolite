import { Component, computed, DestroyRef, inject, input, model, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, finalize, Subject, switchMap, tap, timer } from 'rxjs';
import { AddressService } from '../../../common/services/address.service';
import { ToastService } from '../../../common/services/toast.service';
import { AdministrativeUnit, DeliveryAddressValue, ReverseGeocodeResult } from '../../../common/models/address.model';
import { normalizeAdminUnitName, normalizeVnText } from '../../../common/utils/vn-text';
import { SearchSelectComponent, SearchSelectOption } from '../search-select/search-select';
import { LocationPickerComponent, PickedLocation } from '../location-picker/location-picker';

const VN_PHONE_REGEX = /^(0|\+84)\d{9,10}$/;

/** Vị trí GPS lệch hơn mức này (mét) thì nhắc khách kiểm tra lại ghim — PC thường lệch vài km. */
const GPS_ACCURACY_WARNING_METERS = 150;

/** Chờ khách gõ xong số nhà / tên đường rồi mới tìm lại vị trí. */
const STREET_LOCATE_DEBOUNCE_MS = 900;

export function normalizeDeliveryPhone(phone: string): string {
    return phone.replace(/[\s.-]/g, '');
}

/** Ghim do khách xác nhận (GPS / tự chạm, kéo trên bản đồ) — khi đó không bắt buộc nhập đủ địa chỉ chữ. */
export function hasConfirmedLocation(value: DeliveryAddressValue): boolean {
    return value.latitude !== null && value.longitude !== null
        && (value.locationSource === 'gps' || value.locationSource === 'map');
}

/** Mọi trường đều không bắt buộc — chỉ kiểm tra định dạng những gì đã nhập (BE kiểm tra tương tự). */
export function validateDeliveryAddress(value: DeliveryAddressValue): string | null {
    const phone = normalizeDeliveryPhone(value.phone);

    if (phone && !VN_PHONE_REGEX.test(phone)) return 'Số điện thoại nhận hàng không hợp lệ';

    return null;
}

/**
 * Form địa chỉ giao hàng dùng lại được: SĐT, Tỉnh/Thành phố, Phường/Xã (danh mục open-source), số nhà + bản đồ ghim.
 * - Chọn Tỉnh/Phường, nhập đường -> bản đồ tự bay tới khu đó và đặt ghim gần đúng.
 * - Khách kéo / chạm bản đồ hoặc dùng GPS -> ghim chính xác, tự điền lại Tỉnh/Phường theo ghim.
 * Agent mở Google Maps theo đúng ghim này.
 * Dùng: <app-delivery-address-form [(value)]="deliveryAddress" />, kiểm tra bằng validateDeliveryAddress().
 */
@Component({
    selector: 'app-delivery-address-form',
    imports: [SearchSelectComponent, LocationPickerComponent],
    templateUrl: './delivery-address-form.html'
})
export class DeliveryAddressFormComponent implements OnInit {
    private readonly addressService = inject(AddressService);
    private readonly toastService = inject(ToastService);
    private readonly destroyRef = inject(DestroyRef);

    readonly value = model.required<DeliveryAddressValue>();

    /** 'split': màn rộng chia 2 cột (ô nhập trái, bản đồ phải); 'stacked': luôn xếp dọc. */
    readonly layout = input<'stacked' | 'split'>('stacked');

    readonly provinces = signal<AdministrativeUnit[]>([]);
    readonly wards = signal<AdministrativeUnit[]>([]);
    readonly loadingProvinces = signal(false);
    readonly loadingWards = signal(false);
    readonly locating = signal(false);
    readonly searchingMap = signal(false);
    readonly mapZoom = signal(16);
    /** Sai số (mét) của lần lấy GPS gần nhất. */
    readonly gpsAccuracy = signal<number | null>(null);

    readonly provinceOptions = computed<SearchSelectOption[]>(() => this.provinces().map(toOption));
    readonly wardOptions = computed<SearchSelectOption[]>(() => this.wards().map(toOption));
    readonly hasPin = computed(() => this.value().latitude !== null && this.value().longitude !== null);
    readonly isAddressOptional = computed(() => hasConfirmedLocation(this.value()));

    /** Gợi ý dưới bản đồ: tone = 'info' | 'warn' | 'ok'. */
    readonly mapHint = computed<{ tone: 'info' | 'warn' | 'ok'; text: string }>(() => {
        const v = this.value();
        const accuracy = this.gpsAccuracy();

        if (this.searchingMap()) return { tone: 'info', text: 'Đang tìm khu vực trên bản đồ...' };
        if (!this.hasPin()) return { tone: 'info', text: 'Chọn Tỉnh/Phường để bản đồ tự tới khu vực của bạn, hoặc chạm vào bản đồ để đặt ghim.' };

        if (v.locationSource === 'address') {
            return { tone: 'warn', text: 'Ghim đang ở vị trí gần đúng theo địa chỉ — hãy kéo ghim tới đúng nhà bạn để giao chính xác.' };
        }

        if (v.locationSource === 'gps' && accuracy !== null && accuracy > GPS_ACCURACY_WARNING_METERS) {
            return {
                tone: 'warn',
                text: `Vị trí từ thiết bị có thể lệch khoảng ±${formatDistance(accuracy)} — hãy kiểm tra và kéo ghim tới đúng nhà bạn.`
            };
        }

        return { tone: 'ok', text: 'Cửa hàng sẽ giao tới đúng vị trí ghim này. Kéo ghim nếu cần chỉnh lại.' };
    });

    /** delay (ms) -> tìm vị trí theo địa chỉ; yêu cầu mới huỷ yêu cầu cũ đang chờ. */
    private readonly locateAddress$ = new Subject<number>();

    /** Tên đường hiện tại do form tự điền theo ghim (true) hay khách tự gõ (false) — chỉ tự thay khi là tự điền. */
    private isStreetAutoFilled = false;

    /** Tên đường theo vị trí ghim khi khác với số nhà / tên đường khách đã tự gõ — khách bấm "Dùng" để thay. */
    readonly suggestedStreet = signal<string | null>(null);

    constructor() {
        this.locateAddress$
            .pipe(
                switchMap(delay => timer(delay).pipe(switchMap(() => this.findAddressOnMap()))),
                takeUntilDestroyed()
            )
            .subscribe();
    }

    ngOnInit(): void {
        this.loadProvinces();

        const provinceCode = this.value().provinceCode;

        if (provinceCode) {
            this.loadWards(provinceCode);
        }
    }

    patch(changes: Partial<DeliveryAddressValue>): void {
        this.value.update(v => ({ ...v, ...changes }));
    }

    onProvinceSelected(option: SearchSelectOption): void {
        if (option.value === this.value().provinceCode) return;

        this.patch({ provinceCode: option.value, provinceName: option.label, wardCode: null, wardName: null });
        this.loadWards(option.value);
        this.locateAddress$.next(0);
    }

    onWardSelected(option: SearchSelectOption): void {
        this.patch({ wardCode: option.value, wardName: option.label });
        this.locateAddress$.next(0);
    }

    onStreetInput(street: string): void {
        this.patch({ street });
        this.isStreetAutoFilled = false;
        this.suggestedStreet.set(null);

        // Khách đã tự đặt ghim (GPS / bản đồ) thì gõ đường không kéo ghim đi nữa
        if (!this.isAddressOptional()) {
            this.locateAddress$.next(STREET_LOCATE_DEBOUNCE_MS);
        }
    }

    /** Khách chạm / kéo ghim trên bản đồ — vị trí đã xác nhận, cập nhật Tỉnh/Phường theo ghim. */
    onMapPicked(location: PickedLocation): void {
        this.gpsAccuracy.set(null);
        this.patch({ ...location, locationSource: 'map' });
        this.fillFromLocation(location.latitude, location.longitude, false);
    }

    useCurrentLocation(): void {
        if (!('geolocation' in navigator) || !window.isSecureContext) {
            this.toastService.error('Trình duyệt không hỗ trợ lấy vị trí (cần truy cập qua HTTPS)');
            return;
        }

        this.locating.set(true);

        navigator.geolocation.getCurrentPosition(
            position => {
                const latitude = Number(position.coords.latitude.toFixed(6));
                const longitude = Number(position.coords.longitude.toFixed(6));

                this.gpsAccuracy.set(Math.round(position.coords.accuracy));
                this.mapZoom.set(position.coords.accuracy > 1000 ? 14 : 17);
                this.patch({ latitude, longitude, locationSource: 'gps' });
                this.fillFromLocation(latitude, longitude, true);
            },
            error => {
                this.locating.set(false);
                this.toastService.error(
                    error.code === error.PERMISSION_DENIED
                        ? 'Bạn chưa cho phép truy cập vị trí'
                        : 'Không lấy được vị trí, vui lòng thử lại'
                );
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }

    clearPin(): void {
        this.gpsAccuracy.set(null);
        this.suggestedStreet.set(null);
        this.patch({ latitude: null, longitude: null, locationSource: null });
    }

    /** Đặt ghim gần đúng theo Tỉnh/Phường/đường đã nhập (Photon/OSM). */
    private findAddressOnMap() {
        const v = this.value();

        if (!v.provinceName || this.isAddressOptional()) return EMPTY;

        this.searchingMap.set(true);

        // Chạy trong switchMap của locateAddress$ nên yêu cầu cũ bị huỷ sẽ không ghi đè kết quả mới
        return this.addressService.locateAddress(v.provinceName, v.wardName, v.street).pipe(
            tap(location => {
                // Khách đã tự đặt ghim trong lúc chờ thì giữ ghim của khách
                if (location && !this.isAddressOptional()) {
                    this.gpsAccuracy.set(null);
                    this.mapZoom.set(location.zoom);
                    this.patch({ latitude: location.latitude, longitude: location.longitude, locationSource: 'address' });
                }
            }),
            catchError(() => EMPTY),
            finalize(() => this.searchingMap.set(false))
        );
    }

    /** Đổi tọa độ -> Tỉnh/Phường (và đường nếu còn trống) rồi khớp với danh mục. Không khớp được cũng không sao — đã có ghim. */
    private fillFromLocation(latitude: number, longitude: number, notify: boolean): void {
        this.addressService.reverseGeocode(latitude, longitude)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: result => {
                    if (!result) {
                        this.finishLocating(notify);
                        return;
                    }

                    this.applyStreetFromLocation(result.street);

                    const province = findUnit(this.provinces(), result.provinceCandidates);

                    if (!province) {
                        this.finishLocating(notify);
                        return;
                    }

                    if (province.code !== this.value().provinceCode) {
                        this.patch({ provinceCode: province.code, provinceName: province.name, wardCode: null, wardName: null });
                    }

                    this.loadWards(province.code, result, notify);
                },
                error: () => this.finishLocating(notify)
            });
    }

    useSuggestedStreet(): void {
        const street = this.suggestedStreet();

        if (!street) return;

        this.patch({ street });
        this.isStreetAutoFilled = true;
        this.suggestedStreet.set(null);
    }

    /**
     * Ghim vừa dời chỗ: ô trống hoặc tên đường do form tự điền -> thay luôn theo vị trí mới;
     * khách đã tự gõ (thường có số nhà / hẻm mà bản đồ không có) -> không ghi đè, chỉ gợi ý.
     */
    private applyStreetFromLocation(street: string): void {
        const current = this.value().street.trim();

        if (!current || this.isStreetAutoFilled) {
            this.patch({ street });
            this.isStreetAutoFilled = !!street;
            this.suggestedStreet.set(null);
            return;
        }

        const isSame = normalizeVnText(current).includes(normalizeVnText(street));
        this.suggestedStreet.set(street && !isSame ? street : null);
    }

    private finishLocating(notify: boolean): void {
        if (!this.locating()) return;

        this.locating.set(false);

        if (notify) {
            this.toastService.success('Đã lấy vị trí — kiểm tra ghim trên bản đồ đã đúng nhà bạn chưa');
        }
    }

    private loadProvinces(): void {
        this.loadingProvinces.set(true);

        this.addressService.getProvinces()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: provinces => {
                    this.provinces.set(provinces);
                    this.loadingProvinces.set(false);
                },
                error: () => {
                    this.loadingProvinces.set(false);
                    this.toastService.error('Không tải được danh sách Tỉnh/Thành phố — bạn có thể chọn vị trí trên bản đồ');
                }
            });
    }

    /** geocode: truyền vào khi đi từ vị trí ghim — tải xong thì tự chọn Phường khớp với ghim. */
    private loadWards(provinceCode: string, geocode?: ReverseGeocodeResult, notify = false): void {
        this.wards.set([]);
        this.loadingWards.set(true);

        this.addressService.getWards(provinceCode)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: wards => {
                    // Người dùng đã đổi sang tỉnh khác trong lúc chờ
                    if (this.value().provinceCode !== provinceCode) return;

                    this.wards.set(wards);
                    this.loadingWards.set(false);

                    if (geocode) {
                        const ward = findUnit(wards, geocode.wardCandidates);

                        if (ward) {
                            this.patch({ wardCode: ward.code, wardName: ward.name });
                        }

                        this.finishLocating(notify);
                    }
                },
                error: () => {
                    this.loadingWards.set(false);
                    this.toastService.error('Không tải được danh sách Phường/Xã');

                    if (geocode) this.finishLocating(notify);
                }
            });
    }
}

function toOption(unit: AdministrativeUnit): SearchSelectOption {
    return { value: unit.code, label: unit.name };
}

function findUnit(units: AdministrativeUnit[], candidates: string[]): AdministrativeUnit | undefined {
    for (const candidate of candidates) {
        const key = normalizeAdminUnitName(candidate);
        const unit = units.find(u => normalizeAdminUnitName(u.name) === key);

        if (unit) return unit;
    }

    return undefined;
}

function formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}
