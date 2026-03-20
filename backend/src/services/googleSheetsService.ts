import { google } from 'googleapis';
import { logger } from '../utils/logger.js';

// Google Sheets configuration from environment variables
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
const BACKEND_PUBLIC_URL = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}/api`;

const SHEET_NAME = 'SME Applications';

// Header row for the spreadsheet
const HEADERS = [
    'Submission Date',
    'Application ID',
    // Section 1: Business Information
    'Business Name', 'RC Number', 'Registered with CAC', 'Business Type',
    'Industry/Sector', 'Business Address', 'State', 'Year Established',
    'Number of Employees', 'Contact Person Name', 'Phone Number', 'Email Address',
    // Section 2: Owner/Director Details
    'Owner Full Name', 'Date of Birth', 'Gender', 'BVN', 'National ID/Passport No',
    'Residential Address', 'Percentage Ownership', 'Owner Phone', 'Owner Email',
    // Section 3: Business Operations
    'Business Activities', 'Products/Services', 'Major Customers',
    'Existing Contracts', 'Monthly Sales Revenue', 'Monthly Expenses', 'Monthly Profit Estimate',
    // Section 4: Loan Request Details
    'Loan Amount Requested', 'Purpose of Loan', 'Loan Tenor (Months)',
    'Expected Monthly Repayment', 'Previous Loan', 'Previous Loan Source', 'Previous Loan Status',
    // Section 5: Financial Records
    'Keeps Financial Records', 'Bank Statements (6-12 months)', 'Financial Statements',
    'Has TIN', 'Primary Bank Name', 'Account Number',
    // Section 6: Collateral/Guarantee
    'Has Collateral', 'Collateral Type', 'Estimated Value', 'Willing to Provide Guarantor',
    // Section 7: Documents Uploaded
    'CAC Doc', 'Valid ID', 'Bank Statement', 'Utility Bill',
    'Passport Photo', 'TIN Document', 'Collateral Document',
    // Declaration
    'Applicant Declaration Name', 'Declaration Date',
    // Scoring
    'Pre-Qualification Score (out of 9)', 'Revenue Strength', 'Repayment Capacity',
    'Credit History', 'Documentation Level', 'Pre-Qualification Outcome',
    // User Info
    'User Name', 'User Email',
    // Status
    'Status',
];

let sheetsClient: any = null;

async function getClient() {
    if (sheetsClient) return sheetsClient;

    if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY || !SPREADSHEET_ID) {
        logger.warn('[GoogleSheets] Missing credentials — skipping Sheets integration');
        return null;
    }

    try {
        const auth = new google.auth.JWT({
            email: SERVICE_ACCOUNT_EMAIL,
            key: PRIVATE_KEY,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        sheetsClient = google.sheets({ version: 'v4', auth });
        return sheetsClient;
    } catch (err) {
        logger.error('[GoogleSheets] Failed to initialize client:', err);
        return null;
    }
}

async function ensureHeaders(sheets: any) {
    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1:BZ1`,
        });

        if (!res.data.values || res.data.values.length === 0) {
            // Sheet is empty — add headers
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: [HEADERS] },
            });
            logger.info('[GoogleSheets] Header row created');
        }
    } catch (err: any) {
        // If the sheet doesn't exist, try creating it
        if (err?.code === 400 || err?.message?.includes('Unable to parse range')) {
            try {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: SPREADSHEET_ID,
                    requestBody: {
                        requests: [{
                            addSheet: { properties: { title: SHEET_NAME } }
                        }]
                    }
                });
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${SHEET_NAME}!A1`,
                    valueInputOption: 'RAW',
                    requestBody: { values: [HEADERS] },
                });
                logger.info('[GoogleSheets] Sheet created with headers');
            } catch (createErr) {
                logger.error('[GoogleSheets] Failed to create sheet:', createErr);
            }
        } else {
            logger.error('[GoogleSheets] Failed to check headers:', err);
        }
    }
}

export async function appendApplicationToSheet(application: any, userName?: string, userEmail?: string): Promise<void> {
    try {
        const sheets = await getClient();
        if (!sheets) return;

        await ensureHeaders(sheets);

        const boolStr = (val: any) => val ? 'Yes' : 'No';
        const docLink = (docType: string, url: string | null | undefined) =>
            url ? `${BACKEND_PUBLIC_URL}/sme-finance/applications/${application.id}/documents/${docType}` : 'Not Uploaded';

        const row = [
            new Date(application.createdAt).toLocaleString(),
            application.id,
            // Section 1
            application.businessName || '',
            application.rcNumber || '',
            boolStr(application.registeredWithCAC),
            application.businessType || '',
            application.industrySector || '',
            application.businessAddress || '',
            application.state || '',
            application.yearEstablished || '',
            application.numberOfEmployees || '',
            application.contactPersonName || '',
            application.contactPhone || '',
            application.contactEmail || '',
            // Section 2
            application.ownerFullName || '',
            application.ownerDOB || '',
            application.ownerGender || '',
            application.ownerBVN || '',
            application.ownerNationalId || '',
            application.ownerResidentialAddress || '',
            application.ownerPercentageOwnership || '',
            application.ownerPhone || '',
            application.ownerEmail || '',
            // Section 3
            application.businessActivities || '',
            application.productsServices || '',
            application.majorCustomers || '',
            boolStr(application.hasExistingContracts),
            application.monthlySalesRevenue ?? '',
            application.monthlyExpenses ?? '',
            application.monthlyProfitEstimate ?? '',
            // Section 4
            application.loanAmount ?? '',
            application.loanPurpose || '',
            application.loanTenorMonths ?? '',
            application.expectedMonthlyRepayment ?? '',
            boolStr(application.hasPreviousLoan),
            application.previousLoanSource || '',
            application.previousLoanStatus || '',
            // Section 5
            boolStr(application.keepsFinancialRecords),
            boolStr(application.hasBankStatements),
            boolStr(application.hasFinancialStatements),
            boolStr(application.hasTIN),
            application.primaryBankName || '',
            application.bankAccountNumber || '',
            // Section 6
            boolStr(application.hasCollateral),
            application.collateralType || '',
            application.collateralEstimatedValue || '',
            boolStr(application.willingToProvideGuarantor),
            // Section 7 docs — clickable download URLs
            docLink('cac', application.cacDocumentUrl),
            docLink('validId', application.validIdUrl),
            docLink('bankStatement', application.bankStatementUrl),
            docLink('utilityBill', application.utilityBillUrl),
            docLink('passportPhoto', application.passportPhotoUrl),
            docLink('tinDocument', application.tinDocumentUrl),
            docLink('collateralDocument', application.collateralDocumentUrl),
            // Declaration
            application.applicantDeclarationName || '',
            application.declarationDate || '',
            // Scoring
            application.preQualScore ?? '',
            application.revenueStrength || '',
            application.repaymentCapacity || '',
            application.creditHistory || '',
            application.documentationLevel || '',
            application.preQualOutcome || '',
            // User info
            userName || '',
            userEmail || '',
            // Status
            application.status || 'PENDING',
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:BZ`,
            valueInputOption: 'RAW',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: [row] },
        });

        logger.info('[GoogleSheets] Application row appended', { applicationId: application.id });
    } catch (err) {
        logger.error('[GoogleSheets] Failed to append application:', err);
        // Don't throw — this is fire-and-forget
    }
}
