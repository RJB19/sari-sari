import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Navbar from '../components/Navbar';
import dayjs from 'dayjs';

function IncomeStatementPage() {
  const [userId, setUserId] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [startDate, setStartDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  // Pagination states
  const itemsPerPage = 15;
  const [currentSalesPage, setCurrentSalesPage] = useState(1);
  const [currentExpensesPage, setCurrentExpensesPage] = useState(1);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchSales();
      fetchProducts();
      fetchExpenses();
    }
  }, [userId]);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId);
    if (!error) setSales(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);
    if (!error) setProducts(data);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);
    if (!error) setExpenses(data);
  };

  // Filter sales & expenses by date range
const filteredSales = sales.filter((s) => {
  const saleDate = dayjs(s.created_at);
  return saleDate.isSameOrAfter(dayjs(startDate), 'day') &&
         saleDate.isSameOrBefore(dayjs(endDate), 'day');
}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const filteredExpenses = expenses.filter((e) => {
  const expenseDate = dayjs(e.created_at);
  return expenseDate.isSameOrAfter(dayjs(startDate), 'day') &&
         expenseDate.isSameOrBefore(dayjs(endDate), 'day');
}).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));


  const totalSales = filteredSales.reduce((sum, s) => sum + s.amount, 0);

  const cogs = filteredSales.reduce((sum, s) => {
    const product = products.find((p) => p.id === s.product_id);
    return sum + (product ? (product.cost || 0) * (s.quantity || 0) : 0);
  }, 0);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalSales - cogs - totalExpenses;

  // Pagination logic for Sales
  const indexOfLastSale = currentSalesPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
  const totalSalesPages = Math.ceil(filteredSales.length / itemsPerPage);

  // Pagination logic for Expenses
  const indexOfLastExpense = currentExpensesPage * itemsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(indexOfFirstExpense, indexOfLastExpense);
  const totalExpensePages = Math.ceil(filteredExpenses.length / itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">📊 Income Statement</h1>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentSalesPage(1);
                setCurrentExpensesPage(1);
              }}
              className="border p-2 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentSalesPage(1);
                setCurrentExpensesPage(1);
              }}
              className="border p-2 rounded"
            />
          </div>
        </div>

        {/* Summary Section */}
        <div className="bg-white shadow rounded p-6 mb-8 text-sm sm:text-base">
          <ul className="space-y-2">
            <li>💰 <strong>Sales Revenue:</strong> ₱{totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
            <li>📦 <strong>Cost of Goods Sold (COGS):</strong> ₱{cogs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
            <li>💸 <strong>Operating Expenses:</strong> ₱{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</li>
            <li className="font-bold text-lg sm:text-xl mt-2">
              ✅ Net Profit: ₱{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </li>
          </ul>
        </div>

        {/* Sales Breakdown */}
        <div className="bg-white shadow rounded p-4 sm:p-6 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-center sm:text-left">🧾 Sales Breakdown</h2>
          {currentSales.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Product</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSales.map((s, i) => {
                    const product = products.find((p) => p.id === s.product_id);
                    return (
                      <tr key={i} className="text-center border-t">
                        <td className="p-2 border">{dayjs(s.created_at).format('YYYY-MM-DD')}</td>
                        <td className="p-2 border">{product ? product.name : 'N/A'}</td>
                        <td className="p-2 border">{s.quantity}</td>
                        <td className="p-2 border">₱{s.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm mt-4">No Sales data available.</p>
          )}

          {/* Sales Pagination */}
          {totalSalesPages > 1 && (
            <div className="flex justify-center items-center mt-4 gap-2">
              <button
                onClick={() => setCurrentSalesPage((p) => Math.max(p - 1, 1))}
                disabled={currentSalesPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">
                Page {currentSalesPage} of {totalSalesPages}
              </span>
              <button
                onClick={() => setCurrentSalesPage((p) => Math.min(p + 1, totalSalesPages))}
                disabled={currentSalesPage === totalSalesPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white shadow rounded p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-3 text-center sm:text-left">💸 Expense Breakdown</h2>
          {currentExpenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentExpenses.map((e, i) => (
                    <tr key={i} className="text-center border-t">
                      <td className="p-2 border">{dayjs(e.created_at).format('YYYY-MM-DD')}</td>
                      <td className="p-2 border">{e.description}</td>
                      <td className="p-2 border">₱{e.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 text-sm mt-4">No Expense data available.</p>
          )}

          {/* Expense Pagination */}
          {totalExpensePages > 1 && (
            <div className="flex justify-center items-center mt-4 gap-2">
              <button
                onClick={() => setCurrentExpensesPage((p) => Math.max(p - 1, 1))}
                disabled={currentExpensesPage === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">
                Page {currentExpensesPage} of {totalExpensePages}
              </span>
              <button
                onClick={() => setCurrentExpensesPage((p) => Math.min(p + 1, totalExpensePages))}
                disabled={currentExpensesPage === totalExpensePages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncomeStatementPage;
