import PDFDocument from 'pdfkit';

interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

interface InvoiceData {
    id: string;
    clientName: string;
    clientEmail: string;
    issueDate: string;
    dueDate: string;
    currency: string;
    items: InvoiceItem[];
    subTotal: number;
    vatAmount: number;
    whtDeduction: number;
    totalAmount: number;
    paymentMethods?: string[];
    paymentBankName?: string;
    paymentAccountNumber?: string;
    paymentAccountName?: string;
    paymentWalletAddress?: string;
    paymentWalletNetwork?: string;
    userName?: string;
    userEmail?: string;
}

function getCurrencySymbol(currency: string): string {
    switch (currency) {
        case 'NGN': return '₦';
        case 'USD': return '$';
        case 'GBP': return '£';
        case 'EUR': return '€';
        default: return currency + ' ';
    }
}

export function generateInvoicePDF(invoice: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Uint8Array[] = [];

            doc.on('data', (chunk: Uint8Array) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const sym = getCurrencySymbol(invoice.currency);
            const pageWidth = doc.page.width - 100; // 50px margin each side

            // ── Header ──────────────────────────────────────
            doc.rect(0, 0, doc.page.width, 100).fill('#16a34a');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
                .text('Fiscana', 50, 35);
            doc.fontSize(10).font('Helvetica').fillColor('#d1fae5')
                .text('Financial OS for Global Players', 50, 68);

            // Invoice title
            doc.fontSize(10).fillColor('#ffffff')
                .text('INVOICE', doc.page.width - 200, 35, { width: 150, align: 'right' });
            doc.fontSize(14).font('Helvetica-Bold')
                .text(`#${invoice.id.slice(0, 8).toUpperCase()}`, doc.page.width - 200, 50, { width: 150, align: 'right' });

            let y = 120;

            // ── From / To ──────────────────────────────────
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('FROM', 50, y);
            doc.fontSize(11).font('Helvetica').fillColor('#0f172a')
                .text(invoice.userName || 'Fiscana User', 50, y + 14);
            if (invoice.userEmail) {
                doc.fontSize(9).fillColor('#64748b')
                    .text(invoice.userEmail, 50, y + 28);
            }

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('TO', 300, y);
            doc.fontSize(11).font('Helvetica').fillColor('#0f172a')
                .text(invoice.clientName, 300, y + 14);
            doc.fontSize(9).fillColor('#64748b')
                .text(invoice.clientEmail, 300, y + 28);

            y += 60;

            // ── Dates ───────────────────────────────────────
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('ISSUE DATE', 50, y);
            doc.fontSize(10).font('Helvetica').fillColor('#0f172a')
                .text(new Date(invoice.issueDate).toLocaleDateString(), 50, y + 14);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('DUE DATE', 200, y);
            doc.fontSize(10).font('Helvetica').fillColor('#0f172a')
                .text(new Date(invoice.dueDate).toLocaleDateString(), 200, y + 14);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('CURRENCY', 350, y);
            doc.fontSize(10).font('Helvetica').fillColor('#0f172a')
                .text(invoice.currency, 350, y + 14);

            y += 50;

            // ── Line Items Table ────────────────────────────
            // Header row
            doc.rect(50, y, pageWidth, 28).fill('#f1f5f9');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
            doc.text('Description', 60, y + 8, { width: 250 });
            doc.text('Qty', 320, y + 8, { width: 50, align: 'center' });
            doc.text('Unit Price', 380, y + 8, { width: 80, align: 'right' });
            doc.text('Amount', 470, y + 8, { width: 80, align: 'right' });
            y += 28;

            // Item rows
            doc.font('Helvetica').fillColor('#0f172a');
            for (const item of invoice.items) {
                const lineTotal = item.quantity * item.unitPrice;
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.fontSize(10);
                doc.text(item.description, 60, y + 6, { width: 250 });
                doc.text(String(item.quantity), 320, y + 6, { width: 50, align: 'center' });
                doc.text(`${sym}${item.unitPrice.toLocaleString()}`, 380, y + 6, { width: 80, align: 'right' });
                doc.text(`${sym}${lineTotal.toLocaleString()}`, 470, y + 6, { width: 80, align: 'right' });

                y += 24;
                doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            }

            y += 16;

            // ── Totals ──────────────────────────────────────
            const totalsX = 370;
            const totalsValX = 470;

            doc.fontSize(10).font('Helvetica').fillColor('#64748b');
            doc.text('Subtotal', totalsX, y, { width: 90, align: 'right' });
            doc.fillColor('#0f172a').text(`${sym}${invoice.subTotal.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
            y += 20;

            if (invoice.vatAmount > 0) {
                doc.fillColor('#64748b').text('VAT', totalsX, y, { width: 90, align: 'right' });
                doc.fillColor('#0f172a').text(`${sym}${invoice.vatAmount.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
                y += 20;
            }

            if (invoice.whtDeduction > 0) {
                doc.fillColor('#64748b').text('WHT Deduction', totalsX, y, { width: 90, align: 'right' });
                doc.fillColor('#dc2626').text(`-${sym}${invoice.whtDeduction.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
                y += 20;
            }

            // Total row
            doc.rect(totalsX - 10, y, 170, 30).fill('#f0fdf4');
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#16a34a');
            doc.text('Total', totalsX, y + 7, { width: 90, align: 'right' });
            doc.text(`${sym}${invoice.totalAmount.toLocaleString()}`, totalsValX, y + 7, { width: 80, align: 'right' });

            y += 50;

            // ── Payment Details ─────────────────────────────
            if (invoice.paymentBankName || invoice.paymentWalletAddress) {
                if (y > 680) { doc.addPage(); y = 50; }

                doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a')
                    .text('Payment Details', 50, y);
                y += 18;

                doc.fontSize(9).font('Helvetica').fillColor('#64748b');
                if (invoice.paymentBankName) {
                    doc.text(`Bank: ${invoice.paymentBankName}`, 50, y); y += 14;
                    doc.text(`Account: ${invoice.paymentAccountNumber || ''}`, 50, y); y += 14;
                    doc.text(`Name: ${invoice.paymentAccountName || ''}`, 50, y); y += 14;
                }
                if (invoice.paymentWalletAddress) {
                    doc.text(`Wallet: ${invoice.paymentWalletAddress}`, 50, y); y += 14;
                    doc.text(`Network: ${invoice.paymentWalletNetwork || ''}`, 50, y); y += 14;
                }
            }

            // ── Footer ──────────────────────────────────────
            doc.fontSize(8).fillColor('#94a3b8')
                .text('Generated by Fiscana — fiscana.pro', 50, doc.page.height - 40, { align: 'center', width: pageWidth });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

// ── Receipt PDF ──────────────────────────────────────────────

interface ReceiptData extends InvoiceData {
    paidDate: string;
    amountPaid: number;
}

export function generateReceiptPDF(receipt: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            const buffers: Uint8Array[] = [];

            doc.on('data', (chunk: Uint8Array) => buffers.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const sym = getCurrencySymbol(receipt.currency);
            const pageWidth = doc.page.width - 100; // 50px margin each side

            // ── Header ──────────────────────────────────────
            doc.rect(0, 0, doc.page.width, 100).fill('#16a34a');
            doc.fontSize(28).font('Helvetica-Bold').fillColor('#ffffff')
                .text('Fiscana', 50, 35);
            doc.fontSize(10).font('Helvetica').fillColor('#d1fae5')
                .text('Financial OS for Global Players', 50, 68);

            // Receipt title + PAID badge
            doc.fontSize(10).fillColor('#ffffff')
                .text('RECEIPT', doc.page.width - 200, 30, { width: 150, align: 'right' });
            doc.fontSize(14).font('Helvetica-Bold')
                .text(`#${receipt.id.slice(0, 8).toUpperCase()}`, doc.page.width - 200, 45, { width: 150, align: 'right' });

            // PAID badge
            doc.roundedRect(doc.page.width - 130, 65, 80, 24, 4).fill('#ffffff');
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#16a34a')
                .text('PAID ✓', doc.page.width - 128, 70, { width: 76, align: 'center' });

            let y = 120;

            // ── From / To ──────────────────────────────────
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('FROM', 50, y);
            doc.fontSize(11).font('Helvetica').fillColor('#0f172a')
                .text(receipt.userName || 'Fiscana User', 50, y + 14);
            if (receipt.userEmail) {
                doc.fontSize(9).fillColor('#64748b')
                    .text(receipt.userEmail, 50, y + 28);
            }

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('TO', 300, y);
            doc.fontSize(11).font('Helvetica').fillColor('#0f172a')
                .text(receipt.clientName, 300, y + 14);
            doc.fontSize(9).fillColor('#64748b')
                .text(receipt.clientEmail, 300, y + 28);

            y += 60;

            // ── Dates ───────────────────────────────────────
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('ISSUE DATE', 50, y);
            doc.fontSize(10).font('Helvetica').fillColor('#0f172a')
                .text(new Date(receipt.issueDate).toLocaleDateString(), 50, y + 14);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('PAID DATE', 200, y);
            doc.fontSize(10).font('Helvetica').fillColor('#16a34a')
                .text(new Date(receipt.paidDate).toLocaleDateString(), 200, y + 14);

            doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
                .text('CURRENCY', 350, y);
            doc.fontSize(10).font('Helvetica').fillColor('#0f172a')
                .text(receipt.currency, 350, y + 14);

            y += 50;

            // ── Line Items Table ────────────────────────────
            // Header row
            doc.rect(50, y, pageWidth, 28).fill('#f1f5f9');
            doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569');
            doc.text('Description', 60, y + 8, { width: 250 });
            doc.text('Qty', 320, y + 8, { width: 50, align: 'center' });
            doc.text('Unit Price', 380, y + 8, { width: 80, align: 'right' });
            doc.text('Amount', 470, y + 8, { width: 80, align: 'right' });
            y += 28;

            // Item rows
            doc.font('Helvetica').fillColor('#0f172a');
            for (const item of receipt.items) {
                const lineTotal = item.quantity * item.unitPrice;
                if (y > 700) {
                    doc.addPage();
                    y = 50;
                }
                doc.fontSize(10);
                doc.text(item.description, 60, y + 6, { width: 250 });
                doc.text(String(item.quantity), 320, y + 6, { width: 50, align: 'center' });
                doc.text(`${sym}${item.unitPrice.toLocaleString()}`, 380, y + 6, { width: 80, align: 'right' });
                doc.text(`${sym}${lineTotal.toLocaleString()}`, 470, y + 6, { width: 80, align: 'right' });

                y += 24;
                doc.moveTo(50, y).lineTo(50 + pageWidth, y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            }

            y += 16;

            // ── Totals ──────────────────────────────────────
            const totalsX = 370;
            const totalsValX = 470;

            doc.fontSize(10).font('Helvetica').fillColor('#64748b');
            doc.text('Subtotal', totalsX, y, { width: 90, align: 'right' });
            doc.fillColor('#0f172a').text(`${sym}${receipt.subTotal.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
            y += 20;

            if (receipt.vatAmount > 0) {
                doc.fillColor('#64748b').text('VAT', totalsX, y, { width: 90, align: 'right' });
                doc.fillColor('#0f172a').text(`${sym}${receipt.vatAmount.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
                y += 20;
            }

            if (receipt.whtDeduction > 0) {
                doc.fillColor('#64748b').text('WHT Deduction', totalsX, y, { width: 90, align: 'right' });
                doc.fillColor('#dc2626').text(`-${sym}${receipt.whtDeduction.toLocaleString()}`, totalsValX, y, { width: 80, align: 'right' });
                y += 20;
            }

            // Total row
            doc.rect(totalsX - 10, y, 170, 30).fill('#f0fdf4');
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#16a34a');
            doc.text('Total Paid', totalsX, y + 7, { width: 90, align: 'right' });
            doc.text(`${sym}${receipt.amountPaid.toLocaleString()}`, totalsValX, y + 7, { width: 80, align: 'right' });

            y += 50;

            // ── Payment Confirmation ────────────────────────
            if (y > 680) { doc.addPage(); y = 50; }
            doc.rect(50, y, pageWidth, 40).fill('#f0fdf4');
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#16a34a')
                .text('✓ Payment Received', 60, y + 6);
            doc.fontSize(9).font('Helvetica').fillColor('#64748b')
                .text(`Full payment of ${sym}${receipt.amountPaid.toLocaleString()} received on ${new Date(receipt.paidDate).toLocaleDateString()}`, 60, y + 22);

            // ── Footer ──────────────────────────────────────
            doc.fontSize(8).fillColor('#94a3b8')
                .text('Generated by Fiscana — fiscana.pro', 50, doc.page.height - 40, { align: 'center', width: pageWidth });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

export const pdfService = { generateInvoicePDF, generateReceiptPDF };
