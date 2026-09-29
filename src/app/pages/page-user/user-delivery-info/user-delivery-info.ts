import { Component, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../common/services/auth.service';
import { GuestService } from '../../../common/services/guest.service';
import { ProfileService } from '../../../common/services/profile.service';
import { ToastService } from '../../../common/services/toast.service';
import { DeliveryInfoService } from '../../../common/services/delivery-info.service';
import { DeliveryAddressValue } from '../../../common/models/address.model';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import {
    DeliveryAddressFormComponent,
    validateDeliveryAddress
} from '../../../shared/component/delivery-address-form/delivery-address-form';

/**
 * Trang "Thông tin nhận hàng" (mở từ icon trên topbar user): tên khách vãng lai, SĐT, địa chỉ, ghim bản đồ.
 * Không bắt buộc — lưu trên máy và tự gửi kèm khi đặt đơn.
 */
@Component({
    selector: 'app-page-user-delivery-info',
    imports: [DeliveryAddressFormComponent],
    templateUrl: './user-delivery-info.html'
})
export class PageUserDeliveryInfoComponent {
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly authService = inject(AuthService);
    private readonly guestService = inject(GuestService);
    private readonly profileService = inject(ProfileService);
    private readonly toastService = inject(ToastService);
    private readonly deliveryInfoService = inject(DeliveryInfoService);

    readonly isLoggedIn = computed(() => this.authService.isLoggedIn());

    /** Bản nháp — chỉ lưu vào DeliveryInfoService khi bấm "Lưu". */
    readonly draft = signal<DeliveryAddressValue>({ ...this.deliveryInfoService.info() });

    readonly guestName = computed(() => this.guestService.customerName());
    readonly isEditingName = signal(false);
    readonly nameEdit = signal('');
    readonly savingName = signal(false);

    constructor() {
        // User đã đăng nhập chưa có SĐT nhận hàng thì điền sẵn từ hồ sơ
        if (this.isLoggedIn() && !this.draft().phone) {
            this.profileService.getMyProfile().subscribe({
                next: res => {
                    const phone = res.data?.profile?.phoneNumber?.trim();

                    if (phone && !this.draft().phone) {
                        this.draft.update(v => ({ ...v, phone }));
                    }
                }
            });
        }
    }

    startEditName(): void {
        this.nameEdit.set(this.guestName());
        this.isEditingName.set(true);
    }

    cancelEditName(): void {
        this.isEditingName.set(false);
    }

    saveName(): void {
        const deviceId = this.guestService.getGuestToken();
        const name = this.nameEdit().trim();

        if (!name) {
            this.toastService.error('Vui lòng nhập tên khách hàng');
            return;
        }

        if (!deviceId || this.savingName()) return;

        this.savingName.set(true);

        this.profileService.updateGuestProfile(deviceId, name).subscribe({
            next: () => {
                this.guestService.customerName.set(name);
                this.isEditingName.set(false);
                this.savingName.set(false);
            },
            error: () => {
                this.savingName.set(false);
                this.toastService.error('Không lưu được tên khách hàng');
            }
        });
    }

    save(): void {
        const error = validateDeliveryAddress(this.draft());

        if (error) {
            this.toastService.error(error);
            return;
        }

        this.deliveryInfoService.save(this.draft());
        this.toastService.success('Đã lưu thông tin nhận hàng');
        this.back();
    }

    back(): void {
        // Quay lại trang trước (thường là trang đặt món); mở thẳng link thì về danh sách cửa hàng
        if (window.history.length > 1) {
            this.location.back();
            return;
        }

        this.router.navigate(['/', URL_ENDPOINT.USER, URL_ENDPOINT.USER_STORES]);
    }
}
