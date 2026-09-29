import {
  Component,
  HostListener,
  ElementRef,
  inject,
  signal
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../common/services/auth.service';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import { UserProfilePopupComponent } from "../pop-up-user-profile/pop-up-user-profile";
import { ProfileService } from '../../../common/services/profile.service';
import { GuestService } from '../../../common/services/guest.service';
import { DeliveryInfoService } from '../../../common/services/delivery-info.service';

@Component({
  selector: 'app-user-topbar',
  imports: [UserProfilePopupComponent],
  templateUrl: './user-topbar.html'
})
export class UserTopbarComponent {
  readonly authService = inject(AuthService);
  readonly urlEndpoint = URL_ENDPOINT;

  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly profileService = inject(ProfileService);
  private readonly guestService = inject(GuestService)
  readonly deliveryInfoService = inject(DeliveryInfoService);

  isUserMenuOpen = signal(false);
  isProfilePopupOpen = signal(false);

  profileName = signal('');
  profileAvatar = signal('');
  guestName = signal('');

  constructor() {
    if (this.authService.isLoggedIn()) {
      this.loadProfile();
    } else {
      this.loadGuestProfile();
    }
  }

  loadProfile(): void {
    if (!this.authService.isLoggedIn()) return;

    this.profileService.getMyProfile().subscribe({
      next: res => {
        const profile = res.data?.profile;

        this.profileName.set(
          profile?.fullName ||
          this.authService.currentUser()?.username ||
          'User'
        );

        this.profileAvatar.set(profile?.avatarUrl || '');
      }
    });
  }
  /** Ưu tiên tên trong GuestService — sửa ở trang "Thông tin nhận hàng" là topbar cập nhật theo. */
  get guestDisplayName(): string {
    return this.guestService.customerName() || this.guestName();
  }
  loadGuestProfile(): void {
    const deviceId = this.guestService.getGuestToken();

    if (!deviceId) return;

    this.profileService.getGuestProfile(deviceId).subscribe({
      next: res => {
        const name = res.data?.customerName;

        if (name) {
          this.guestName.set(name);
        }
      }
    });
  }

  get displayName(): string {
    return this.profileName() || this.authService.currentUser()?.username || 'User';
  }

  get guestAvatarLetter(): string {
    return this.guestDisplayName.charAt(0).toUpperCase();
  }

  get avatarLetter(): string {
    return this.displayName.charAt(0).toUpperCase();
  }

  goLogin(): void {
    this.router.navigateByUrl(URL_ENDPOINT.LOGIN);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.isUserMenuOpen.set(false);
    }
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isUserMenuOpen.set(!this.isUserMenuOpen());
  }

  goStores(): void {
    this.router.navigate([
      '/',
      URL_ENDPOINT.USER,
      URL_ENDPOINT.USER_STORES
    ]);
  }

  goDeliveryInfo(): void {
    this.isUserMenuOpen.set(false);

    this.router.navigate([
      '/',
      URL_ENDPOINT.USER,
      URL_ENDPOINT.USER_DELIVERY_INFO
    ]);
  }

  goHistory(): void {
    this.isUserMenuOpen.set(false);

    this.router.navigate([
      '/',
      URL_ENDPOINT.USER,
      URL_ENDPOINT.USER_HISTORY
    ]);
  }

  logout(): void {
    this.isUserMenuOpen.set(false);
    this.authService.logout();
    this.router.navigateByUrl(URL_ENDPOINT.LOGIN);
  }

  openProfilePopup(): void {
    this.isUserMenuOpen.set(false);
    this.isProfilePopupOpen.set(true);
  }

  closeProfilePopup(): void {
    this.isProfilePopupOpen.set(false);
    this.loadProfile();
  }
}