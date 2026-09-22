import { StoreFoodResponse } from '../models/store-food.model';

/**
 * exceljs được bundle qua bản browser (exceljs/dist/exceljs.min.js) nhưng bản đó vẫn gọi thẳng tới
 * `Buffer`/`process` (API của Node) khi ghi file — Angular (esbuild) không tự polyfill Node core module
 * như webpack cũ, nên thiếu 2 global này sẽ lỗi ngay khi export ("Buffer/process is not defined").
 */
async function ensureNodePolyfills(): Promise<void> {
    const target = globalThis as unknown as { Buffer?: unknown; process?: unknown };

    if (typeof target.Buffer === 'undefined') {
        const { Buffer } = await import('buffer');
        target.Buffer = Buffer;
    }

    if (typeof target.process === 'undefined') {
        // Package 'process' không có kiểu TypeScript riêng — chỉ dùng làm shim runtime.
        // @ts-ignore
        const processModule = await import('process');
        target.process = (processModule as any).default ?? processModule;
    }
}

/** DSSP_<ngày tạo file ddMMyyyy>_<số sản phẩm>donhang.xlsx */
function buildFileName(count: number): string {
    const now = new Date();

    return `DSSP_${formatDate(now, '')}_${count}donhang.xlsx`;
}

function formatDate(date: Date, separator: string): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();

    return separator ? `${dd}${separator}${mm}${separator}${yyyy}` : `${dd}${mm}${yyyy}`;
}

const COLUMNS = [
    { key: 'stt', header: 'STT', width: 6 },
    { key: 'productCode', header: 'Mã sản phẩm', width: 16 },
    { key: 'foodName', header: 'Tên món', width: 30 },
    { key: 'category', header: 'Danh mục', width: 18 },
    { key: 'price', header: 'Giá', width: 14 },
    { key: 'quantity', header: 'Số lượng', width: 12 },
    { key: 'status', header: 'Trạng thái', width: 14 },
    { key: 'description', header: 'Mô tả', width: 40 }
] as const;

const LAST_COLUMN_LETTER = String.fromCharCode('A'.charCodeAt(0) + COLUMNS.length - 1);

const THIN_BORDER = (color: string) => ({
    top: { style: 'thin' as const, color: { argb: color } },
    bottom: { style: 'thin' as const, color: { argb: color } },
    left: { style: 'thin' as const, color: { argb: color } },
    right: { style: 'thin' as const, color: { argb: color } }
});

/** Xuất danh sách sản phẩm đã chọn ra file Excel (.xlsx) có định dạng, dựng ngay ở FE bằng exceljs (nạp lười). */
export async function exportStoreFoodsExcel(
    foods: StoreFoodResponse[],
    categoryNameById?: Map<number, string>,
    fileName = buildFileName(foods.length)
): Promise<void> {
    await ensureNodePolyfills();

    const ExcelJS = await import('exceljs');

    const workbook = new ExcelJS.Workbook();
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Sản phẩm', {
        views: [{ state: 'frozen', ySplit: 2 }]
    });

    COLUMNS.forEach((column, index) => {
        const col = sheet.getColumn(index + 1);
        col.key = column.key;
        col.width = column.width;
    });

    // Dòng 1: tiêu đề gộp toàn bộ chiều rộng bảng.
    const titleRow = sheet.addRow([`DANH SÁCH SẢN PHẨM - ${formatDate(new Date(), '/')}`]);
    sheet.mergeCells(1, 1, 1, COLUMNS.length);
    titleRow.height = 30;
    titleRow.getCell(1).font = { bold: true, size: 15, color: { argb: 'FF4C1D95' } };
    titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };

    // Dòng 2: header cột.
    const headerRow = sheet.addRow(COLUMNS.map(c => c.header));
    headerRow.height = 22;
    headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = THIN_BORDER('FF4C1D95');
    });

    // Dòng 3+: dữ liệu.
    foods.forEach((food, index) => {
        sheet.addRow({
            stt: index + 1,
            productCode: food.productCode,
            foodName: food.foodName,
            category: categoryNameById?.get(food.storeFoodCategoryId) ?? '—',
            price: food.price,
            quantity: food.quantity,
            status: food.isAvailable ? 'Đang bán' : 'Ngừng bán',
            description: food.description ?? ''
        });
    });

    sheet.getColumn('price').numFmt = '#,##0"đ"';
    sheet.getColumn('stt').alignment = { horizontal: 'center' };
    sheet.getColumn('quantity').alignment = { horizontal: 'center' };
    sheet.getColumn('status').alignment = { horizontal: 'center' };

    for (let rowNumber = 3; rowNumber <= sheet.rowCount; rowNumber++) {
        const row = sheet.getRow(rowNumber);
        const isEven = rowNumber % 2 === 0;

        row.eachCell({ includeEmpty: true }, cell => {
            cell.border = THIN_BORDER('FFE4DEFA');

            if (isEven) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
            }
        });
    }

    sheet.autoFilter = { from: 'A2', to: `${LAST_COLUMN_LETTER}${sheet.rowCount}` };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
}
