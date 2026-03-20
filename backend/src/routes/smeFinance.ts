import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { sendSMEApplicationEmail, sendSMEStatusUpdateEmail } from '../services/emailService.js';
import { appendApplicationToSheet } from '../services/googleSheetsService.js';

const router = Router();

// All SME routes require authentication
router.use(authenticate);

// Middleware: require ADMIN role
const requireAdmin = asyncHandler(async (req: Request, res: Response, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
});

// ==================== AUTO-SCORING ALGORITHM ====================

function computePreQualScore(data: any): {
    preQualScore: number;
    revenueStrength: string;
    repaymentCapacity: string;
    creditHistory: string;
    documentationLevel: string;
    preQualOutcome: string;
} {
    let score = 0;

    // 1. Business operating for at least 6–12 months
    if (data.yearEstablished) {
        const estYear = parseInt(data.yearEstablished);
        const currentYear = new Date().getFullYear();
        if (!isNaN(estYear) && (currentYear - estYear) >= 1) {
            score++;
        }
    }

    // 2. Registered with CAC
    if (data.registeredWithCAC === true || data.registeredWithCAC === 'Yes') {
        score++;
    }

    // 3. Monthly revenue is consistent (non-zero)
    if (data.monthlySalesRevenue && parseFloat(data.monthlySalesRevenue) > 0) {
        score++;
    }

    // 4. Owner has valid BVN/NIN
    if ((data.ownerBVN && data.ownerBVN.trim().length > 0) ||
        (data.ownerNationalId && data.ownerNationalId.trim().length > 0)) {
        score++;
    }

    // 5. Bank account active for 6+ months (proxy: has bank statements)
    if (data.hasBankStatements === true || data.hasBankStatements === 'Yes') {
        score++;
    }

    // 6. Clear loan purpose
    if (data.loanPurpose && data.loanPurpose.trim().length > 0) {
        score++;
    }

    // 7. No history of loan default
    if (!data.hasPreviousLoan || data.hasPreviousLoan === false || data.hasPreviousLoan === 'No') {
        score++; // No previous loan = no default
    } else if (data.previousLoanStatus && data.previousLoanStatus !== 'Defaulted') {
        score++; // Has loan but not defaulted
    }

    // 8. Financial records available
    if (data.keepsFinancialRecords === true || data.keepsFinancialRecords === 'Yes') {
        score++;
    }

    // 9. Business located and verifiable
    if (data.businessAddress && data.businessAddress.trim().length > 5) {
        score++;
    }

    // ===== RISK & ELIGIBILITY SCORING =====

    // Revenue Strength
    const monthlyRev = parseFloat(data.monthlySalesRevenue) || 0;
    let revenueStrength = 'Low';
    if (monthlyRev > 1000000) revenueStrength = 'High';
    else if (monthlyRev > 200000) revenueStrength = 'Medium';

    // Repayment Capacity
    const monthlyProfit = parseFloat(data.monthlyProfitEstimate) || 0;
    const expectedRepayment = parseFloat(data.expectedMonthlyRepayment) || 0;
    let repaymentCapacity = 'Low';
    if (monthlyProfit > 0 && expectedRepayment > 0) {
        const ratio = expectedRepayment / monthlyProfit;
        if (ratio < 0.3) repaymentCapacity = 'High';
        else if (ratio <= 0.5) repaymentCapacity = 'Medium';
    } else if (monthlyProfit > 0 && expectedRepayment === 0) {
        repaymentCapacity = 'Medium'; // Has profit but no repayment specified
    }

    // Credit History
    let creditHistoryRating = 'Fair';
    if (!data.hasPreviousLoan || data.hasPreviousLoan === false || data.hasPreviousLoan === 'No') {
        creditHistoryRating = 'Fair'; // No history
    } else if (data.previousLoanStatus === 'Repaid') {
        creditHistoryRating = 'Good';
    } else if (data.previousLoanStatus === 'Defaulted') {
        creditHistoryRating = 'Poor';
    } else if (data.previousLoanStatus === 'Active') {
        creditHistoryRating = 'Fair';
    }

    // Documentation Level
    let docCount = 0;
    if (data.cacDocumentData || data.cacDocumentUrl) docCount++;
    if (data.validIdData || data.validIdUrl) docCount++;
    if (data.bankStatementData || data.bankStatementUrl) docCount++;
    if (data.utilityBillData || data.utilityBillUrl) docCount++;
    if (data.passportPhotoData || data.passportPhotoUrl) docCount++;
    if (data.tinDocumentData || data.tinDocumentUrl) docCount++;
    if (data.collateralDocumentData || data.collateralDocumentUrl) docCount++;

    let documentationLevel = 'Low';
    if (docCount >= 5) documentationLevel = 'High';
    else if (docCount >= 3) documentationLevel = 'Medium';

    // Pre-Qualification Outcome
    let preQualOutcome = 'Not Qualified';
    if (score >= 7) preQualOutcome = 'Qualified';
    else if (score >= 4) preQualOutcome = 'Conditionally Qualified';

    return {
        preQualScore: score,
        revenueStrength,
        repaymentCapacity,
        creditHistory: creditHistoryRating,
        documentationLevel,
        preQualOutcome,
    };
}

