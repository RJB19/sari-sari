import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Navbar from '../components/Navbar';
import dayjs from 'dayjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';

function DashboardPage() {
  const [userId, setUserId] = useState(null);
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchProducts();
      fetchSales();
      fetchExpenses();
      fetchEntries();
    }
  }, [userId]);

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('user_id', userId);
    setProducts(data || []);
  };

  const fetchSales = async () => {
    const { data } = await supabase.from('sales').select('*').eq('user_id', userId);
    setSales(data || []);
  };

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').eq('user_id', userId);
    setExpenses(data || []);
  };

  const fetchEntries = async () => {
    const { data } = await supabase.from('balance_sheet').select('*').eq('user_id', userId);
    setEntries(data || []);
  };

  // ===== Summary Calculations =====
  const currentMonth = dayjs().format('YYYY-MM');
  const monthlySales = sales.filter(s => dayjs(s.created_at).format('YYYY-MM') === currentMonth);
  const monthlyExpenses = expenses.filter(e => dayjs(e.created_at).format('YYYY-MM') === currentMonth);

  const totalSales = monthlySales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenses = monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  const cogs = monthlySales.reduce((sum, s) => {
    const product = products.find(p => p.id === s.product_id);
    return sum + (product ? (product.cost || 0) * s.quantity : 0);
  }, 0);
  const netProfit = totalSales - cogs - totalExpenses;

  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.cost || 0) * (p.stock || 0),
    0
  );

  const capital = entries.filter(e => e.type === 'capital' && !e.system_generated)
    .reduce((sum, e) => sum + e.amount, 0);

  const liabilities = entries.filter(e => e.type === 'liability' && !e.system_generated)
    .reduce((sum, e) => sum + e.amount, 0);

  const storeSetup = entries.filter(e => e.sub_type === 'non_current' || e.sub_type === 'other_payables')
    .reduce((sum, e) => sum + e.amount, 0);

  const adjustedCapital = capital + netProfit;
  const cash = adjustedCapital + liabilities - inventoryValue - storeSetup;

  // ===== Profit Chart (Last 6 Months) =====
  const monthlyProfitData = Array.from({ length: 6 }).map((_, i) => {
    const month = dayjs().subtract(5 - i, 'month').format('YYYY-MM');
    const monthSales = sales.filter(s => dayjs(s.created_at).format('YYYY-MM') === month);
    const monthExpenses = expenses.filter(e => dayjs(e.created_at).format('YYYY-MM') === month);
    const totalSalesMonth = monthSales.reduce((sum, s) => sum + s.amount, 0);
    const totalExpensesMonth = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const cogsMonth = monthSales.reduce((sum, s) => {
      const product = products.find(p => p.id === s.product_id);
      return sum + (product ? (product.cost || 0) * s.quantity : 0);
    }, 0);
    const profit = totalSalesMonth - cogsMonth - totalExpensesMonth;
    return {
      month: dayjs(month).format('MMM YY'),
      profit,
    };
  });

  // ===== Top 5 Fast-Moving Products =====
  const productSalesSummary = products.map(p => {
    const productSales = sales.filter(s => s.product_id === p.id);
    const totalQty = productSales.reduce((sum, s) => sum + (s.quantity || 0), 0);
    const totalProfit = productSales.reduce((sum, s) => {
      const profitPerUnit = (s.amount / s.quantity) - (p.cost || 0);
      return sum + profitPerUnit * (s.quantity || 0);
    }, 0);
    return { ...p, totalQty, totalProfit };
  });

  const topFastMoving = [...productSalesSummary]
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  const topHighProfit = [...productSalesSummary]
    .sort((a, b) => b.totalProfit - a.totalProfit)
    .slice(0, 5);

  // ===== Low Inventory (with sorting and pagination) =====
  const lowInventory = [...products]
    .filter(p => (p.stock || 0) <= 5)
    .sort((a, b) => (a.stock || 0) - (b.stock || 0)); // Lowest stock first

  const displayedLowInventory = lowInventory;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center">📊 Business Dashboard</h1>

        {/* Profit Chart */}
        <div className="bg-white shadow rounded p-4 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-center sm:text-left">📈 Net Profit (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyProfitData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `₱${v.toFixed(2)}`} />
              <Bar dataKey="profit" fill="#60a5fa" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Sections */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <DataTable title="🏆 Top 5 Fast-Moving Products" data={topFastMoving} columns={['name', 'totalQty']} labels={['Product', 'Qty Sold']} />
          <DataTable title="💎 Top 5 High-Profit Products" data={topHighProfit} columns={['name', 'totalProfit']} labels={['Product', 'Profit']} money />
        </div>

        {/* Low Inventory */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-3 text-center sm:text-left">⚠️ Low Inventory Products</h2>
          {lowInventory.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Product</th>
                      <th className="p-2 border">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedLowInventory.map((p, i) => (
                      <tr
                        key={i}
                        className={`text-center border-t ${p.stock === 0 ? 'bg-red-50' : ''}`}
                      >
                        <td className="p-2 border">{p.name}</td>
                        <td className="p-2 border text-red-600 font-semibold">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 text-sm mt-4">All products have sufficient stock.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Reusable DataTable =====
const DataTable = ({ title, data, columns, labels, money = false }) => (
  <div className="bg-white shadow rounded p-4">
    <h2 className="text-lg font-semibold mb-3 text-center sm:text-left">{title}</h2>
    {data.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              {labels.map((label, i) => (
                <th key={i} className="p-2 border">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i} className="text-center border-t">
                <td className="p-2 border">{item[columns[0]]}</td>
                <td className="p-2 border">
                  {money ? `₱${item[columns[1]].toFixed(2)}` : item[columns[1]]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <p className="text-center text-gray-500 text-sm mt-4">No data available.</p>
    )}
  </div>
);

export default DashboardPage;
