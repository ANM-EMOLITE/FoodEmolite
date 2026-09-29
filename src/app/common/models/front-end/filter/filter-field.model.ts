export type FilterFieldType = 'text' | 'select' | 'date';

export type FilterValue = string | number | boolean | null;

export interface FilterOption {
  label: string;
  value: FilterValue;
}

export interface FilterField {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterOption[];
  /** Ẩn vào nhóm "Bộ lọc nâng cao" (bấm nút mới hiện). */
  advanced?: boolean;
}