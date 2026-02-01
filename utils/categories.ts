
import { TaxTag } from '../types';

export interface CategoryDef {
    name: string;
    type: 'INCOME' | 'EXPENSE';
    subType?: 'BUSINESS' | 'PERSONAL';
    taxTag: TaxTag;
    group: string;
}

export const INCOME_CATEGORIES: CategoryDef[] = [
    { name: 'Service Revenue', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Professional Income' },
    { name: 'Consulting Fees', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Professional Income' },
    { name: 'Salary / Wages', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Professional Income' },
    { name: 'Product Sales', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Sales & Products' },
    { name: 'Digital Products', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Sales & Products' },
    { name: 'Affiliate Income', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Sales & Products' },
    { name: 'Crypto Gains', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Investments' }, // Capital Gains Tax
    { name: 'Dividends', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Investments' },
    { name: 'Rental Income', type: 'INCOME', taxTag: 'TAXABLE_INCOME', group: 'Investments' },
    { name: 'Gift / Grant', type: 'INCOME', taxTag: 'VAT_EXEMPT', group: 'Other' },
];

export const EXPENSE_CATEGORIES: CategoryDef[] = [
    // Business - Operational (Allowable)
    { name: 'Rent (Office)', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Utilities (Internet/Power)', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Office Supplies', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Co-working Space', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Software & SaaS', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Licenses', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    { name: 'Shipping & Logistics', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Operational' },
    
    // Business - Professional
    { name: 'Marketing & Ads', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Legal Fees', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Accounting', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Consulting', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Training & Education', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Bank Fees', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Travel', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Hotels', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Contractors', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Salaries', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    { name: 'Repairs & Maintenance', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'ALLOWABLE_EXPENSE', group: 'Professional' },
    
    // Business - Capital (Capital Allowances)
    { name: 'Equipment & Hardware', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'CAPITAL_EXPENSE', group: 'Capital Assets' },
    { name: 'Furniture', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'CAPITAL_EXPENSE', group: 'Capital Assets' },
    { name: 'Depreciation', type: 'EXPENSE', subType: 'BUSINESS', taxTag: 'CAPITAL_EXPENSE', group: 'Capital Assets' },

    // Personal (Non-Deductible)
    { name: 'Groceries', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Personal Living' },
    { name: 'Rent / Mortgage', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Personal Living' },
    { name: 'Utilities', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Personal Living' },
    { name: 'Healthcare', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Personal Living' },
    { name: 'Transportation', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Personal Living' },
    { name: 'Entertainment', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Dining Out', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Shopping', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Personal Care', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Travel / Vacation', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Owner Drawings', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
    { name: 'Transfer / Withdrawal', type: 'EXPENSE', subType: 'PERSONAL', taxTag: 'NON_DEDUCTIBLE', group: 'Discretionary' },
];

export const getCategoryDef = (name: string): CategoryDef | undefined => {
    return [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find(c => c.name === name);
};

export const getTaxTagForCategory = (name: string): TaxTag => {
    const def = getCategoryDef(name);
    return def ? def.taxTag : 'NON_DEDUCTIBLE';
};
