import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule
} from '@angular/forms';

import { debounceTime } from 'rxjs';

import { DropdownComponent } from '../dropdown/dropdown';
import { DatePickerComponent } from '../date-picker/date-picker';

import { FilterField } from '../../../common/models/front-end/filter/filter-field.model';

@Component({
    selector: 'app-filter',
    standalone: true,

    imports: [
        CommonModule,
        ReactiveFormsModule,
        DropdownComponent,
        DatePickerComponent
    ],

    templateUrl: './filter.html',
    styleUrl: './filter.css'
})
export class FilterComponent implements OnInit {

    @Input() fields: FilterField[] = [];

    @Input() initialValues: any = {};

    @Output() filterChange = new EventEmitter<any>();

    @ViewChild('advancedAnchor') advancedAnchor?: ElementRef<HTMLElement>;

    form!: FormGroup;

    /** Field hiện luôn / field nằm trong popover "Bộ lọc nâng cao" (field.advanced). */
    basicFields: FilterField[] = [];
    advancedFields: FilterField[] = [];

    isAdvancedOpen = false;

    /** Giá trị đang sửa trong popover — chỉ đưa vào form (lọc) khi bấm "Áp dụng". */
    advancedDraft: Record<string, any> = {};

    /** Giá trị mặc định lúc khởi tạo (vd. ngày hôm nay) — "Đặt lại" quay về đây thay vì xoá trống. */
    private defaultValues: Record<string, any> = {};

    constructor(
        private fb: FormBuilder
    ) { }

    /** Có bộ lọc nào khác giá trị mặc định không — không có thì disable nút "Đặt lại". */
    get hasActiveFilter(): boolean {
        return this.fields.some(field => !this.isDefault(field.key, this.form?.get(field.key)?.value));
    }

    /** Nút "Đặt lại" trong popover: bật khi đang áp dụng hoặc đang nhập dở bộ lọc nâng cao. */
    get hasActiveAdvancedFilter(): boolean {
        return this.advancedFields.some(field =>
            !this.isDefault(field.key, this.form?.get(field.key)?.value) ||
            !this.isDefault(field.key, this.advancedDraft[field.key])
        );
    }

    private isDefault(key: string, value: any): boolean {
        const normalize = (v: any) => (v === null || v === undefined ? '' : v);

        return normalize(value) === normalize(this.defaultValues[key]);
    }

    /** Số bộ lọc nâng cao đang áp dụng — hiện badge trên nút. */
    get activeAdvancedCount(): number {
        return this.advancedFields.filter(field => {
            const value = this.form?.get(field.key)?.value;

            return value !== null && value !== undefined && value !== '';
        }).length;
    }

    ngOnInit(): void {

        const controls: any = {};

        this.fields.forEach(field => {

            this.defaultValues[field.key] = this.initialValues?.[field.key] ?? '';

            controls[field.key] = [
                this.defaultValues[field.key]
            ];
        });

        this.form = this.fb.group(controls);

        this.basicFields = this.fields.filter(field => !field.advanced);
        this.advancedFields = this.fields.filter(field => field.advanced);

        this.form.valueChanges
            .pipe(
                debounceTime(500)
            )
            .subscribe(value => {

                this.filterChange.emit(value);
            });
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        if (this.isAdvancedOpen && !this.advancedAnchor?.nativeElement.contains(event.target as Node)) {
            this.closeAdvanced();
        }
    }

    toggleAdvanced(): void {
        if (this.isAdvancedOpen) {
            this.closeAdvanced();
            return;
        }

        this.advancedDraft = {};
        this.advancedFields.forEach(field => {
            this.advancedDraft[field.key] = this.form.get(field.key)?.value ?? '';
        });

        this.isAdvancedOpen = true;
    }

    closeAdvanced(): void {
        this.isAdvancedOpen = false;
    }

    setDraft(key: string, value: any): void {
        this.advancedDraft = { ...this.advancedDraft, [key]: value ?? '' };
    }

    applyAdvanced(): void {
        this.form.patchValue(this.advancedDraft);
        this.closeAdvanced();
    }

    /** "Đặt lại" trong popover — chỉ đưa các bộ lọc nâng cao về mặc định và áp dụng luôn. */
    resetAdvanced(): void {
        const resetValues: Record<string, any> = {};

        this.advancedFields.forEach(field => {
            resetValues[field.key] = this.defaultValues[field.key] ?? '';
        });

        this.form.patchValue(resetValues);
        this.closeAdvanced();
    }

    onDropdownChange(
        key: string,
        value: any
    ) {

        this.form.patchValue({
            [key]: value
        });
    }

    onReset() {

        const resetValues: any = {};

        this.fields.forEach(field => {
            resetValues[field.key] = this.defaultValues[field.key] ?? '';
        });

        this.form.reset(resetValues);
        this.closeAdvanced();

        this.filterChange.emit(this.form.value);
    }
}
