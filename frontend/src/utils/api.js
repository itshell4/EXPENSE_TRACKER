/**
 * Demo-only mock API layer.
 * All data is stored in localStorage — no backend server required.
 * This simulates the same response shapes the components expect.
 */

// ── helpers ──────────────────────────────────────────────────────────
const LS = {
    get: (key, fallback = null) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
};

let nextExpenseId = LS.get('demo_nextExpenseId', 100);
let nextBudgetId = LS.get('demo_nextBudgetId', 100);

const persistIds = () => {
    LS.set('demo_nextExpenseId', nextExpenseId);
    LS.set('demo_nextBudgetId', nextBudgetId);
};

const getCurrentUserId = () => {
    const user = LS.get('user');
    return user?.id ?? 1;
};

const getExpenses = () => LS.get('demo_expenses', []);
const setExpenses = (list) => LS.set('demo_expenses', list);
const getBudgets = () => LS.get('demo_budgets', []);
const setBudgets = (list) => LS.set('demo_budgets', list);

// ── mock route handlers ─────────────────────────────────────────────
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

const ROUTES = {
    // ── AUTH ──
    'POST /auth/login': async (_url, body) => {
        const users = LS.get('demo_users', []);
        const user = users.find((u) => u.email === body.email?.toLowerCase());
        if (!user || user.password !== body.password) {
            throw { response: { status: 400, data: { message: 'Invalid email or password' } } };
        }
        const token = 'demo-token-' + Date.now();
        return {
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email },
            },
        };
    },

    'POST /auth/register': async (_url, body) => {
        const users = LS.get('demo_users', []);
        if (users.find((u) => u.email === body.email?.toLowerCase())) {
            throw { response: { status: 400, data: { message: 'User already exists with this email' } } };
        }
        const newUser = {
            id: users.length + 1,
            name: body.name,
            email: body.email.toLowerCase(),
            password: body.password,
        };
        users.push(newUser);
        LS.set('demo_users', users);
        const token = 'demo-token-' + Date.now();
        return {
            data: {
                token,
                user: { id: newUser.id, name: newUser.name, email: newUser.email },
            },
        };
    },

    // ── EXPENSES ──
    'GET /expenses': async (url) => {
        const userId = getCurrentUserId();
        let list = getExpenses().filter((e) => e.user_id === userId);

        // Parse query params from url
        const params = new URLSearchParams(url.split('?')[1] || '');
        const category = params.get('category');
        if (category && category !== 'All') {
            list = list.filter((e) => e.category === category);
        }

        list.sort((a, b) => new Date(b.date) - new Date(a.date));
        return { data: list.map((e) => ({ ...e, _id: e.id })) };
    },

    'GET /expenses/summary': async () => {
        const userId = getCurrentUserId();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const all = getExpenses().filter((e) => e.user_id === userId);
        const monthly = all.filter((e) => {
            const d = new Date(e.date);
            return d >= startOfMonth && d <= endOfMonth;
        });

        const totalExpenses = monthly.reduce((s, e) => s + e.amount, 0);
        const transactionCount = monthly.length;

        // by category
        const catMap = {};
        monthly.forEach((e) => {
            catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });
        const byCategory = Object.entries(catMap).map(([_id, total]) => ({ _id, total, count: monthly.filter((e) => e.category === _id).length }));
        byCategory.sort((a, b) => b.total - a.total);

        // monthly trend (last 6 months)
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const trendItems = all.filter((e) => new Date(e.date) >= sixMonthsAgo);
        const trendMap = {};
        trendItems.forEach((e) => {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            trendMap[key] = (trendMap[key] || 0) + e.amount;
        });
        const monthlyTrend = Object.entries(trendMap)
            .map(([key, total]) => {
                const [year, month] = key.split('-').map(Number);
                return { _id: { year, month }, total };
            })
            .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);

        // recent 5
        const sorted = [...monthly].sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentTransactions = sorted.slice(0, 5).map((e) => ({ ...e, _id: e.id }));

        return { data: { totalExpenses, transactionCount, byCategory, monthlyTrend, recentTransactions } };
    },

    'POST /expenses': async (_url, body) => {
        const userId = getCurrentUserId();
        const expense = {
            id: nextExpenseId++,
            user_id: userId,
            description: body.description,
            amount: body.amount,
            category: body.category || 'Other',
            date: body.date || new Date().toISOString(),
            created_at: new Date().toISOString(),
        };
        persistIds();
        const list = getExpenses();
        list.push(expense);
        setExpenses(list);
        return { status: 201, data: { ...expense, _id: expense.id } };
    },

    'PUT /expenses/:id': async (url, body) => {
        const id = parseInt(url.split('/').pop());
        const userId = getCurrentUserId();
        const list = getExpenses();
        const idx = list.findIndex((e) => e.id === id && e.user_id === userId);
        if (idx === -1) throw { response: { status: 404, data: { message: 'Expense not found' } } };

        list[idx] = {
            ...list[idx],
            description: body.description ?? list[idx].description,
            amount: body.amount ?? list[idx].amount,
            category: body.category ?? list[idx].category,
            date: body.date ?? list[idx].date,
        };
        setExpenses(list);
        return { data: { ...list[idx], _id: list[idx].id } };
    },

    'DELETE /expenses/:id': async (url) => {
        const id = parseInt(url.split('/').pop());
        const userId = getCurrentUserId();
        const list = getExpenses();
        const filtered = list.filter((e) => !(e.id === id && e.user_id === userId));
        if (filtered.length === list.length) throw { response: { status: 404, data: { message: 'Expense not found' } } };
        setExpenses(filtered);
        return { data: { message: 'Expense deleted' } };
    },

    // ── BUDGET ──
    'GET /budget': async (url) => {
        const userId = getCurrentUserId();
        const params = new URLSearchParams(url.split('?')[1] || '');
        const month = parseInt(params.get('month'));
        const year = parseInt(params.get('year'));
        const budgets = getBudgets();
        const found = budgets.find((b) => b.user_id === userId && b.month === month && b.year === year);
        return { data: found ? { ...found, _id: found.id } : null };
    },

    'POST /budget': async (_url, body) => {
        const userId = getCurrentUserId();
        const budgets = getBudgets();
        const idx = budgets.findIndex((b) => b.user_id === userId && b.month === body.month && b.year === body.year);

        if (idx !== -1) {
            budgets[idx].amount = body.amount;
        } else {
            budgets.push({
                id: nextBudgetId++,
                user_id: userId,
                month: body.month,
                year: body.year,
                amount: body.amount,
                created_at: new Date().toISOString(),
            });
            persistIds();
        }
        setBudgets(budgets);
        const budget = budgets.find((b) => b.user_id === userId && b.month === body.month && b.year === body.year);
        return { data: { ...budget, _id: budget.id } };
    },
};