// Helper: convert file data to URL
function fileToUrl(data: string | undefined, name: string | undefined, mimePrefix: string = 'application/pdf'): string | null {
    if (!data) return null;
    const base64Part = data.includes(',') ? data.split(',')[1] : data;
    return `data:${mimePrefix};name=${name || 'file'};base64,${base64Part}`;
}

// ==================== USER ENDPOINTS ====================

/** POST /api/sme-finance/apply — Submit SME Finance application */
router.post('/apply', [
    body('businessName').trim().notEmpty().withMessage('Business name is required'),
    body('businessType').trim().notEmpty().withMessage('Business type is required'),
    body('businessAddress').trim().notEmpty().withMessage('Business address is required'),
    body('loanAmount').isFloat({ min: 1 }).withMessage('Loan amount must be greater than 0'),
    body('loanPurpose').trim().notEmpty().withMessage('Loan purpose is required'),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Verify KYC status
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.kycStatus !== 'VERIFIED') {
        return res.status(403).json({
            success: false,
            error: 'KYC verification is required to apply for SME Finance.',
        });
    }

    const {
        // Section 1: Business Information
        businessName, rcNumber, registeredWithCAC, businessType,
        industrySector, businessAddress, state, yearEstablished,
        numberOfEmployees, contactPersonName, contactPhone, contactEmail,
        // Section 2: Owner/Director Details
        ownerFullName, ownerDOB, ownerGender, ownerBVN, ownerNationalId,
        ownerResidentialAddress, ownerPercentageOwnership, ownerPhone, ownerEmail,
        // Section 3: Business Operations
        businessActivities, productsServices, majorCustomers, hasExistingContracts,
        monthlySalesRevenue, monthlyExpenses, monthlyProfitEstimate,
        // Section 4: Loan Request Details
        loanAmount, loanPurpose, loanTenorMonths, expectedMonthlyRepayment,
        hasPreviousLoan, previousLoanSource, previousLoanStatus,
        // Section 5: Financial Records
        keepsFinancialRecords, hasBankStatements, hasFinancialStatements,
        hasTIN, primaryBankName, bankAccountNumber,
        // Section 6: Collateral / Guarantee
        hasCollateral, collateralType, collateralEstimatedValue, willingToProvideGuarantor,
        // Section 7: Document Upload data
        cacDocumentData, cacDocumentName,
        validIdData, validIdName,
        bankStatementData, bankStatementName,
        utilityBillData, utilityBillName,
        passportPhotoData, passportPhotoName,
        tinDocumentData, tinDocumentName,
        collateralDocumentData, collateralDocumentName,
        // Declaration
        applicantDeclarationName, declarationDate,
    } = req.body;

    // Build document URLs from base64 data
    const cacDocumentUrl = fileToUrl(cacDocumentData, cacDocumentName);
    const validIdUrl = fileToUrl(validIdData, validIdName);
    const bankStatementUrl = fileToUrl(bankStatementData, bankStatementName);
    const utilityBillUrl = fileToUrl(utilityBillData, utilityBillName);
    const passportPhotoUrl = fileToUrl(passportPhotoData, passportPhotoName, 'image/jpeg');
    const tinDocumentUrl = fileToUrl(tinDocumentData, tinDocumentName);
    const collateralDocumentUrl = fileToUrl(collateralDocumentData, collateralDocumentName);

    // Compute pre-qualification scores
    const scores = computePreQualScore({
        ...req.body,
        cacDocumentData, validIdData, bankStatementData,
        utilityBillData, passportPhotoData, tinDocumentData, collateralDocumentData,
    });

    const application = await prisma.sMEApplication.create({
        data: {
            userId,
            // Section 1
            businessName,
            rcNumber: rcNumber || null,
            registeredWithCAC: registeredWithCAC === true || registeredWithCAC === 'Yes',
            businessType,
            industrySector: industrySector || null,
            businessAddress,
            state: state || null,
            yearEstablished: yearEstablished || null,
            numberOfEmployees: numberOfEmployees || null,
            contactPersonName: contactPersonName || null,
            contactPhone: contactPhone || null,
            contactEmail: contactEmail || null,
            // Section 2
            ownerFullName: ownerFullName || null,
            ownerDOB: ownerDOB || null,
            ownerGender: ownerGender || null,
            ownerBVN: ownerBVN || null,
            ownerNationalId: ownerNationalId || null,
            ownerResidentialAddress: ownerResidentialAddress || null,
            ownerPercentageOwnership: ownerPercentageOwnership || null,
            ownerPhone: ownerPhone || null,
            ownerEmail: ownerEmail || null,
            // Section 3
            businessActivities: businessActivities || null,
            productsServices: productsServices || null,
            majorCustomers: majorCustomers || null,
            hasExistingContracts: hasExistingContracts === true || hasExistingContracts === 'Yes',
            monthlySalesRevenue: monthlySalesRevenue ? parseFloat(monthlySalesRevenue) : null,
            monthlyExpenses: monthlyExpenses ? parseFloat(monthlyExpenses) : null,
            monthlyProfitEstimate: monthlyProfitEstimate ? parseFloat(monthlyProfitEstimate) : null,
            // Section 4
            loanAmount: parseFloat(loanAmount),
            loanPurpose,
            loanTenorMonths: loanTenorMonths ? parseInt(loanTenorMonths) : null,
            expectedMonthlyRepayment: expectedMonthlyRepayment ? parseFloat(expectedMonthlyRepayment) : null,
            hasPreviousLoan: hasPreviousLoan === true || hasPreviousLoan === 'Yes',
            previousLoanSource: previousLoanSource || null,
            previousLoanStatus: previousLoanStatus || null,
            repaymentPeriod: loanTenorMonths ? parseInt(loanTenorMonths) : 12,
            // Section 5
            keepsFinancialRecords: keepsFinancialRecords === true || keepsFinancialRecords === 'Yes',
            hasBankStatements: hasBankStatements === true || hasBankStatements === 'Yes',
            hasFinancialStatements: hasFinancialStatements === true || hasFinancialStatements === 'Yes',
            hasTIN: hasTIN === true || hasTIN === 'Yes',
            primaryBankName: primaryBankName || null,
            bankAccountNumber: bankAccountNumber || null,
            // Section 6
            hasCollateral: hasCollateral === true || hasCollateral === 'Yes',
            collateralType: collateralType || null,
            collateralEstimatedValue: collateralEstimatedValue || null,
            willingToProvideGuarantor: willingToProvideGuarantor === true || willingToProvideGuarantor === 'Yes',
            // Legacy fields (set defaults for backward compat)
            annualRevenue: monthlySalesRevenue ? parseFloat(monthlySalesRevenue) * 12 : 0,
            guarantorName: '',
            guarantorPhone: '',
            guarantorEmail: '',
            guarantorRelationship: '',
            // Documents
            cacDocumentUrl,
            validIdUrl,
            bankStatementUrl,
            utilityBillUrl,
            passportPhotoUrl,
            tinDocumentUrl,
            collateralDocumentUrl,
            // Declaration
            applicantDeclarationName: applicantDeclarationName || null,
            declarationDate: declarationDate || null,
            // Scoring
            ...scores,
        },
    });

    // Send admin notification email (fire-and-forget)
    sendSMEApplicationEmail(user.name, user.email, businessName, loanAmount);

    // Append to Google Sheets (fire-and-forget)
    appendApplicationToSheet(application, user.name, user.email);

    logger.info('[SME] New application submitted', {
        applicationId: application.id,
        userId,
        businessName,
        preQualScore: scores.preQualScore,
        preQualOutcome: scores.preQualOutcome,
    });

    res.status(201).json({
        success: true,
        data: application,
    });
}));

