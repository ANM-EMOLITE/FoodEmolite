import { OrderResponse } from '../models/order.model';

/**
 * Hóa đơn / danh sách đơn hàng dạng HTML — dựng hoàn toàn ở FE (trước đây do BE tạo PDF bằng QuestPDF).
 * Trình bày như 1 tờ bill duy nhất: tiêu đề, danh sách món (SL, tên món, giá tiền — kèm tuỳ chọn) của từng đơn
 * cách nhau bằng đường đứt nét, ghi chú của đơn nằm ngay dưới món của đơn đó, cuối cùng là tổng cộng.
 * Không có mã đơn / tên khách. Nền trắng, điểm nhấn tím; \`print-color-adjust: exact\` để màu nhạt vẫn được in ra.
 */
const INVOICE_STYLES = `
.inv { font-family: 'Baloo 2', 'Nunito', 'Segoe UI', Arial, sans-serif; color: #1e1b4b; font-size: 14px; line-height: 1.45; width: 100%; max-width: 520px; min-height: 100%; margin: 0 auto; box-sizing: border-box; background: #ffffff; display: flex; flex-direction: column; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inv * { box-sizing: border-box; }
.inv-card { flex: 1; display: flex; flex-direction: column; padding: 22px 24px; border: 1px solid #ddd6fe; border-radius: 16px; overflow: hidden; background: #ffffff; }
.inv-head { text-align: center; }
.inv-head h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: .06em; color: #4c1d95; }
.inv-head p { margin: 3px 0 0; font-size: 12px; color: #71717a; }
.inv-cols { display: flex; gap: 10px; margin: 16px -24px 0; padding: 7px 24px; background: #f5f3ff; font-size: 11px; font-weight: 700; color: #6d28d9; text-transform: uppercase; letter-spacing: .06em; }
.inv-order { margin: 0 -24px; padding: 10px 24px; border-bottom: 1px dashed #c4b5fd; page-break-inside: avoid; break-inside: avoid; }
.inv-order:last-of-type { border-bottom: none; }
.inv-row { display: flex; gap: 10px; align-items: flex-start; padding: 3px 0; }
.inv-qty { width: 40px; flex: none; text-align: center; font-weight: 800; color: #6d28d9; }
.inv-info { flex: 1; min-width: 0; }
.inv-price { flex: none; min-width: 90px; text-align: right; font-weight: 700; white-space: nowrap; }
.inv-name { font-weight: 700; }
.inv-opt { font-size: 12px; font-weight: 400; color: #71717a; }
.inv-note { margin: 6px 0 0 40px; padding: 5px 10px; border-radius: 8px; background: #faf8ff; font-size: 12px; color: #52525b; }
.inv-note b { color: #6d28d9; }
.inv-total { display: flex; justify-content: space-between; align-items: center; margin: auto -24px 0; padding: 14px 24px 0; border-top: 2px solid #6d28d9; page-break-inside: avoid; break-inside: avoid; }
.inv-total .label { font-weight: 800; letter-spacing: .04em; }
.inv-total .sub { font-size: 12px; color: #71717a; }
.inv-total .amount { font-size: 22px; font-weight: 800; color: #6d28d9; }
`;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatCurrency(value: number): string {
    return `${value.toLocaleString('vi-VN')}đ`;
}

function formatDateTime(value: Date | string): string {
    return new Date(value).toLocaleString('vi-VN');
}

/** Phần thân hóa đơn (không có <html>/<head>) — dùng được cả để in lẫn để chụp thành PDF. */
export function buildOrdersInvoiceBody(orders: OrderResponse[]): string {
    // Cũ → mới, giống thứ tự BE từng in.
    const sorted = [...orders].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const grandTotal = sorted.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalItems = sorted.reduce(
        (sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0),
        0
    );

    const orderBlocks = sorted.map(order => {
        const rows = order.items.map(item => {
            const options = (item.options ?? []).map(option => {
                const extra = option.additionalPrice > 0 ? ` (+${formatCurrency(option.additionalPrice)})` : '';

                return `<div class="inv-opt">${escapeHtml(`${option.optionGroupName}: ${option.optionName}${extra}`)}</div>`;
            }).join('');

            return `<div class="inv-row">
                <div class="inv-qty">${item.quantity}x</div>
                <div class="inv-info"><div class="inv-name">${escapeHtml(item.foodName)}</div>${options}</div>
                <div class="inv-price">${formatCurrency(item.unitPrice)}</div>
            </div>`;
        }).join('');

        const note = order.note?.trim()
            ? `<div class="inv-note"><b>Ghi chú:</b> ${escapeHtml(order.note.trim())}</div>`
            : '';

        return `<div class="inv-order">${rows}${note}</div>`;
    }).join('');

    return `<div class="inv">
        <div class="inv-card">
            <div class="inv-head">
                <h1>DANH SÁCH ĐƠN HÀNG</h1>
                <p>Ngày in: ${formatDateTime(new Date())}</p>
            </div>
            <div class="inv-cols">
                <div class="inv-qty">SL</div>
                <div class="inv-info">Tên món</div>
                <div class="inv-price">Giá tiền</div>
            </div>
            ${orderBlocks}
            <div class="inv-total">
                <div>
                    <div class="label">TỔNG CỘNG</div>
                    <div class="sub">${sorted.length} đơn • ${totalItems} món</div>
                </div>
                <div class="amount">${formatCurrency(grandTotal)}</div>
            </div>
        </div>
    </div>`;
}

/** Tài liệu HTML đầy đủ (khổ A4) để xem trước và in. */
export function buildOrdersInvoiceDocument(orders: OrderResponse[]): string {
    return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8">
<title>Danh sách đơn hàng</title>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page { size: A4; margin: 12mm; }
html, body { height: 100%; margin: 0; padding: 0; background: #ffffff; }
body { padding: 16px 8px; }
${INVOICE_STYLES}
</style>
</head>
<body>${buildOrdersInvoiceBody(orders)}</body>
</html>`;
}

export async function downloadOrdersInvoicePdf(orders: OrderResponse[], fileName = `orders-${Date.now()}.pdf`): Promise<void> {
    const { default: html2pdf } = await import('html2pdf.js');

    const content = document.createElement('div');
    content.style.width = '794px';
    content.style.background = '#ffffff';
    content.innerHTML = `<style>${INVOICE_STYLES}</style>${buildOrdersInvoiceBody(orders)}`;

    const options = {
        margin: 10,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.inv-order' }
    };

    await html2pdf()
        .set(options as never)
        .from(content)
        .save();
}
