import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output
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

    form!: FormGroup;

    /** Giá trị mặc định lúc khởi tạo (vd. ngày hôm nay) — "Đặt lại" quay về đây thay vì xoá trống. */
    private defaultValues: Record<string, any> = {};

    constructor(
        private fb: FormBuilder
    ) { }

    ngOnInit(): void {

        const controls: any = {};

        this.fields.forEach(field => {

            this.defaultValues[field.key] = this.initialValues?.[field.key] ?? '';

            controls[field.key] = [
                this.defaultValues[field.key]
            ];
        });

        this.form = this.fb.group(controls);

        this.form.valueChanges
            .pipe(
                debounceTime(500)
            )
            .subscribe(value => {

                this.filterChange.emit(value);
            });
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

        this.filterChange.emit(this.form.value);
    }
}