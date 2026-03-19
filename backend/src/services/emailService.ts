import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// ============================================================
// Resend HTTP API (bypasses SMTP port blocking on cloud platforms)
// ============================================================

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_API_KEY = config.email.pass; // re_... API key

// Log email config status on startup
if (RESEND_API_KEY) {
    logger.info('📧 Resend email service configured');
} else {
    logger.warn('📧 Resend API key not set — emails will not be sent');
}

// ============================================================
// Shared HTML Wrapper
// ============================================================

function wrapHTML(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<!-- Header -->
<tr>
<td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:32px 40px;">
<table width="100%"><tr>
<td><span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Fiscana</span></td>
</tr></table>
</td>
</tr>
<!-- Body -->
<tr>
<td style="padding:40px;">
${body}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
<p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
© ${new Date().getFullYear()} Fiscana Financial Services. All rights reserved.<br/>
<a href="https://fiscana.pro" style="color:#16a34a;text-decoration:none;">fiscana.pro</a>
</p>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// ============================================================
// Helper: send mail with error handling
// ============================================================

async function sendMail(to: string, subject: string, html: string, attachments?: any[]) {
    try {
        const body: any = {
            from: config.email.from,
            to: [to],
            subject,
            html,
        };

        // Convert nodemailer-style attachments to Resend format
        if (attachments && attachments.length > 0) {
            body.attachments = attachments.map((att: any) => ({
                filename: att.filename,
                content: att.content instanceof Buffer ? att.content.toString('base64') : att.content,
            }));
        }

        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Resend API ${response.status}: ${JSON.stringify(errorData)}`);
        }

        logger.info(`[EMAIL] Sent "${subject}" to ${to}`);
    } catch (error: any) {
        logger.error(`[EMAIL] Failed to send "${subject}" to ${to}:`, error.message);
    }
}

// ============================================================
// 1. Verification Code Email
// ============================================================

export async function sendVerificationCode(email: string, code: string, name: string) {
    const html = wrapHTML('Verify Your Email', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Verify Your Email</h1>
        <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name}, use the code below to complete your Fiscana signup.</p>
        <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#16a34a;">${code}</span>
        </div>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
    `);
    // Fire-and-forget: don't block signup response on email delivery
    sendMail(email, `${code} — Your Fiscana Verification Code`, html);
}

// ============================================================
// 2. Welcome Email
// ============================================================

export async function sendWelcomeEmail(email: string, name: string) {
    const html = wrapHTML('Welcome to Fiscana', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Welcome to Fiscana, ${name}! 🎉</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">We're thrilled to have you on board. Here's what you can do with Fiscana:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
            <tr><td style="padding:12px 16px;background:#f0fdf4;border-radius:8px;margin-bottom:8px;">
                <strong style="color:#16a34a;">💰SME Financing</strong>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Access flexible financing options to scale your business with ease.</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:#eff6ff;border-radius:8px;">
                <strong style="color:#2563eb;">📄 Professional Invoicing</strong>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Create, send, and track invoices with automatic tax calculations.</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:#fdf4ff;border-radius:8px;">
                <strong style="color:#9333ea;">📊 Tax &amp; Compliance</strong>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Stay compliant with Nigeria's 2026 tax reforms. AI-powered tax advice built in.</p>
            </td></tr>
            <tr><td style="height:8px;"></td></tr>
            <tr><td style="padding:12px 16px;background:#fefce8;border-radius:8px;">
                <strong style="color:#ca8a04;">🏦 Banking Integration</strong>
                <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Fund your wallet, withdraw to your bank, and manage all your finances in one place.</p>
            </td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;">Go to Dashboard →</a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">Need help getting started? Reply to this email and our team will be happy to assist.</p>
    `);
    await sendMail(email, 'Welcome to Fiscana — Your Financial OS', html);
}

// ============================================================
// 3. Admin New User Alert
// ============================================================

export async function sendAdminNewUserAlert(userName: string, userEmail: string, userType: string) {
    const html = wrapHTML('New User Registered', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">New User Registered 🆕</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">A new user has created an account on Fiscana.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;padding:16px;margin:0 0 20px;">
            <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Name</td><td style="padding:8px 16px;font-weight:700;color:#0f172a;">${userName}</td></tr>
            <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Email</td><td style="padding:8px 16px;font-weight:700;color:#0f172a;">${userEmail}</td></tr>
            <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Type</td><td style="padding:8px 16px;font-weight:700;color:#0f172a;">${userType}</td></tr>
            <tr><td style="padding:8px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:8px 16px;font-weight:700;color:#0f172a;">${new Date().toLocaleString()}</td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">View Admin Dashboard →</a>
    `);
    await sendMail(config.adminEmail, `New User: ${userName} (${userEmail})`, html);
}

// ============================================================
// 4. Invoice Created Email (with PDF attachment)
// ============================================================

export async function sendInvoiceEmail(
    email: string,
    userName: string,
    invoice: {
        id: string;
        clientName: string;
        totalAmount: number;
        currency: string;
        dueDate: string;
    },
    pdfBuffer: Buffer
) {
    const currencySymbol = invoice.currency === 'NGN' ? '₦' : invoice.currency === 'USD' ? '$' : invoice.currency;
    const html = wrapHTML('Invoice Created', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Invoice Created ✅</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${userName}, your invoice has been created successfully.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Invoice ID</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;font-size:13px;">${invoice.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Client</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${invoice.clientName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Total</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;font-size:18px;">${currencySymbol}${invoice.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Due Date</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${invoice.dueDate}</td></tr>
        </table>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">📎 A PDF copy of this invoice is attached to this email.</p>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">View Invoices →</a>
    `);
    await sendMail(email, `Invoice Created — ${currencySymbol}${invoice.totalAmount.toLocaleString()} for ${invoice.clientName}`, html, [
        {
            filename: `Fiscana_Invoice_${invoice.id.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        },
    ]);
}

// ============================================================
// 4b. Invoice Email to Client
// ============================================================

export async function sendInvoiceToClient(
    clientEmail: string,
    clientName: string,
    invoice: {
        id: string;
        totalAmount: number;
        currency: string;
        dueDate: string;
    },
    senderName: string,
    pdfBuffer: Buffer
) {
    const currencySymbol = invoice.currency === 'NGN' ? '₦' : invoice.currency === 'USD' ? '$' : invoice.currency;
    const html = wrapHTML('You Have a New Invoice', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">New Invoice Received 📄</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${clientName}, you've received an invoice from <strong>${senderName}</strong>.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Invoice ID</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;font-size:13px;">${invoice.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">From</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${senderName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Amount Due</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;font-size:18px;">${currencySymbol}${invoice.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Due Date</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${invoice.dueDate}</td></tr>
        </table>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">📎 Please review the attached invoice PDF for full details including payment instructions.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">This invoice was generated via Fiscana. If you have any questions, please contact ${senderName} directly.</p>
    `);
    await sendMail(clientEmail, `Invoice from ${senderName} — ${currencySymbol}${invoice.totalAmount.toLocaleString()} Due`, html, [
        {
            filename: `Fiscana_Invoice_${invoice.id.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        },
    ]);
}

// ============================================================
// 4c. Receipt Email to User (Payment Confirmed)
// ============================================================

export async function sendReceiptEmail(
    email: string,
    userName: string,
    receipt: {
        id: string;
        clientName: string;
        totalAmount: number;
        currency: string;
        paidDate: string;
    },
    pdfBuffer: Buffer
) {
    const currencySymbol = receipt.currency === 'NGN' ? '₦' : receipt.currency === 'USD' ? '$' : receipt.currency;
    const html = wrapHTML('Payment Received', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Payment Received 💰</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${userName}, your invoice has been fully paid.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Receipt ID</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;font-size:13px;">${receipt.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Client</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${receipt.clientName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Amount Paid</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;font-size:18px;">${currencySymbol}${receipt.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Paid Date</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${receipt.paidDate}</td></tr>
        </table>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">📎 A PDF receipt is attached to this email for your records.</p>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">View Invoices →</a>
    `);
    await sendMail(email, `Payment Received — ${currencySymbol}${receipt.totalAmount.toLocaleString()} from ${receipt.clientName}`, html, [
        {
            filename: `Fiscana_Receipt_${receipt.id.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        },
    ]);
}

// ============================================================
// 4d. Receipt Email to Client
// ============================================================

export async function sendReceiptToClient(
    clientEmail: string,
    clientName: string,
    receipt: {
        id: string;
        totalAmount: number;
        currency: string;
        paidDate: string;
    },
    senderName: string,
    pdfBuffer: Buffer
) {
    const currencySymbol = receipt.currency === 'NGN' ? '₦' : receipt.currency === 'USD' ? '$' : receipt.currency;
    const html = wrapHTML('Payment Receipt', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Payment Receipt ✅</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${clientName}, this confirms your payment to <strong>${senderName}</strong> has been received.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Receipt ID</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;font-size:13px;">${receipt.id.slice(0, 8).toUpperCase()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Paid To</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${senderName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Amount Paid</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;font-size:18px;">${currencySymbol}${receipt.totalAmount.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${receipt.paidDate}</td></tr>
        </table>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">📎 A PDF receipt is attached to this email for your records.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">This receipt was generated via Fiscana. If you have any questions, please contact ${senderName} directly.</p>
    `);
    await sendMail(clientEmail, `Payment Receipt from ${senderName} — ${currencySymbol}${receipt.totalAmount.toLocaleString()}`, html, [
        {
            filename: `Fiscana_Receipt_${receipt.id.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        },
    ]);
}

// ============================================================
// 5. Transaction Email (Add Funds / Withdraw)
// ============================================================

export async function sendTransactionEmail(
    email: string,
    name: string,
    tx: {
        type: 'ADD_FUNDS' | 'WITHDRAWAL';
        amount: number;
        currency: string;
        narration?: string;
    }
) {
    const isDeposit = tx.type === 'ADD_FUNDS';
    const currencySymbol = tx.currency === 'NGN' ? '₦' : tx.currency === 'USD' ? '$' : tx.currency;
    const emoji = isDeposit ? '💰' : '💸';
    const title = isDeposit ? 'Funds Added Successfully' : 'Withdrawal Processed';
    const color = isDeposit ? '#16a34a' : '#dc2626';

    const html = wrapHTML(title, `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">${emoji} ${title}</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, here are your transaction details:</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 24px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Type</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${isDeposit ? 'Deposit / Add Funds' : 'Withdrawal / Payout'}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Amount</td><td style="padding:10px 16px;font-weight:700;color:${color};font-size:18px;">${currencySymbol}${tx.amount.toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Currency</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${tx.currency}</td></tr>
            ${tx.narration ? `<tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Note</td><td style="padding:10px 16px;color:#0f172a;">${tx.narration}</td></tr>` : ''}
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:10px 16px;color:#0f172a;">${new Date().toLocaleString()}</td></tr>
        </table>
        <p style="margin:0;color:#94a3b8;font-size:12px;">If you did not perform this transaction, please contact support immediately.</p>
    `);
    await sendMail(email, `${title} — ${currencySymbol}${tx.amount.toLocaleString()} ${tx.currency}`, html);
}

// ============================================================
// 6. KYC Emails
// ============================================================

export async function sendKYCSubmittedEmail(email: string, name: string) {
    const html = wrapHTML('KYC Submitted', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">KYC Submitted Successfully 📋</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, thank you for submitting your KYC documents for verification.</p>
        <div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#1e40af;font-size:14px;font-weight:600;">What happens next?</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Our team will review your documents. You'll receive an email once the review is complete. This typically takes 1–2 business days.</p>
        </div>
        <p style="margin:0;color:#94a3b8;font-size:12px;">Thank you for helping us keep Fiscana secure.</p>
    `);
    await sendMail(email, 'KYC Verification Submitted — Fiscana', html);
}

export async function sendKYCAdminAlert(userName: string, userEmail: string) {
    const html = wrapHTML('KYC Review Required', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">KYC Review Required 🔍</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">A user has submitted KYC documents for verification.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">User</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${userName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Email</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${userEmail}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Submitted</td><td style="padding:10px 16px;color:#0f172a;">${new Date().toLocaleString()}</td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Review in Dashboard →</a>
    `);
    await sendMail(config.adminEmail, `KYC Review Required: ${userName}`, html);
}

export async function sendKYCApprovedEmail(email: string, name: string) {
    const html = wrapHTML('KYC Approved', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">KYC Approved! 🎉</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Congratulations ${name}! Your KYC verification has been approved.</p>
        <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">Your account has been upgraded to Tier 2</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">You now have access to higher transaction limits and additional features.</p>
        </div>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;">Go to Dashboard →</a>
    `);
    await sendMail(email, 'KYC Approved — Welcome to Tier 2!', html);
}

export async function sendKYCRejectedEmail(email: string, name: string) {
    const html = wrapHTML('KYC Status Update', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">KYC Verification Update</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, unfortunately your KYC verification could not be approved at this time.</p>
        <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">What can you do?</p>
            <p style="margin:8px 0 0;color:#64748b;font-size:13px;">Please ensure your BVN and NIN details are correct and resubmit your KYC verification. If you believe this is an error, contact our support team.</p>
        </div>
        <a href="https://fiscana.pro" style="display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Resubmit KYC →</a>
    `);
    await sendMail(email, 'KYC Verification Update — Fiscana', html);
}

// ============================================================
// 8. SME Finance Emails
// ============================================================

export async function sendSMEApplicationEmail(userName: string, userEmail: string, businessName: string, loanAmount: number) {
    const html = wrapHTML('New SME Finance Application', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">New SME Finance Application 📋</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">A user has submitted an SME Finance application for review.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:0 0 20px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Applicant</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${userName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Email</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${userEmail}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Business</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${businessName}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Loan Amount</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;font-size:18px;">₦${Number(loanAmount).toLocaleString()}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Date</td><td style="padding:10px 16px;color:#0f172a;">${new Date().toLocaleString()}</td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Review in Dashboard →</a>
    `);
    await sendMail(config.adminEmail, `New SME Finance Application: ${businessName} — ₦${Number(loanAmount).toLocaleString()}`, html);
}

export async function sendSMEStatusUpdateEmail(email: string, name: string, businessName: string, status: string) {
    const isApproved = status === 'APPROVED';
    const bgColor = isApproved ? '#f0fdf4' : '#fef2f2';
    const borderColor = isApproved ? '#16a34a' : '#dc2626';
    const textColor = isApproved ? '#166534' : '#991b1b';
    const statusText = isApproved ? 'Approved ✅' : status === 'DECLINED' ? 'Declined ❌' : 'Updated';

    const html = wrapHTML('SME Finance Update', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">SME Finance Application Update</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, there's an update on your SME Finance application for <strong>${businessName}</strong>.</p>
        <div style="background:${bgColor};border-left:4px solid ${borderColor};padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:${textColor};font-size:16px;font-weight:700;">Status: ${statusText}</p>
        </div>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">View Application →</a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">If you have questions about this decision, please contact our support team.</p>
    `);
    await sendMail(email, `SME Finance Application ${statusText} — ${businessName}`, html);
}

// ============================================================
// 7. Password Reset Email
// ============================================================

export async function sendPasswordResetEmail(email: string, name: string, resetLink: string) {
    const html = wrapHTML('Reset Your Password', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Reset Your Password 🔐</h1>
        <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Hi ${name || 'there'}, we received a request to reset your password.</p>
        <a href="${resetLink}" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;font-size:15px;margin:0 0 24px;">Reset Password →</a>
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;">This link will expire in 1 hour.</p>
        <p style="margin:0;color:#94a3b8;font-size:12px;">If you didn't request a password reset, you can safely ignore this email.</p>
    `);
    await sendMail(email, 'Reset Your Password — Fiscana', html);
}

// ============================================================
// 8. Subscription Emails
// ============================================================

export async function sendSubscriptionConfirmationEmail(email: string, name: string, plan: string, expiresAt: Date) {
    const planLabel = plan === 'ANNUAL' ? 'Annual (₦24,900/year)' : 'Monthly (₦2,500/month)';
    const html = wrapHTML('Subscription Confirmed', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Subscription Confirmed ✅</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, your Fiscana subscription has been activated!</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f8fafc;border-radius:8px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Plan</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">${planLabel}</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Active Until</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;">${expiresAt.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#16a34a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Go to Dashboard →</a>
    `);
    await sendMail(email, `Subscription Confirmed — Fiscana ${plan}`, html);
}

export async function sendSubscriptionExpiredEmail(email: string, name: string) {
    const html = wrapHTML('Subscription Expired', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Your Subscription Has Expired</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, your Fiscana subscription has expired. Renew now to continue using all features.</p>
        <div style="background:#fff7ed;border-left:4px solid #f97316;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 20px;">
            <p style="margin:0;color:#9a3412;font-size:14px;">Your data is safe — renew anytime to regain access.</p>
        </div>
        <a href="https://fiscana.pro" style="display:inline-block;background:#f97316;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Renew Subscription →</a>
    `);
    await sendMail(email, 'Your Fiscana Subscription Has Expired', html);
}

export async function sendTrialExpiringEmail(email: string, name: string, daysLeft: number) {
    const html = wrapHTML('Trial Ending Soon', `
        <h1 style="margin:0 0 8px;font-size:24px;color:#0f172a;">Your Free Trial Ends in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}</h1>
        <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, your Fiscana free trial is almost over. Subscribe now to keep using all features.</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#f8fafc;border-radius:8px;">
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Monthly</td><td style="padding:10px 16px;font-weight:700;color:#0f172a;">₦2,500/month</td></tr>
            <tr><td style="padding:10px 16px;color:#64748b;font-size:13px;">Annual</td><td style="padding:10px 16px;font-weight:700;color:#16a34a;">₦24,900/year (Save 17%)</td></tr>
        </table>
        <a href="https://fiscana.pro" style="display:inline-block;background:#0f172a;color:#ffffff;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;">Subscribe Now →</a>
    `);
    await sendMail(email, `Your Fiscana Trial Ends in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`, html);
}

// ============================================================
// Export all functions as a service object
// ============================================================

export const emailService = {
    sendVerificationCode,
    sendWelcomeEmail,
    sendAdminNewUserAlert,
    sendInvoiceEmail,
    sendInvoiceToClient,
    sendReceiptEmail,
    sendReceiptToClient,
    sendTransactionEmail,
    sendKYCSubmittedEmail,
    sendKYCAdminAlert,
    sendKYCApprovedEmail,
    sendKYCRejectedEmail,
    sendPasswordResetEmail,
    sendSMEApplicationEmail,
    sendSMEStatusUpdateEmail,
    sendSubscriptionConfirmationEmail,
    sendSubscriptionExpiredEmail,
    sendTrialExpiringEmail,
};
