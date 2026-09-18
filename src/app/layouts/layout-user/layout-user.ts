import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { UserTopbarComponent } from "./user-topbar/user-topbar";
import { UserFooterComponent } from "./user-footer/user-footer";
import { URL_ENDPOINT } from '../../common/constants/url-endpoint';

@Component({
  selector: 'app-layout-user',
  imports: [
    RouterOutlet,
    UserTopbarComponent,
    UserFooterComponent
],
  templateUrl: './layout-user.html'
})
export class LayoutUserComponent {
  private readonly router = inject(Router);
  private readonly welcomePath = `/${URL_ENDPOINT.USER}/${URL_ENDPOINT.USER_STORES}`;

  showFooter = signal(this.isWelcomeUrl(this.router.url));

  constructor() {
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(event => {
        this.showFooter.set(
          this.isWelcomeUrl((event as NavigationEnd).urlAfterRedirects)
        );
      });
  }

  private isWelcomeUrl(url: string): boolean {
    return url.split('?')[0].split('#')[0] === this.welcomePath;
  }
}
