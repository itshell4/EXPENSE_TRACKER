import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useCurrency } from '../context/CurrencyContext';
import { Save } from 'lucide-react';

const BudgetSettings = () => {
    const { formatAmount, currency } = useCurrency();
    const [budget, setBudget] = useState(null);
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [message, setMessage] = useState('');

    const fetchBudget = useCallback(async () => {
        try {
            const res = await api.get(`/budget?month=${month}&year=${year}`);
            if (res.data) {
                setBudget(res.data);
                setAmount(res.data.amount);
            } else {
                setBudget(null);
                setAmount('');
            }
        } catch (err) {
            console.error(err);
        }
    }, [month, year]);

    useEffect(() => {
        fetchBudget();
    }, [fetchBudget]);



    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/budget', { month, year, amount: parseFloat(amount) });
            setMessage('Budget saved successfully!');
            fetchBudget();
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Error saving budget');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Budget Settings</h1>

            <div className="max-w-md bg-white p-6 rounded-lg shadow-md">
                {message && (
                    <div className={`mb-4 p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Month</label>
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                            {Array.from({ length: 5 }, (_, i) => {
                                const y = new Date().getFullYear() - 2 + i;
                                return <option key={y} value={y}>{y}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Budget Amount ({currency.symbol} {currency.code})</label>
                        <div className="mt-1 relative">
                            <span className="absolute left-3 top-2.5 text-gray-500 font-semibold text-sm">{currency.symbol}</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                required
                                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        <Save className="h-5 w-5 mr-2" />
                        Save Budget
                    </button>
                </form>

                {budget && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-600">Current budget for {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}:</p>
                        <p className="text-2xl font-bold text-gray-900">{formatAmount(budget.amount)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetSettings;