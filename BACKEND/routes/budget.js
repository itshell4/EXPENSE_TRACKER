const express = require('express');
const auth = require('../middleware/auth');
const db = require('../database');

const router = express.Router();

router.use(auth);

// GET /api/budget — get budget for a specific month/year
router.get('/', (req, res) => {
    try {
        const { month, year } = req.query;

        const budget = db.prepare(
            'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?'
        ).get(req.user.id, parseInt(month), parseInt(year));

        if (budget) {
            res.json({ ...budget, _id: budget.id });
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error('Get budget error:', error);
        res.status(500).json({ message: 'Server error fetching budget' });
    }
});

// POST /api/budget — create or update budget
router.post('/', (req, res) => {
    try {
        const { month, year, amount } = req.body;

        // Upsert: try update, then insert if not exists
        const existing = db.prepare(
            'SELECT id FROM budgets WHERE user_id = ? AND month = ? AND year = ?'
        ).get(req.user.id, month, year);

        if (existing) {
            db.prepare('UPDATE budgets SET amount = ? WHERE id = ?').run(amount, existing.id);
        } else {
            db.prepare(
                'INSERT INTO budgets (user_id, month, year, amount) VALUES (?, ?, ?, ?)'
            ).run(req.user.id, month, year, amount);
        }

        const budget = db.prepare(
            'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?'
        ).get(req.user.id, month, year);

        res.json({ ...budget, _id: budget.id });
    } catch (error) {
        console.error('Set budget error:', error);
        res.status(500).json({ message: 'Server error saving budget' });
    }
});

module.exports = router;
