import { Component, computed, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SaveSupplierRequest, SupplierResponse } from '../../../../common/models/supplier.model';
import { CheckboxComponent } from '../../../../shared/component/checkbox/checkbox';

@Component({
    selector: 'app-pop-up-supplier-form',
    imports: [FormsModule, CheckboxComponent],
    templateUrl: './pop-up-supplier-form.html'
})
export class PopUpSupplierFormComponent implements OnInit {
    readonly supplier = input<SupplierResponse | null>(null);
    readonly isSubmitting = input(false);

    readonly closed = output<void>();
    readonly submitted = output<SaveSupplierRequest>();

    readonly form = signal<SaveSupplierRequest>({
        supplierName: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        taxCode: '',
        note: '',
        isActive: true
    });

    readonly isEdit = computed(() => !!this.supplier());
    readonly isValid = computed(() => !!this.form().supplierName?.trim());

    ngOnInit(): void {
        const supplier = this.supplier();

        if (supplier) {
            this.form.set({
                supplierName: supplier.supplierName,
                contactName: supplier.contactName ?? '',
                phone: supplier.phone ?? '',
                email: supplier.email ?? '',
                address: supplier.address ?? '',
                taxCode: supplier.taxCode ?? '',
                note: supplier.note ?? '',
                isActive: supplier.isActive
            });
        }
    }

    patch(value: Partial<SaveSupplierRequest>): void {
        this.form.update(form => ({ ...form, ...value }));
    }

    submit(): void {
        if (!this.isValid() || this.isSubmitting()) {
            return;
        }

        const form = this.form();

        this.submitted.emit({
            supplierName: form.supplierName.trim(),
            contactName: form.contactName?.trim() || null,
            phone: form.phone?.trim() || null,
            email: form.email?.trim() || null,
            address: form.address?.trim() || null,
            taxCode: form.taxCode?.trim() || null,
            note: form.note?.trim() || null,
            isActive: form.isActive
        });
    }
}
