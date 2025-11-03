import '@fontsource/inter'; // 👈 Adds Inter font to your project
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import './index.css';
import ErrorBoundary from './ErrorBoundary';
import ExpensesPage from './pages/ExpensesPage';
import BalanceSheetPage from './pages/BalanceSheetPage';
import IncomeStatementPage from './pages/IncomeStatementPage';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route path="/expenses" element={<ExpensesPage />} />
      <Route path="/income-statement" element={<IncomeStatementPage />} />
      <Route path="/balance-sheet" element={<BalanceSheetPage />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>
);
