import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import Navbar from '../components/Navbar';
import dayjs from 'dayjs';

function BalanceSheetPage() {
  const [userId, setUserId] = useState(null);
  const [entries, setEntries] = useState([]);
  const [type, setType] = useState('capital');
  const [subType, setSubType] = useState('inventory');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [createdAt, setCreatedAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchEntries();
      fetchProducts();
      fetchSales();
      fetchExpenses();
    }
  }, [userId]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('balance_sheet')
      .select('*')
      .eq('user_id', userId);
    if (!error) setEntries(data);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId);
    if (!error) setProducts(data);
  };

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('user_id', userId);
    if (!error) setSales(data);
  };

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId);
    if (!error) setExpenses(data);
  };

  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!description || !amount || !userId) return;

    const entry = {
      user_id: userId,
      type,
      sub_type: subType,
      description,
      amount: parseFloat(amount),
      created_at: new Date(createdAt).toISOString(),
      system_generated: false,
    };

    if (editingId) {
      const { error } = await supabase
        .from('balance_sheet')
        .update(entry)
        .eq('id', editingId);
      if (!error) {
        setEditingId(null);
        resetForm();
        fetchEntries();
      } else {
        console.error('Update error:', error);
      }
    } else {
      const { error } = await supabase.from('balance_sheet').insert([entry]);
      if (!error) {
        resetForm();
        fetchEntries();
      } else {
        console.error('Insert error:', error);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    const { error } = await supabase.from('balance_sheet').delete().eq('id', id);
    if (!error) fetchEntries();
  };

  const resetForm = () => {
    setType('capital');
    setSubType('inventory');
    setDescription('');
    setAmount('');
    setEditingId(null);
    setCreatedAt(dayjs().format('YYYY-MM-DDTHH:mm'));
  };

const capital = entries.filter(
  (e) => e.type === 'capital' && !e.system_generated
);

const liabilities = entries.filter(
  (e) => e.type === 'liability' && !e.system_generated
);


  const inventoryPayables = liabilities.filter((e) => e.sub_type === 'inventory_payables');
  const otherPayables = liabilities.filter((e) => e.sub_type === 'other_payables');

  const inventoryValue = products.reduce(
    (sum, p) => sum + (p.cost || 0) * (p.stock || 0),
    0
  );

  const nonCurrentAssetEntries = capital.filter((e) => e.sub_type === 'non_current')
    .concat(otherPayables);

  const storeSetupValue = nonCurrentAssetEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, e) => sum + e.amount, 0);
  const totalCapital = capital.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

  const cogs = sales.reduce((sum, s) => {
    const product = products.find((p) => p.id === s.product_id);
    return sum + (product ? (product.cost || 0) * (s.quantity || 0) : 0);
  }, 0);

  const netProfit = totalSales - cogs - totalExpenses;
  const adjustedCapital = totalCapital + netProfit;
  const cash = adjustedCapital + totalLiabilities - inventoryValue - storeSetupValue;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center">📒 Balance Sheet</h1>

<form
  onSubmit={handleAddOrUpdate}
  className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-5 gap-2"
>
  <select
    value={type}
    onChange={(e) => {
      const selectedType = e.target.value;
      setType(selectedType);
      setSubType(selectedType === 'capital' ? 'inventory' : 'inventory_payables');
    }}
    className="border p-2 rounded"
  >
    <option value="capital">Capital</option>
    <option value="liability">Liability</option>
  </select>

  <select
    value={subType}
    onChange={(e) => setSubType(e.target.value)}
    className="border p-2 rounded"
  >
    {type === 'capital' ? (
      <>
        <option value="inventory">Inventory Cash</option>
        <option value="non_current">Non-Current Asset</option>
      </>
    ) : (
      <>
        <option value="inventory_payables">Inventory Payables</option>
        <option value="other_payables">Other Payables</option>
      </>
    )}
  </select>

  <input
    type="text"
    value={description}
    onChange={(e) => setDescription(e.target.value)}
    placeholder="Description"
    className="border p-2 rounded"
  />
  <input
    type="number"
    value={amount}
    onChange={(e) => setAmount(e.target.value)}
    placeholder="Amount"
    className="border p-2 rounded"
  />
  <button
    type="submit"
    className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
  >
    {editingId ? 'Update' : 'Add'}
  </button>
</form>


        <div className="grid md:grid-cols-2 gap-6">
          {[{ label: 'Capital', data: capital }, { label: 'Liability', data: liabilities }].map(
            (group) => (
              <div key={group.label} className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold mb-2">{group.label}</h2>
                <ul className="divide-y">
                  {group.data.map((entry) => (
                    <li key={entry.id} className="py-2 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-gray-500">
                          ₱{entry.amount.toFixed(2)} ·{' '}
                          {dayjs(entry.created_at).format('MMM D, YYYY h:mm A')}
                        </p>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setType(entry.type);
                            setSubType(entry.sub_type);
                            setDescription(entry.description);
                            setAmount(entry.amount);
                            setCreatedAt(dayjs(entry.created_at).format('YYYY-MM-DDTHH:mm'));
                          }}
                          className="text-blue-500 text-sm hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-500 text-sm hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>

        <div className="mt-10 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-center">🧾 Statement of Financial Position</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">Assets</h3>
              <ul className="text-sm space-y-1">
                <li>🛒 Inventory: ₱{inventoryValue.toFixed(2)}</li>
                <li>🏪 Non-Current Assets: ₱{storeSetupValue.toFixed(2)}</li>
                <li>💵 Cash: ₱{cash.toFixed(2)}</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Liabilities + Equity</h3>
              <ul className="text-sm space-y-1">
                <li>📉 Liabilities: ₱{totalLiabilities.toFixed(2)}</li>
                <li>🧾 Capital: ₱{totalCapital.toFixed(2)}</li>
                <li>✅ Net Profit: ₱{netProfit.toFixed(2)}</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">Assets = Liabilities + Equity</p>
            <p className="font-bold text-lg">
              ₱{(inventoryValue + storeSetupValue + cash).toFixed(2)} = ₱{(totalLiabilities + totalCapital + netProfit).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}




export default BalanceSheetPage;
