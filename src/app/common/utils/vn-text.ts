/** Bỏ dấu + hoa thường tiếng Việt để tìm kiếm / so khớp: "Bến Thành" -> "ben thanh". */
export function normalizeVnText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

const ADMIN_PREFIX = /^(thanh pho|tinh|phuong|xa|dac khu|thi tran|thi xa|quan|huyen)\s+/;

/** So khớp tên đơn vị hành chính bỏ qua tiền tố: "Thành phố Hà Nội" ~ "Hà Nội", "Phường Bến Thành" ~ "Bến Thành". */
export function normalizeAdminUnitName(name: string): string {
    return normalizeVnText(name).replace(ADMIN_PREFIX, '');
}
