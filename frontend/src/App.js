import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import ExpenseManager from './components/ExpenseManager';
import BudgetSettings from './components/BudgetSettings';

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }
    return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return null;
    return isAuthenticated ? <Navigate to="/" /> : children;
};

function App() {
    return (
        <div className="min-h-screen bg-gray-50">
            <Routes>
                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                <Route path="/" element={
                    <ProtectedRoute>
                        <Navbar />
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/expenses" element={
                    <ProtectedRoute>
                        <Navbar />
                        <ExpenseManager />
                    </ProtectedRoute>
                } />
                <Route path="/budget" element={
                    <ProtectedRoute>
                        <Navbar />
                        <BudgetSettings />
                    </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </div>
    );
}

export default App;
