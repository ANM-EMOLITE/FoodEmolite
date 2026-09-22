import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../common/services/auth.service';
import { ProfileService } from '../../../common/services/profile.service';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';
import { MyProfileResponse } from '../../../common/models/profile.model';
import { AGENT_NAV_GROUPS } from './agent-sidebar.config';
import { ConfirmPopupComponent } from '../../../shared/component/confirm-popup/confirm-popup';

@Component({
  selector: 'app-agent-sidebar',
  imports: [
    RouterLink,
    RouterLinkActive,
    ConfirmPopupComponent
  ],
  templateUrl: './agent-sidebar.html'
})
export class AgentSidebarComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly navGroups = AGENT_NAV_GROUPS;

  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);

  profile = signal<MyProfileResponse | null>(null);
  isLogoutConfirmOpen = signal(false);

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) return;
        this.profile.set(response.data);
      }
    });
  }

  openLogoutConfirm(): void {
    this.isLogoutConfirmOpen.set(true);
  }

  closeLogoutConfirm(): void {
    this.isLogoutConfirmOpen.set(false);
  }

  logout(): void {
    this.isLogoutConfirmOpen.set(false);
    this.authService.logout();
    this.router.navigateByUrl(URL_ENDPOINT.LOGIN);
  }
}