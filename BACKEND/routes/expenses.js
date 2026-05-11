const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

router.use(auth);

// GET /api/expenses — list all expenses
router.get('/', (req, res) => {
    try {
        const { category, startDate, endDate } = req.query;

        let sql = 'SELECT * FROM expenses WHERE user_id = ?';
        const params = [req.user.id];

        if (category && category !== 'All') {
            sql += ' AND category = ?';
            params.push(category);
        }
        if (startDate) {
            sql += ' AND date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            sql += ' AND date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY date DESC';

        const expenses = db.prepare(sql).all(...params);

        // Map id to _id for frontend compatibility
        const mapped = expenses.map(e => ({ ...e, _id: e.id }));
        res.json(mapped);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ message: 'Server error fetching expenses' });
    }
});

// GET /api/expenses/summary — dashboard data
router.get('/summary', (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Total expenses this month
        const monthly = db.prepare(
            'SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ?'
        ).get(req.user.id, startOfMonth, endOfMonth);

        // By category this month
        const byCategory = db.prepare(
            'SELECT category as _id, SUM(amount) as total, COUNT(*) as count FROM expenses WHERE user_id = ? AND date >= ? AND date <= ? GROUP BY category ORDER BY total DESC'
        ).all(req.user.id, startOfMonth, endOfMonth);

        // Monthly trend (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
        const rawTrend = db.prepare(`
            SELECT 
                CAST(strftime('%Y', date) AS INTEGER) as year,
                CAST(strftime('%m', date) AS INTEGER) as month,
                SUM(amount) as total
            FROM expenses 
            WHERE user_id = ? AND date >= ?
            GROUP BY year, month
            ORDER BY year, month
        `).all(req.user.id, sixMonthsAgo);

        const monthlyTrend = rawTrend.map(r => ({
            _id: { year: r.year, month: r.month },
            total: r.total,
        }));

        // Recent transactions
        const recent = db.prepare(
            'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC LIMIT 5'
        ).all(req.user.id);
        const recentTransactions = recent.map(e => ({ ...e, _id: e.id }));

        res.json({
            totalExpenses: monthly.total,
            transactionCount: monthly.count,
            byCategory,
            monthlyTrend,
            recentTransactions,
        });
    } catch (error) {
        console.error('Summary error:', error);
        res.status(500).json({ message: 'Server error fetching summary' });
    }
});

// POST /api/expenses — create
router.post('/', (req, res) => {
    try {
        const { description, amount, category, date } = req.body;
        const expenseDate = date || new Date().toISOString();

        const result = db.prepare(
            'INSERT INTO expenses (user_id, description, amount, category, date) VALUES (?, ?, ?, ?, ?)'
        ).run(req.user.id, description, amount, category || 'Other', expenseDate);

        const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ ...expense, _id: expense.id });
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ message: 'Server error creating expense' });
    }
});

// PUT /api/expenses/:id — update
router.put('/:id', (req, res) => {
    try {
        const { description, amount, category, date } = req.body;

        const existing = db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
        if (!existing) return res.status(404).json({ message: 'Expense not found' });

        db.prepare(
            'UPDATE expenses SET description = ?, amount = ?, category = ?, date = ? WHERE id = ? AND user_id = ?'
        ).run(
            description || existing.description,
            amount || existing.amount,
            category || existing.category,
            date || existing.date,
            req.params.id,
            req.user.id
        );

        const updated = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
        res.json({ ...updated, _id: updated.id });
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ message: 'Server error updating expense' });
    }
});

// DELETE /api/expenses/:id
router.delete('/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
        if (result.changes === 0) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ message: 'Server error deleting expense' });
    }
});

module.exports = router;
