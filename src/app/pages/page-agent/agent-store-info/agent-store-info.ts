import { Component, OnInit, inject, signal } from '@angular/core';
import { ProfileService } from '../../../common/services/profile.service';
import { MyProfileResponse } from '../../../common/models/profile.model';
import { StoreResponse } from '../../../common/models/store.model';

interface StoreInfoItem {
    label: string;
    value: string;
    icon: string[];
}

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

    infoItems(store: StoreResponse): StoreInfoItem[] {
        return [
            {
                label: 'Số điện thoại',
                value: store.phoneNumber || '—',
                icon: ['M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384']
            },
            {
                label: 'Địa chỉ',
                value: store.address || '—',
                icon: ['M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0', 'M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6']
            },
            {
                label: 'Ngày tham gia',
                value: store.createdAt ? new Date(store.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—',
                icon: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z']
            }
        ];
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
