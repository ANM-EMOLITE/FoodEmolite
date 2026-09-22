import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../common/services/auth.service';
import { ToastService } from '../../../common/services/toast.service';
import { URL_ENDPOINT } from '../../../common/constants/url-endpoint';

type SettingsTab = 'password';

interface ChangePasswordForm {
    oldPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}

@Component({
    selector: 'app-page-agent-settings',
    imports: [FormsModule],
    templateUrl: './agent-settings.html'
})
export class PageAgentSettingsComponent {
    private readonly authService = inject(AuthService);
    private readonly toastService = inject(ToastService);
    private readonly router = inject(Router);

    activeTab = signal<SettingsTab>('password');
    isSubmitting = signal(false);

    passwordForm = signal<ChangePasswordForm>({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });

    setTab(tab: SettingsTab): void {
        this.activeTab.set(tab);
    }

    changePassword(): void {
        const form = this.passwordForm();

        if (!form.oldPassword || !form.newPassword || !form.confirmNewPassword) {
            this.toastService.error('Vui lòng nhập đầy đủ thông tin');
            return;
        }

        if (form.newPassword !== form.confirmNewPassword) {
            this.toastService.error('Xác nhận mật khẩu mới không khớp');
            return;
        }

        this.isSubmitting.set(true);

        this.authService.changePassword(form).subscribe({
            next: response => {
                this.isSubmitting.set(false);

                if (!response.isSuccess) {
                    this.toastService.error(response.message);
                    return;
                }

                this.toastService.success('Đổi mật khẩu thành công, vui lòng đăng nhập lại');

                // Mật khẩu đổi rồi nhưng token cũ (JWT không có blacklist phía BE) vẫn còn hiệu lực tới khi hết hạn —
                // ép đăng xuất ngay để không có phiên nào còn dùng mật khẩu cũ.
                this.authService.logout();
                this.router.navigateByUrl(URL_ENDPOINT.LOGIN);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.toastService.error('Đổi mật khẩu thất bại');
            }
        });
    }
}
