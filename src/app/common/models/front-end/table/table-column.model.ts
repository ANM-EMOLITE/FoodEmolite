export type TableBadgeValue = {
    text: string;
    value: string;
};

/** Ô gộp ảnh + tên (chính) + dòng phụ (VD: mã sản phẩm) trong 1 cột — cột type 'product'. */
export type TableProductValue = {
    text: string;
    sub?: string | null;
    image?: string | null;
};

export type TableCellValue =
    | string
    | number
    | boolean
    | null
    | undefined
    | TableBadgeValue
    | TableProductValue;

export interface TableColumn {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    type?: 'image' | 'status' | 'date' | 'checkbox' | 'badge' | 'toggle' | 'actions' | 'product';
    trueText?: string;
    falseText?: string;
}

/** 1 lựa chọn trong menu thao tác của từng dòng (cột type 'actions'). */
export interface TableAction {
    key: string;
    label: string;
    tone?: 'default' | 'info' | 'success' | 'danger';
    /** Các path `d` của icon (viewBox 24x24, kiểu lucide) hiện bên trái nhãn. */
    icon?: string[];
}

export interface TableRow {
    id?: string | number;
    [key: string]: TableCellValue;
}