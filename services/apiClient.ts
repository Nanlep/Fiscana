/**
 * API Client for Fiscana Backend
 * Handles all HTTP requests with token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'fiscana_access_token';
const REFRESH_TOKEN_KEY = 'fiscana_refresh_token';

// Types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
    type: 'INDIVIDUAL' | 'CORPORATE';
    companyName: string | null;
    kycStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    tier: 'TIER_1' | 'TIER_2' | 'TIER_3';
    tin: string | null;
    createdAt: string;
    updatedAt: string;
}

// Token management
export const getAccessToken = (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setTokens = (tokens: AuthTokens): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
};

export const clearTokens = (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
    return !!getAccessToken();
};

// Token refresh
let refreshPromise: Promise<boolean> | null = null;

const refreshTokens = async (): Promise<boolean> => {
    // Prevent multiple simultaneous refresh calls
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            const refreshToken = getRefreshToken();
            if (!refreshToken) {
                return false;
            }

            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                clearTokens();
                return false;
            }

            const data = await response.json();
            if (data.success && data.data) {
                setTokens({
                    accessToken: data.data.accessToken,
                    refreshToken: data.data.refreshToken
                });
                return true;
            }

            clearTokens();
            return false;
        } catch {
            clearTokens();
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

// Error message mapping for user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
    'over_email_send_rate_limit': 'Too many signup attempts. Please wait a few minutes and try again.',
    'email_address_invalid': 'Please enter a valid email address.',
    'weak_password': 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and numbers.',
    'user_already_exists': 'An account with this email already exists. Try logging in instead.',
    'invalid_credentials': 'Invalid email or password.',
    'email_not_confirmed': 'Please check your email and confirm your account.',
    'network_error': 'Unable to connect to server. Please check your internet connection.',
    'timeout': 'Request timed out. Please try again.',
};

const getErrorMessage = (error: string | undefined, code?: string): string => {
    if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
    }
    if (error && ERROR_MESSAGES[error]) {
        return ERROR_MESSAGES[error];
    }
    return error || 'An unexpected error occurred. Please try again.';
};

// Main request function with timeout
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true,
    timeoutMs = 30000
): Promise<ApiResponse<T>> {
    const accessToken = getAccessToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Handle 401 - try to refresh token
        if (response.status === 401 && retry) {
            const refreshed = await refreshTokens();
            if (refreshed) {
                return apiRequest<T>(endpoint, options, false, timeoutMs);
            }
            // Token refresh failed
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return { success: false, error: 'Session expired. Please login again.' };
        }

        const data = await response.json();

        // Map error codes to friendly messages
        if (!data.success && data.error) {
            data.error = getErrorMessage(data.error, data.code);
        }

        return data;

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('API request failed:', error);

        // Handle abort/timeout
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                error: ERROR_MESSAGES['timeout']
            };
        }

        return {
            success: false,
            error: ERROR_MESSAGES['network_error']
        };
    }
}

// ==================== AUTH API ====================
export const authApi = {
    signup: async (data: {
        email: string;
        password: string;
        name: string;
        type?: 'INDIVIDUAL' | 'CORPORATE';
        companyName?: string;
    }) => {
        const response = await apiRequest<{ user: User; accessToken: string; refreshToken: string }>(
            '/auth/signup',
            { method: 'POST', body: JSON.stringify(data) }
        );
        if (response.success && response.data) {
            setTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken
            });
        }
        return response;
    },

    login: async (email: string, password: string) => {
        const response = await apiRequest<{ user: User; accessToken: string; refreshToken: string }>(
            '/auth/login',
            { method: 'POST', body: JSON.stringify({ email, password }) }
        );
        if (response.success && response.data) {
            setTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken
            });
        }
        return response;
    },

    logout: async () => {
        const refreshToken = getRefreshToken();
        await apiRequest('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken })
        });
        clearTokens();
    },

    getProfile: () => apiRequest<User>('/auth/profile'),

    updateProfile: (data: { name?: string; type?: string; companyName?: string; tin?: string }) =>
        apiRequest<User>('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),

    requestPasswordReset: (email: string) =>
        apiRequest('/auth/password-reset', { method: 'POST', body: JSON.stringify({ email }) }),

    deleteAccount: () => apiRequest('/auth/account', { method: 'DELETE' })
};

// ==================== AI API ====================
export interface TaxReport {
    estimatedIncomeTax: number;
    estimatedVAT: number;
    deductibleExpenses: number;
    taxableIncome: number;
    complianceScore: number;
    recommendations: string[];
    topPersonalExpenses: Array<{ description: string; amount: number; category: string }>;
    topBusinessExpenses: Array<{ description: string; amount: number; category: string }>;
    keyFinancialDecisions: string[];
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface BankTransactionAnalysis {
    originalDescription: string;
    cleanedPayee: string;
    category: string;
    expenseCategory: 'BUSINESS' | 'PERSONAL';
    type: 'INCOME' | 'EXPENSE';
    taxDeductible: boolean;
    tags: string[];
}

export const aiApi = {
    analyzeTax: (annualIncome: number) =>
        apiRequest<TaxReport>('/ai/tax-analysis', {
            method: 'POST',
            body: JSON.stringify({ annualIncome })
        }),

    chat: (message: string, history: ChatMessage[] = []) =>
        apiRequest<{ message: string }>('/ai/chat', {
            method: 'POST',
            body: JSON.stringify({ message, history })
        }),

    // Streaming chat - returns event source URL
    chatStream: async function* (message: string, history: ChatMessage[] = []): AsyncGenerator<string> {
        const accessToken = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ message, history })
        });

        if (!response.ok || !response.body) {
            throw new Error('Stream failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
                try {
                    const data = JSON.parse(line.slice(6));
                    if (data.done) return;
                    if (data.chunk) yield data.chunk;
                } catch {
                    // Skip malformed lines
                }
            }
        }
    },

    categorize: (descriptions: string[]) =>
        apiRequest<BankTransactionAnalysis[]>('/ai/categorize', {
            method: 'POST',
            body: JSON.stringify({ descriptions })
        }),

    getInsights: () =>
        apiRequest<{ summary: string; insights: string[]; warnings: string[] }>('/ai/insights')
};

// ==================== TRANSACTIONS API ====================
export const transactionsApi = {
    list: (params?: { type?: string; limit?: number; offset?: number }) => {
        const q = new URLSearchParams();
        if (params?.type) q.append('type', params.type);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset) q.append('offset', params.offset.toString());
        return apiRequest<{ transactions: any[]; pagination: any }>(`/transactions?${q.toString()}`);
    },

    create: (data: {
        date: string;
        description: string;
        payee: string;
        amount: number;
        currency: string;
        type: string;
        category: string;
        expenseCategory?: string;
        taxDeductible?: boolean;
        tags?: string[];
        grossAmount?: number;
        vatAmount?: number;
        whtAmount?: number;
        source?: string;
    }) =>
        apiRequest<any>('/transactions', {
            method: 'POST',
            body: JSON.stringify({ ...data, source: data.source || 'MANUAL', createdBy: 'user' })
        }),

    delete: (id: string) =>
        apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
};

// ==================== INVOICES API ====================
export const invoicesApi = {
    list: (params?: { status?: string; limit?: number }) => {
        const q = new URLSearchParams();
        if (params?.status) q.append('status', params.status);
        if (params?.limit) q.append('limit', params.limit.toString());
        return apiRequest<{ invoices: any[]; pagination: any }>(`/invoices?${q.toString()}`);
    },

    create: (data: {
        clientName: string;
        clientEmail: string;
        issueDate: string;
        dueDate: string;
        currency: string;
        items: Array<{ description: string; quantity: number; unitPrice: number }>;
        vatRate?: number;
        whtRate?: number;
        paymentMethods?: string[];
        paymentBankName?: string;
        paymentAccountNumber?: string;
        paymentAccountName?: string;
        paymentWalletAddress?: string;
        paymentWalletNetwork?: string;
    }) =>
        apiRequest<any>('/invoices', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    recordPayment: (invoiceId: string, data: { amount: number; date?: string; note?: string }) =>
        apiRequest<any>(`/invoices/${invoiceId}/payment`, {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    delete: (id: string) =>
        apiRequest(`/invoices/${id}`, { method: 'DELETE' }),
};

// ==================== ASSETS API ====================
export const assetsApi = {
    list: () => apiRequest<any[]>('/assets'),

    create: (data: { name: string; description?: string; value: number; currency: string; type: string }) =>
        apiRequest<any>('/assets', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    update: (id: string, data: { name?: string; value?: number; type?: string }) =>
        apiRequest<any>(`/assets/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    delete: (id: string) =>
        apiRequest(`/assets/${id}`, { method: 'DELETE' }),
};

// ==================== LIABILITIES API ====================
export const liabilitiesApi = {
    list: () => apiRequest<any[]>('/liabilities'),

    create: (data: { name: string; description?: string; amount: number; currency: string; type?: string; dueDate?: string }) =>
        apiRequest<any>('/liabilities', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    update: (id: string, data: { name?: string; amount?: number; type?: string }) =>
        apiRequest<any>(`/liabilities/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    delete: (id: string) =>
        apiRequest(`/liabilities/${id}`, { method: 'DELETE' }),
};

// ==================== BUDGETS API ====================
export const budgetsApi = {
    list: () => apiRequest<any[]>('/budgets'),

    create: (data: { category: string; limit: number; currency: string; type: string; period?: string }) =>
        apiRequest<any>('/budgets', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    delete: (id: string) =>
        apiRequest(`/budgets/${id}`, { method: 'DELETE' }),
};

// ==================== KYC API ====================
export const kycApi = {
    list: () => apiRequest<any[]>('/kyc'),

    submit: (data: { bvn: string; nin: string }) =>
        apiRequest<any>('/kyc', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    review: (id: string, action: 'APPROVED' | 'REJECTED') =>
        apiRequest<any>(`/kyc/${id}/review`, {
            method: 'POST',
            body: JSON.stringify({ action })
        }),
};

// ==================== ADMIN API ====================
export interface AdminUser {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMIN';
    type: 'INDIVIDUAL' | 'CORPORATE';
    status: 'ACTIVE' | 'SUSPENDED';
    companyName: string | null;
    kycStatus: string;
    tier: string;
    createdAt: string;
}

export interface PlatformStats {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    userGrowth: number;
    pendingKYC: number;
    txVolume24h: number;
    txCount24h: number;
    txGrowth: number;
    totalTransactions: number;
    totalInvoices: number;
}

export interface PlatformConfig {
    commissionRate: number;
    exchangeRate: number;
}

export interface HealthStatus {
    overall: 'OPERATIONAL' | 'DEGRADED';
    services: Record<string, { status: string; latency?: number; detail?: string }>;
    timestamp: string;
    uptime: number;
}

export const adminApi = {
    listUsers: (params?: { search?: string; status?: string; type?: string; limit?: number; offset?: number }) => {
        const q = new URLSearchParams();
        if (params?.search) q.append('search', params.search);
        if (params?.status) q.append('status', params.status);
        if (params?.type) q.append('type', params.type);
        if (params?.limit) q.append('limit', params.limit.toString());
        if (params?.offset) q.append('offset', params.offset.toString());
        return apiRequest<{ users: AdminUser[]; total: number }>(`/admin/users?${q.toString()}`);
    },

    updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
        apiRequest<AdminUser>(`/admin/users/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        }),

    deleteUser: (id: string) =>
        apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),

    getStats: () =>
        apiRequest<PlatformStats>('/admin/stats'),

    getConfig: () =>
        apiRequest<PlatformConfig>('/admin/config'),

    updateConfig: (data: { commissionRate?: number; exchangeRate?: number }) =>
        apiRequest('/admin/config', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    getHealth: () =>
        apiRequest<HealthStatus>('/admin/health'),

    cleanup: () =>
        apiRequest<{ deletedUsers: number }>('/admin/cleanup', { method: 'POST' }),
};

// ==================== PAYMENTS API ====================
export interface BankAccountDetails {
    accountName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
}

export interface PaymentCollectionResponse {
    paymentReference: string;
    accountNumber: string;
    bankName: string;
    accountName: string;
    amount: string;
    externalReference: string;
    accountType: string;
}

export const paymentsApi = {
    listBanks: () =>
        apiRequest<Array<{ code: string; name: string }>>('/payments/banks'),

    resolveAccount: (accountNumber: string, bankCode: string) =>
        apiRequest<BankAccountDetails>('/payments/resolve-account', {
            method: 'POST',
            body: JSON.stringify({ accountNumber, bankCode })
        }),

    initiatePayout: (data: {
        amount: number;
        currency: 'NGN' | 'USDC' | 'USDT';
        destination: {
            type: 'BANK' | 'MOBILE_MONEY';
            bankCode?: string;
            accountNumber?: string;
            accountName?: string;
            countryCode?: string;
            phoneNumber?: string;
        };
        narration: string;
    }) =>
        apiRequest<{ reference: string; status: string; message?: string }>('/payments/payout', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    createPaymentCollection: (data: {
        amount: number;
        currency: string;
        customerRef: string;
        accountType?: 'temporary' | 'permanent';
        countryCode?: string;
        customData?: Record<string, unknown>;
    }) =>
        apiRequest<PaymentCollectionResponse>('/payments/payment-collection', {
            method: 'POST',
            body: JSON.stringify(data)
        }),

    checkPaymentStatus: (data: { payRef?: string; payExtRef?: string }) =>
        apiRequest<{ payRef: string; payStatus: string; payAmount: string; payMethod: string }>('/payments/payment-status', {
            method: 'POST',
            body: JSON.stringify(data)
        })
};

// ==================== BANKING API ====================
export interface MonoAccount {
    id: string;
    institution: { name: string; bankCode: string; type: string };
    name: string;
    accountNumber: string;
    type: string;
    currency: string;
    balance: number;
}

export interface MonoTransaction {
    id: string;
    narration: string;
    amount: number;
    type: 'debit' | 'credit';
    balance: number;
    date: string;
}

export const bankingApi = {
    connect: (authCode: string) =>
        apiRequest<{ accountId: string; account: MonoAccount }>('/banking/connect', {
            method: 'POST',
            body: JSON.stringify({ authCode })
        }),

    getAccounts: () =>
        apiRequest<Array<{ id: string; monoAccountId: string; bankName: string; accountNumber: string }>>('/banking/accounts'),

    getAccountDetails: (accountId: string) =>
        apiRequest<MonoAccount>(`/banking/accounts/${accountId}`),

    getTransactions: (accountId: string, params?: { start?: string; end?: string; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params?.start) queryParams.append('start', params.start);
        if (params?.end) queryParams.append('end', params.end);
        if (params?.limit) queryParams.append('limit', params.limit.toString());

        return apiRequest<{ transactions: MonoTransaction[]; paging?: { total: number } }>(
            `/banking/accounts/${accountId}/transactions?${queryParams.toString()}`
        );
    },

    syncTransactions: (accountId: string) =>
        apiRequest<{
            synced: number;
            transactions: Array<{
                date: string;
                amount: number;
                description: string;
                currency: string;
                direction: 'CREDIT' | 'DEBIT';
                categorization: BankTransactionAnalysis;
            }>;
        }>(`/banking/accounts/${accountId}/sync`, { method: 'POST' }),

    unlinkAccount: (accountId: string) =>
        apiRequest(`/banking/accounts/${accountId}`, { method: 'DELETE' })
};

// Export default API object
export default {
    auth: authApi,
    ai: aiApi,
    payments: paymentsApi,
    banking: bankingApi
};
