
export interface Bank {
    name: string;
    code: string;
}

export const NIGERIAN_BANKS: Bank[] = [
    // Tier 1 & Commercial Banks
    { name: "Access Bank", code: "044" },
    { name: "Access Bank (Diamond)", code: "063" },
    { name: "Guaranty Trust Bank (GTB)", code: "058" },
    { name: "Zenith Bank", code: "057" },
    { name: "United Bank for Africa (UBA)", code: "033" },
    { name: "First Bank of Nigeria", code: "011" },
    { name: "Fidelity Bank", code: "070" },
    { name: "First City Monument Bank (FCMB)", code: "214" },
    { name: "Stanbic IBTC Bank", code: "221" },
    { name: "Sterling Bank", code: "232" },
    { name: "Union Bank of Nigeria", code: "032" },
    { name: "Wema Bank", code: "035" },
    { name: "Ecobank Nigeria", code: "050" },
    { name: "Heritage Bank", code: "030" },
    { name: "Keystone Bank", code: "082" },
    { name: "Polaris Bank", code: "076" },
    { name: "Unity Bank", code: "215" },
    { name: "Jaiz Bank", code: "301" },
    { name: "SunTrust Bank", code: "100" },
    { name: "Providus Bank", code: "101" },
    { name: "Titan Trust Bank", code: "102" },
    { name: "Globus Bank", code: "103" },
    { name: "Premium Trust Bank", code: "105" },
    { name: "Standard Chartered Bank", code: "068" },
    { name: "Citibank Nigeria", code: "023" },

    // Neo-Banks / Microfinance / Mobile Money
    { name: "Kuda Microfinance Bank", code: "50211" },
    { name: "OPay (Paycom)", code: "999992" },
    { name: "Moniepoint MFB", code: "50373" },
    { name: "PalmPay", code: "999991" },
    { name: "VFD Microfinance Bank", code: "566" },
    { name: "Rubies MFB", code: "125" },
    { name: "Sparkle Microfinance Bank", code: "51310" },
    { name: "Carbon", code: "100026" },
    { name: "Fairmoney Microfinance Bank", code: "51318" },
    { name: "Paga", code: "100002" },
    { name: "Pocket App (Abeg)", code: "100060" },
    { name: "GoMoney (Sterling)", code: "100022" },
    { name: "Alat by Wema", code: "035" }, // Same as Wema
    { name: "Taj Bank", code: "302" },
    { name: "Lotus Bank", code: "303" },
    { name: "Parallex Bank", code: "526" },
    
    // Other MFBs
    { name: "Accion Microfinance Bank", code: "090134" },
    { name: "Addosser Microfinance Bank", code: "090160" },
    { name: "Baobab Microfinance Bank", code: "090136" },
    { name: "Bowen Microfinance Bank", code: "090148" },
    { name: "CEMCS Microfinance Bank", code: "090154" },
    { name: "Gomoney", code: "100022" },
    { name: "Hasal Microfinance Bank", code: "090121" },
    { name: "Infinity MFB", code: "090123" },
    { name: "Lagos Building Investment Company", code: "090124" },
    { name: "Links MFB", code: "090125" },
    { name: "Mayfair MFB", code: "090126" },
    { name: "Mint Finex MFB", code: "090127" },
    { name: "PecanTrust Microfinance Bank", code: "090137" },
    { name: "Personal Trust MFB", code: "090138" },
    { name: "Petra Mircofinance Bank", code: "090139" },
    { name: "RenMoney MFB", code: "090198" },
    { name: "Safe Haven MFB", code: "090286" },
    { name: "Shield MFB", code: "090290" },
    { name: "Solid Rock MFB", code: "090291" },
    { name: "Tangerine Money", code: "090404" },
    { name: "TCF MFB", code: "090405" },
    { name: "Unical MFB", code: "090409" }
].sort((a, b) => a.name.localeCompare(b.name));
