
/**
 * Nigerian Finance Act Tax Utilities
 */

export const VAT_RATE = 0.075; // 7.5%

// WHT Rates (Simplified for key services)
export const WHT_RATES = {
    'INDIVIDUAL': 0.05, // 5% for individuals/partnerships
    'CORPORATE': 0.10   // 10% for companies
};

export const calculateInvoiceTotals = (
    subTotal: number, 
    addVat: boolean, 
    applyWht: boolean, 
    entityType: 'INDIVIDUAL' | 'CORPORATE' = 'INDIVIDUAL'
) => {
    const vat = addVat ? subTotal * VAT_RATE : 0;
    
    // WHT is deducted FROM the subtotal by the payer, not added.
    // However, for the Invoice Total (what needs to be paid), usually VAT is added.
    // If the client deducts WHT, the Cash Received = (SubTotal - WHT) + VAT.
    
    const whtRate = WHT_RATES[entityType];
    const wht = applyWht ? subTotal * whtRate : 0;
    
    const totalReceivable = (subTotal + vat) - wht;

    return {
        vat,
        wht,
        totalReceivable
    };
};