// ── route matcher ────────────────────────────────────────────────────
const matchRoute = (method, url) => {
    const path = url.split('?')[0]; // strip query string
    for (const [pattern, handler] of Object.entries(ROUTES)) {
        const [pMethod, ...pParts] = pattern.split(' ');
        const pPath = pParts.join(' ');
        if (pMethod !== method) continue;

        // Convert /expenses/:id → regex
        const regexStr = '^' + pPath.replace(/:[^/]+/g, '[^/]+') + '$';
        if (new RegExp(regexStr).test(path)) {
            return handler;
        }
    }
    return null;
};

// ── axios-compatible mock ────────────────────────────────────────────
const api = {
    get: async (url) => {
        await delay();
        const handler = matchRoute('GET', url);
        if (!handler) {
            console.warn('[Mock API] Unmatched GET', url);
            return { data: null };
        }
        return handler(url);
    },
    post: async (url, body) => {
        await delay();
        const handler = matchRoute('POST', url);
        if (!handler) {
            console.warn('[Mock API] Unmatched POST', url);
            return { data: null };
        }
        return handler(url, body);
    },
    put: async (url, body) => {
        await delay();
        const handler = matchRoute('PUT', url);
        if (!handler) {
            console.warn('[Mock API] Unmatched PUT', url);
            return { data: null };
        }
        return handler(url, body);
    },
    delete: async (url) => {
        await delay();
        const handler = matchRoute('DELETE', url);
        if (!handler) {
            console.warn('[Mock API] Unmatched DELETE', url);
            return { data: null };
        }
        return handler(url);
    },
};

export default api;
