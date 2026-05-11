import React, { createContext, useState, useContext, useCallback } from 'react';

const CURRENCIES = [
    { code: 'USD', symbol: '$', locale: 'en-US', name: 'US Dollar' },
    { code: 'INR', symbol: '₹', locale: 'en-IN', name: 'Indian Rupee' },
    { code: 'EUR', symbol: '€', locale: 'de-DE', name: 'Euro' },
    { code: 'GBP', symbol: '£', locale: 'en-GB', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', locale: 'ja-JP', name: 'Japanese Yen' },
];

const CurrencyContext = createContext(null);

const getSavedCurrency = () => {
    try {
        const saved = localStorage.getItem('preferred_currency');
        if (saved) {
            const found = CURRENCIES.find((c) => c.code === saved);
            if (found) return found;
        }
    } catch {}
    return CURRENCIES[0]; // default USD
};

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrencyState] = useState(getSavedCurrency);

    const setCurrency = useCallback((code) => {
        const found = CURRENCIES.find((c) => c.code === code);
        if (found) {
            setCurrencyState(found);
            localStorage.setItem('preferred_currency', code);
        }
    }, []);

    const formatAmount = useCallback(
        (amount) => {
            const num = typeof amount === 'string' ? parseFloat(amount) : amount;
            if (isNaN(num)) return `${currency.symbol}0`;
            return new Intl.NumberFormat(currency.locale, {
                style: 'currency',
                currency: currency.code,
                minimumFractionDigits: currency.code === 'JPY' ? 0 : 2,
                maximumFractionDigits: currency.code === 'JPY' ? 0 : 2,
            }).format(num);
        },
        [currency]
    );

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, formatAmount, currencies: CURRENCIES }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

export default CurrencyContext;
