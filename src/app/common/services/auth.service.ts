import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap, catchError, of } from 'rxjs';
import { API_ENDPOINT } from '../constants/api-endpoint';
import { ApiService } from '../constants/api.service';
import {
  BaseResponse,
  ChangePasswordRequest,
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest
} from '../models/auth.model';
import { Router } from '@angular/router';
import { URL_ENDPOINT } from '../constants/url-endpoint';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiService = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<CurrentUserResponse | null>(null);
  token = signal<string | null>(localStorage.getItem('access_token'));
  isVerifying = signal(false);

  register(
    request: RegisterRequest
  ): Observable<BaseResponse<string>> {
    return this.apiService.post<BaseResponse<string>, RegisterRequest>(
      API_ENDPOINT.AUTH.REGISTER,
      request
    );
  }

  login(
    request: LoginRequest
  ): Observable<BaseResponse<LoginResponse>> {
    return this.apiService
      .post<BaseResponse<LoginResponse>, LoginRequest>(
        API_ENDPOINT.AUTH.LOGIN,
        request
      )
      .pipe(
        tap(response => {
          if (response.isSuccess && response.data) {
            localStorage.setItem('access_token', response.data.token);
            this.token.set(response.data.token);
          }
        })
      );
  }

  verify(): Observable<BaseResponse<CurrentUserResponse>> {
    return this.apiService
      .post<BaseResponse<CurrentUserResponse>, object>(
        API_ENDPOINT.AUTH.VERIFY,
        {}
      )
      .pipe(
        tap(response => {
          if (response.isSuccess && response.data) {
            this.currentUser.set(response.data);
            return;
          }

          this.logout();
        })
      );
  }

  verifyOnRefresh(): Observable<BaseResponse<CurrentUserResponse> | null> {
    const token = this.token();

    if (!token) {
      this.currentUser.set(null);
      return of(null);
    }

    this.isVerifying.set(true);

    return this.verify().pipe(
      tap((res) => {
        this.isVerifying.set(false);
        const role = res?.data?.role;
        if (role) {
          this.redirectByRole(role);
        }
      }),
      catchError(() => {
        this.isVerifying.set(false);
        this.logout();
        return of(null);
      })
    );
  }

  changePassword(
    request: ChangePasswordRequest
  ): Observable<BaseResponse<string>> {
    return this.apiService.put<BaseResponse<string>, ChangePasswordRequest>(
      API_ENDPOINT.AUTH.CHANGE_PASSWORD,
      request
    );
  }

  checkEmail(email: string): Observable<BaseResponse<boolean>> {
    return this.apiService.get<BaseResponse<boolean>>(
      API_ENDPOINT.AUTH.CHECK_EMAIL,
      {
        email
      }
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    this.token.set(null);
    this.currentUser.set(null);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }

  private redirectByRole(role: string): void {
    const currentUrl = this.router.url;
    const isOnNeutralPage = currentUrl === '/' || currentUrl.startsWith(`/${URL_ENDPOINT.LOGIN}`);

    if (!isOnNeutralPage) return;

    switch (role) {
      case 'Agent':
        this.router.navigate([`/${URL_ENDPOINT.AGENT}`]);
        break;
      case 'User':
      default:
        this.router.navigate([`/${URL_ENDPOINT.USER}`]);
        break;
    }
  }
}