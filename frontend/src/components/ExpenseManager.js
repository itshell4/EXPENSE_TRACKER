import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Plus, Trash2, Edit3, X, Check, Filter, Search, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Other'];

const ExpenseManager = () => {
    const { user } = useAuth();
    const { formatAmount, currency } = useCurrency();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
    const [message, setMessage] = useState({ text: '', type: '' });

    const fetchExpenses = useCallback(async () => {
        try {
            const params = filterCategory !== 'All' ? `?category=${filterCategory}` : '';
            const res = await api.get(`/expenses${params}`);
            setExpenses(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filterCategory]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const showMsg = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/expenses/${editingId}`, { ...form, amount: parseFloat(form.amount) });
                showMsg('Expense updated successfully!');
            } else {
                await api.post('/expenses', { ...form, amount: parseFloat(form.amount) });
                showMsg('Expense added successfully!');
            }
            setForm({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
            setShowForm(false);
            setEditingId(null);
            fetchExpenses();
        } catch (err) {
            showMsg('Error saving expense', 'error');
        }
    };

    const handleEdit = (expense) => {
        setForm({
            description: expense.description,
            amount: expense.amount.toString(),
            category: expense.category,
            date: new Date(expense.date).toISOString().split('T')[0],
        });
        setEditingId(expense._id);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            showMsg('Expense deleted');
            fetchExpenses();
        } catch (err) {
            showMsg('Error deleting expense', 'error');
        }
    };

    const cancelEdit = () => {
        setShowForm(false);
        setEditingId(null);
        setForm({ description: '', amount: '', category: 'Food', date: new Date().toISOString().split('T')[0] });
    };

    const filteredExpenses = expenses.filter((e) =>
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // ── PDF-safe amount formatter (jsPDF helvetica only supports Latin-1) ──
    const pdfAmount = (amount) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(num)) return `${currency.code} 0`;
        const decimals = currency.code === 'JPY' ? 0 : 2;
        const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        // $ and GBP pound sign are Latin-1 safe; others use code prefix
        const safeSymbols = { USD: '$', GBP: '\u00A3' };
        const prefix = safeSymbols[currency.code] || currency.code + ' ';
        return `${prefix}${formatted}`;
    };

    // ── PDF Export ────────────────────────────────────────────────
    const exportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // ── Header gradient bar ──
        doc.setFillColor(99, 102, 241); // indigo-500
        doc.rect(0, 0, pageWidth, 36, 'F');
        doc.setFillColor(124, 58, 237); // purple-600
        doc.rect(0, 28, pageWidth, 8, 'F');

        // Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text('Expense Report', 14, 20);

        // Subtitle (avoid unicode bullets - use dash instead)
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(224, 231, 255); // indigo-100
        const subtitle = `${user?.name || 'User'}  |  ${currency.code}  |  Generated ${new Date().toLocaleDateString()}`;
        doc.text(subtitle, 14, 28);

        // ── Summary Cards ──
        const yStart = 46;
        const cardWidth = (pageWidth - 42) / 3;
        const summaryCards = [
            { label: 'Total Expenses', value: pdfAmount(totalFiltered) },
            { label: 'Transactions', value: `${filteredExpenses.length}` },
            { label: 'Currency', value: currency.code },
        ];

        summaryCards.forEach((card, i) => {
            const x = 14 + i * (cardWidth + 7);
            // Card background
            doc.setFillColor(248, 250, 252); // gray-50
            doc.setDrawColor(226, 232, 240); // gray-300
            doc.roundedRect(x, yStart, cardWidth, 24, 3, 3, 'FD');
            // Label
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // gray-400
            doc.setFont('helvetica', 'normal');
            doc.text(card.label, x + 5, yStart + 9);
            // Value
            doc.setFontSize(13);
            doc.setTextColor(30, 41, 59); // gray-800
            doc.setFont('helvetica', 'bold');
            doc.text(String(card.value), x + 5, yStart + 19);
        });

        // ── Filter info ──
        const filterInfo = [];
        if (filterCategory !== 'All') filterInfo.push(`Category: ${filterCategory}`);
        if (searchTerm) filterInfo.push(`Search: "${searchTerm}"`);
        if (filterInfo.length > 0) {
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.setFont('helvetica', 'italic');
            doc.text(`Filters applied: ${filterInfo.join(' | ')}`, 14, yStart + 32);
        }

        // ── Table ──
        const tableStartY = filterInfo.length > 0 ? yStart + 38 : yStart + 32;
        const tableData = filteredExpenses.map((e, idx) => [
            String(idx + 1),
            new Date(e.date).toLocaleDateString(),
            e.description,
            e.category,
            pdfAmount(e.amount),
        ]);

        autoTable(doc, {
            startY: tableStartY,
            head: [['#', 'Date', 'Description', 'Category', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [99, 102, 241],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'left',
            },
            bodyStyles: {
                fontSize: 8.5,
                textColor: [51, 65, 85],
                lineColor: [226, 232, 240],
                lineWidth: 0.3,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { cellWidth: 28 },
                4: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
                // Footer on each page
                const pageCount = doc.internal.getNumberOfPages();
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.setFont('helvetica', 'normal');
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
                doc.text(
                    'ExpenseTracker Report',
                    14,
                    pageHeight - 10
                );
            },
        });

        // ── Total row after table ──
        const finalY = (doc.lastAutoTable?.finalY ?? tableStartY + 20) + 6;
        const totalText = `Total: ${pdfAmount(totalFiltered)}`;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const totalTextWidth = doc.getTextWidth(totalText) + 12;
        doc.setFillColor(99, 102, 241);
        doc.roundedRect(pageWidth - 14 - totalTextWidth, finalY, totalTextWidth, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(totalText, pageWidth - 14 - totalTextWidth + 6, finalY + 9);

        // Save
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`expense-report-${dateStr}.pdf`);
        showMsg('PDF exported successfully!');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
                    <p className="text-gray-500 mt-1">Manage and track all your expenses</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        id="export-pdf-btn"
                        onClick={exportPDF}
                        disabled={filteredExpenses.length === 0}
                        className="btn-secondary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <FileDown className="w-5 h-5" /> Export PDF
                    </button>
                    <button onClick={() => { cancelEdit(); setShowForm(true); }} className="btn-primary !w-auto flex items-center gap-2">
                        <Plus className="w-5 h-5" /> Add Expense
                    </button>
                </div>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2 animate-slide-up ${message.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-emerald-50 border border-emerald-200 text-emerald-600'}`}>
                    <div className={`w-2 h-2 rounded-full ${message.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                    {message.text}
                </div>
            )}

            {/* Add/Edit Form */}
            {showForm && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">{editingId ? 'Edit Expense' : 'New Expense'}</h3>
                        <button onClick={cancelEdit} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input type="text" required className="input-field" placeholder="e.g. Grocery shopping" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency.symbol})</label>
                            <input type="number" step="0.01" min="0" required className="input-field" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input type="date" required className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-5 flex gap-3">
                            <button type="submit" className="btn-primary !w-auto flex items-center gap-2">
                                <Check className="w-4 h-4" /> {editingId ? 'Update' : 'Add'} Expense
                            </button>
                            <button type="button" onClick={cancelEdit} className="btn-secondary">Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" className="input-field pl-10" placeholder="Search expenses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select className="input-field !w-auto" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="All">All Categories</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4 px-2">
                <p className="text-sm text-gray-500">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
                <p className="text-sm font-semibold text-gray-700">Total: <span className="text-indigo-600">{formatAmount(totalFiltered)}</span></p>
            </div>

            {/* Expense List */}
            <div className="space-y-3">
                {filteredExpenses.length > 0 ? filteredExpenses.map((expense) => (
                    <div key={expense._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">{
                                    { Food: '🍔', Transport: '🚗', Entertainment: '🎬', Shopping: '🛍️', Bills: '📄', Health: '💊', Education: '📚', Other: '📌' }[expense.category] || '📌'
                                }</span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{expense.description}</p>
                                <p className="text-xs text-gray-500">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                            <span className="text-sm font-bold text-gray-900">{formatAmount(expense.amount)}</span>
                            <button onClick={() => handleEdit(expense)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(expense._id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-12 text-gray-400">
                        <Plus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No expenses found</p>
                        <p className="text-sm mt-1">Click "Add Expense" to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseManager;
