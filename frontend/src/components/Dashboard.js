import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import api from '../utils/api';
import { DollarSign, TrendingUp, Receipt, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#7c3aed', '#5b21b6'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dashboard = () => {
    const { user } = useAuth();
    const { formatAmount, currency } = useCurrency();
    const [summary, setSummary] = useState(null);
    const [budget, setBudget] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const now = new Date();
                const [summaryRes, budgetRes] = await Promise.all([
                    api.get('/expenses/summary'),
                    api.get(`/budget?month=${now.getMonth() + 1}&year=${now.getFullYear()}`),
                ]);
                setSummary(summaryRes.data);
                setBudget(budgetRes.data);
            } catch (err) {
                console.error('Dashboard fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const budgetAmount = budget?.amount || 0;
    const totalExpenses = summary?.totalExpenses || 0;
    const budgetRemaining = budgetAmount - totalExpenses;
    const budgetPct = budgetAmount > 0 ? Math.min((totalExpenses / budgetAmount) * 100, 100) : 0;

    const categoryData = summary?.byCategory?.map((c) => ({ name: c._id, value: c.total })) || [];
    const trendData = summary?.monthlyTrend?.map((i) => ({ name: MONTH_NAMES[i._id.month - 1], amount: i.total })) || [];

    const cards = [
        { title: 'Total Expenses', value: formatAmount(totalExpenses), icon: DollarSign, sub: 'This month', bg: 'bg-red-50', tc: 'text-red-600' },
        { title: 'Budget', value: budgetAmount > 0 ? formatAmount(budgetAmount) : 'Not set', icon: Target, sub: 'Monthly limit', bg: 'bg-indigo-50', tc: 'text-indigo-600' },
        { title: 'Remaining', value: budgetAmount > 0 ? formatAmount(budgetRemaining) : '—', icon: budgetRemaining >= 0 ? TrendingUp : ArrowDownRight, sub: budgetRemaining >= 0 ? 'Under budget' : 'Over budget', bg: budgetRemaining >= 0 ? 'bg-emerald-50' : 'bg-red-50', tc: budgetRemaining >= 0 ? 'text-emerald-600' : 'text-red-600' },
        { title: 'Transactions', value: summary?.transactionCount || 0, icon: Receipt, sub: 'This month', bg: 'bg-amber-50', tc: 'text-amber-600' },
    ];

    const CTooltip = ({ active, payload, label }) => {
        if (active && payload?.length) {
            return (<div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100"><p className="text-sm font-medium text-gray-900">{label || payload[0].name}</p><p className="text-sm text-indigo-600 font-semibold">{formatAmount(payload[0].value)}</p></div>);
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8 animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900">Welcome back, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{user?.name}</span></h1>
                <p className="text-gray-500 mt-1">Financial overview for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {cards.map((c, i) => (
                    <div key={c.title} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${c.bg} rounded-xl flex items-center justify-center`}><c.icon className={`w-6 h-6 ${c.tc}`} /></div>
                            <span className={`text-xs font-medium ${c.tc} ${c.bg} px-2 py-1 rounded-full`}>{c.sub}</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">{c.title}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
                    </div>
                ))}
            </div>

            {budgetAmount > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700">Budget Usage</h3>
                        <span className={`text-sm font-bold ${budgetPct > 80 ? 'text-red-600' : budgetPct > 50 ? 'text-amber-600' : 'text-emerald-600'}`}>{budgetPct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${budgetPct > 80 ? 'bg-gradient-to-r from-red-500 to-rose-500' : budgetPct > 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${budgetPct}%` }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{formatAmount(totalExpenses)} of {formatAmount(budgetAmount)} spent</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Spending by Category</h3>
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="value">{categoryData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}</Pie><Tooltip content={<CTooltip />} /><Legend verticalAlign="bottom" iconType="circle" iconSize={8} /></PieChart>
                        </ResponsiveContainer>
                    ) : (<div className="h-[300px] flex items-center justify-center text-gray-400"><p>No expenses recorded this month</p></div>)}
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Monthly Trend</h3>
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={trendData}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} /><YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(v) => `${currency.symbol}${v}`} /><Tooltip content={<CTooltip />} /><Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} /></BarChart>
                        </ResponsiveContainer>
                    ) : (<div className="h-[300px] flex items-center justify-center text-gray-400"><p>No trend data yet</p></div>)}
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                    <a href="/expenses" className="text-sm text-indigo-600 font-medium hover:text-indigo-500 flex items-center gap-1">View all <ArrowUpRight className="w-4 h-4" /></a>
                </div>
                {summary?.recentTransactions?.length > 0 ? (
                    <div className="space-y-3">
                        {summary.recentTransactions.map((tx) => (
                            <div key={tx._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center"><Receipt className="w-5 h-5 text-indigo-600" /></div>
                                    <div><p className="text-sm font-semibold text-gray-900">{tx.description}</p><p className="text-xs text-gray-500">{tx.category} • {new Date(tx.date).toLocaleDateString()}</p></div>
                                </div>
                                <span className="text-sm font-bold text-red-600">-{formatAmount(tx.amount)}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400"><Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>No transactions yet. Start by adding an expense!</p></div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