/** GET /api/sme-finance/my-applications — List user's own applications */
router.get('/my-applications', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const applications = await prisma.sMEApplication.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json({
        success: true,
        data: applications,
    });
}));

// ==================== ADMIN ENDPOINTS ====================

/** GET /api/sme-finance/applications — Admin: list all applications */
router.get('/applications', requireAdmin, [
    query('status').optional().isIn(['PENDING', 'APPROVED', 'DECLINED']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const where: any = {};
    if (status) where.status = status;

    const [applications, total] = await Promise.all([
        prisma.sMEApplication.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true, kycStatus: true, type: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        }),
        prisma.sMEApplication.count({ where }),
    ]);

    res.json({
        success: true,
        data: { applications, total, limit, offset },
    });
}));

/** PUT /api/sme-finance/applications/:id/status — Admin: update status */
router.put('/applications/:id/status', requireAdmin, [
    param('id').isUUID(),
    body('status').isIn(['PENDING', 'APPROVED', 'DECLINED']).withMessage('Status must be PENDING, APPROVED, or DECLINED'),
    body('adminNote').optional().trim(),
], validate, asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, adminNote } = req.body;

    const application = await prisma.sMEApplication.findUnique({
        where: { id },
        include: { user: { select: { name: true, email: true } } },
    });

    if (!application) throw new NotFoundError('SME Application not found');

    const updated = await prisma.sMEApplication.update({
        where: { id },
        data: {
            status,
            adminNote: adminNote || application.adminNote,
            reviewedAt: new Date(),
            reviewedBy: req.user!.id,
        },
    });

    // Notify user of status change
    sendSMEStatusUpdateEmail(application.user.email, application.user.name, application.businessName, status);

    logger.info('[SME] Application status updated', { applicationId: id, status, adminId: req.user!.id });

    res.json({
        success: true,
        data: updated,
    });
}));

/** GET /api/sme-finance/stats — Admin: SME stats */
router.get('/stats', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
    const [total, pending, approved, declined] = await Promise.all([
        prisma.sMEApplication.count(),
        prisma.sMEApplication.count({ where: { status: 'PENDING' } }),
        prisma.sMEApplication.count({ where: { status: 'APPROVED' } }),
        prisma.sMEApplication.count({ where: { status: 'DECLINED' } }),
    ]);

    res.json({
        success: true,
        data: { total, pending, approved, declined },
    });
}));

/** GET /api/sme-finance/applications/:id/documents/:docType — Download a document */
const VALID_DOC_TYPES: Record<string, string> = {
    'cac': 'cacDocumentUrl',
    'validId': 'validIdUrl',
    'bankStatement': 'bankStatementUrl',
    'utilityBill': 'utilityBillUrl',
    'passportPhoto': 'passportPhotoUrl',
    'tinDocument': 'tinDocumentUrl',
    'collateralDocument': 'collateralDocumentUrl',
};

router.get('/applications/:id/documents/:docType', asyncHandler(async (req: Request, res: Response) => {
    const { id, docType } = req.params;
    const fieldName = VALID_DOC_TYPES[docType];

    if (!fieldName) {
        return res.status(400).json({ success: false, error: `Invalid document type: ${docType}. Valid types: ${Object.keys(VALID_DOC_TYPES).join(', ')}` });
    }

    const application = await prisma.sMEApplication.findUnique({
        where: { id },
        select: { userId: true, [fieldName]: true, businessName: true },
    });

    if (!application) throw new NotFoundError('Application not found');

    // Allow admin or the application owner
    if (req.user?.role !== 'ADMIN' && req.user?.id !== application.userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const dataUrl = (application as any)[fieldName] as string | null;
    if (!dataUrl) {
        return res.status(404).json({ success: false, error: 'Document not found — no file was uploaded for this type.' });
    }

    // Parse the data URL: "data:<mimeType>;name=<fileName>;base64,<data>"
    const match = dataUrl.match(/^data:([^;]+);(?:name=([^;]+);)?base64,(.+)$/);
    if (!match) {
        return res.status(500).json({ success: false, error: 'Invalid document data format' });
    }

    const mimeType = match[1];
    const fileName = match[2] || `${application.businessName}_${docType}`;
    const base64Data = match[3];
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
}));

export default router;
