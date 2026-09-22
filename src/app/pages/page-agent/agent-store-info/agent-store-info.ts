import { Component, OnInit, inject, signal } from '@angular/core';
import { ProfileService } from '../../../common/services/profile.service';
import { MyProfileResponse } from '../../../common/models/profile.model';

@Component({
    selector: 'app-agent-store-info',
    imports: [],
    templateUrl: './agent-store-info.html'
})
export class PageAgentStoreInfoComponent implements OnInit {
    private readonly profileService = inject(ProfileService);

    profile = signal<MyProfileResponse | null>(null);
    loading = signal(false);
    errorMessage = signal('');

    ngOnInit(): void {
        this.loadProfile();
    }

    loadProfile(): void {
        this.loading.set(true);

        this.profileService.getMyProfile().subscribe({
            next: response => {
                this.loading.set(false);

                if (!response.isSuccess || !response.data) {
                    this.errorMessage.set(response.message);
                    return;
                }

                this.profile.set(response.data);
            },
            error: () => {
                this.loading.set(false);
                this.errorMessage.set('Không lấy được thông tin cửa hàng');
            }
        });
    }
}
