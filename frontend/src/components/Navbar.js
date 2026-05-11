import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { LayoutDashboard, Receipt, Settings, LogOut, Menu, X, Wallet, ChevronDown } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { currency, setCurrency, currencies } = useCurrency();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currencyOpen, setCurrencyOpen] = useState(false);

    const navLinks = [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/expenses', label: 'Expenses', icon: Receipt },
        { to: '/budget', label: 'Budget', icon: Settings },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-shadow">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                            ExpenseTracker
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                    isActive(to)
                                        ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </Link>
                        ))}
                    </div>

                    {/* User section + Currency */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Currency Picker */}
                        <div className="relative">
                            <button
                                id="currency-picker-btn"
                                onClick={() => setCurrencyOpen(!currencyOpen)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-200"
                            >
                                <span className="text-base font-semibold">{currency.symbol}</span>
                                <span className="text-xs text-gray-500">{currency.code}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${currencyOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {currencyOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setCurrencyOpen(false)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-slide-up">
                                        {currencies.map((c) => (
                                            <button
                                                key={c.code}
                                                id={`currency-option-${c.code}`}
                                                onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                                                    currency.code === c.code
                                                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                        : 'text-gray-700 hover:bg-gray-50'
                                                }`}
                                            >
                                                <span className="text-base font-semibold w-6 text-center">{c.symbol}</span>
                                                <div className="text-left">
                                                    <div className="font-medium">{c.code}</div>
                                                    <div className="text-xs text-gray-400">{c.name}</div>
                                                </div>
                                                {currency.code === c.code && (
                                                    <span className="ml-auto text-indigo-500">✓</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                        </div>
                        <button
                            id="logout-btn"
                            onClick={logout}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-lg animate-slide-up">
                    <div className="px-4 py-3 space-y-1">
                        {navLinks.map(({ to, label, icon: Icon }) => (
                            <Link
                                key={to}
                                to={to}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive(to)
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {label}
                            </Link>
                        ))}

                        {/* Mobile Currency Picker */}
                        <div className="border-t border-gray-100 pt-2 mt-2">
                            <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</p>
                            <div className="flex flex-wrap gap-2 px-4 py-2">
                                {currencies.map((c) => (
                                    <button
                                        key={c.code}
                                        onClick={() => setCurrency(c.code)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            currency.code === c.code
                                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span className="font-semibold">{c.symbol}</span>
                                        <span className="text-xs">{c.code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-gray-100 pt-2 mt-2">
                            <div className="flex items-center gap-3 px-4 py-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-semibold">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                            </div>
                            <button
                                onClick={() => { logout(); setMobileMenuOpen(false); }}
                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 w-full transition-all"
                            >
                                <LogOut className="w-5 h-5" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
