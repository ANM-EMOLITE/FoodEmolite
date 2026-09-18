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
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-topbar',
  imports: [UserProfilePopupComponent, FormsModule],
  templateUrl: './user-topbar.html'
})
export class UserTopbarComponent {
  readonly authService = inject(AuthService);
  readonly urlEndpoint = URL_ENDPOINT;

  private readonly router = inject(Router);
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly profileService = inject(ProfileService);
  private readonly guestService = inject(GuestService)

  isUserMenuOpen = signal(false);
  isProfilePopupOpen = signal(false);

  profileName = signal('');
  profileAvatar = signal('');
  guestName = signal('');
  isEditingGuest = signal(false);
  guestNameEdit = '';

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
  get guestDisplayName(): string {
    return this.guestName();
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

  startEditGuest(): void {
    this.guestNameEdit = this.guestName();
    this.isEditingGuest.set(true);
  }
  cancelEditGuest(): void {
    this.guestNameEdit = this.guestName();
    this.isEditingGuest.set(false);
  }
  saveGuest(): void {
    const deviceId = this.guestService.getGuestToken();

    if (!deviceId || !this.guestNameEdit.trim()) {
      return;
    }

    this.profileService
      .updateGuestProfile(deviceId, this.guestNameEdit.trim())
      .subscribe({
        next: () => {
          this.guestName.set(this.guestNameEdit.trim());
          this.isEditingGuest.set(false);
        }
      });
  }

  get displayName(): string {
    return this.profileName() || this.authService.currentUser()?.username || 'User';
  }

  get guestAvatarLetter(): string {
    return this.guestName().charAt(0).toUpperCase();
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