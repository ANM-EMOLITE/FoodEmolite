import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../../common/services/profile.service';
import {
  BankAccountResponse,
  CreateAccountProfileRequest,
  CreateBankAccountRequest,
  MyProfileResponse,
  UpdateAccountProfileRequest,
  UpdateBankAccountRequest
} from '../../../common/models/profile.model';
import { VietQrService } from '../../../common/services/vietqr.service';
import { DropdownComponent, DropdownOption } from '../../../shared/component/dropdown/dropdown';
import { DatePickerComponent } from "../../../shared/component/date-picker/date-picker";

type ProfileTab = 'personal' | 'bank';

@Component({
  selector: 'app-agent-info',
  imports: [
    FormsModule,
    DropdownComponent,
    DatePickerComponent
  ],
  templateUrl: './agent-info.html'
})
export class PageAgentInfoComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly vietQrService = inject(VietQrService);

  bankOptions = signal<DropdownOption[]>([]);
  activeTab = signal<ProfileTab>('personal');
  profile = signal<MyProfileResponse | null>(null);

  loading = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  avatarPreview = signal<string | null>(null);
  personalOriginal = signal('');
  bankOriginal = signal('');
  personalAvatarChanged = signal(false);

  personalForm = signal<CreateAccountProfileRequest>({
    fullName: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    avatarUrl: null
  });

  bankForm = signal<CreateBankAccountRequest>({
    bankName: '',
    bankCode: '',
    accountNumber: '',
    accountHolderName: '',
    isDefault: true
  });

  bankQrUrl = signal('');

  isPersonalChanged = computed(() =>
    this.personalOriginal() !== this.serializePersonalForm() ||
    this.personalAvatarChanged()
  );

  isBankChanged = computed(() =>
    this.bankOriginal() !== JSON.stringify(this.bankForm())
  );

  ngOnInit(): void {
    this.loadProfile();
    this.loadBanks();
  }

  loadBanks(): void {
    this.vietQrService.getBanks().subscribe({
      next: response => {
        this.bankOptions.set(
          response.data.map(bank => ({
            label: `${bank.shortName} - ${bank.name}`,
            value: bank.code
          }))
        );
      }
    });
  }

  onBankChanged(option: DropdownOption | null): void {
    if (!option) return;

    const bankCode = String(option.value);
    const bankName = option.label.split(' - ')[0];

    this.bankForm.update(value => ({
      ...value,
      bankCode,
      bankName
    }));

    this.updateQr();
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
    this.clearMessage();
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
        this.patchPersonalForm(response.data);
        this.patchBankForm(response.data.bankAccounts?.[0] ?? null);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Không lấy được thông tin đại lý');
      }
    });
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.personalForm.update(value => ({
      ...value,
      avatarUrl: file
    }));

    this.personalAvatarChanged.set(true);
    this.avatarPreview.set(URL.createObjectURL(file));
  }

  savePersonalInfo(): void {
    if (!this.isPersonalChanged() || this.isSubmitting()) return;

    const request = this.personalForm();
    const hasProfile = !!this.profile()?.profile;

    this.isSubmitting.set(true);
    this.clearMessage();

    const action = hasProfile
      ? this.profileService.updateAccountProfile(request as UpdateAccountProfileRequest)
      : this.profileService.createAccountProfile(request);

    action.subscribe({
      next: response => {
        this.isSubmitting.set(false);

        if (!response.isSuccess) {
          this.errorMessage.set(response.message);
          return;
        }

        this.successMessage.set('Lưu thông tin cá nhân thành công');
        this.loadProfile();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Lưu thông tin cá nhân thất bại');
      }
    });
  }

  saveBankAccount(): void {
    if (!this.isBankChanged() || this.isSubmitting()) return;

    const request = this.bankForm();
    const hasBank = !!this.profile()?.bankAccounts?.length;

    this.isSubmitting.set(true);
    this.clearMessage();

    const action = hasBank
      ? this.profileService.updateBankAccount(request as UpdateBankAccountRequest)
      : this.profileService.createBankAccount(request);

    action.subscribe({
      next: response => {
        this.isSubmitting.set(false);

        if (!response.isSuccess) {
          this.errorMessage.set(response.message);
          return;
        }

        this.successMessage.set('Lưu tài khoản ngân hàng thành công');
        this.loadProfile();
      },
      error: () => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Lưu tài khoản ngân hàng thất bại');
      }
    });
  }

  updateQr(): void {
    this.bankQrUrl.set(
      this.profileService.generateVietQrUrl(this.bankForm())
    );
  }

  onDateOfBirthChange(value: string): void {
    this.personalForm.update(v => ({
      ...v,
      dateOfBirth: value
    }));
  }

  private patchPersonalForm(data: MyProfileResponse): void {
    const profile = data.profile;

    if (!profile) {
      this.personalOriginal.set(this.serializePersonalForm());
      return;
    }

    this.personalForm.set({
      fullName: profile.fullName,
      phoneNumber: profile.phoneNumber ?? '',
      gender: profile.gender ?? '',
      dateOfBirth: profile.dateOfBirth ?? '',
      address: profile.address ?? '',
      avatarUrl: null
    });

    this.avatarPreview.set(profile.avatarUrl ?? null);
    this.personalAvatarChanged.set(false);
    this.personalOriginal.set(this.serializePersonalForm());
  }

  private patchBankForm(bank: BankAccountResponse | null): void {
    if (!bank) {
      this.bankOriginal.set(JSON.stringify(this.bankForm()));
      this.updateQr();
      return;
    }

    this.bankForm.set({
      bankName: bank.bankName,
      bankCode: bank.bankCode ?? '',
      accountNumber: bank.accountNumber,
      accountHolderName: bank.accountHolderName,
      isDefault: bank.isDefault
    });

    this.bankOriginal.set(JSON.stringify(this.bankForm()));
    this.updateQr();
  }

  private serializePersonalForm(): string {
    const value = this.personalForm();

    return JSON.stringify({
      fullName: value.fullName,
      phoneNumber: value.phoneNumber ?? '',
      gender: value.gender ?? '',
      dateOfBirth: value.dateOfBirth ?? '',
      address: value.address ?? '',
      avatarUrl: null
    });
  }

  private clearMessage(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }
}