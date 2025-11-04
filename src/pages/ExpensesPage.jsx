import React, { useEffect, useState, useRef } from 'react';

  import { supabase } from '../services/supabase';
  import Navbar from '../components/Navbar';
  import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';





  function ExpensesPage() {

const filterBtnRef = useRef(null);
const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });


    const [userId, setUserId] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [desc, setDesc] = useState('');
    const [amount, setAmount] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editedDesc, setEditedDesc] = useState('');
    const [editedAmount, setEditedAmount] = useState(''); 


    const [showDateFilter, setShowDateFilter] = useState(false);
  const [showDescFilter, setShowDescFilter] = useState(false);
  const [showAmountFilter, setShowAmountFilter] = useState(false);

  const [tempSort, setTempSort] = useState({ field: '', direction: 'asc' });
  const [sort, setSort] = useState({ field: '', direction: 'asc' });

  // Filters
const [dateRangeInput, setDateRangeInput] = useState({ from: '', to: '' });
const [dateRange, setDateRange] = useState({ from: '', to: '' });


  const [descFilter, setDescFilter] = useState('');
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });

  const [descriptionFilter, setDescriptionFilter] = useState([]);
const [tempDescriptionFilter, setTempDescriptionFilter] = useState([]);
const [tempAmountRange, setTempAmountRange] = useState({ min: '', max: '' });
const [showDescriptionFilter, setShowDescriptionFilter] = useState(false);

//Pagination
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(15); // You can change to 5, 20, etc.

//Edit Saving Loading
const [savingExpenseId, setSavingExpenseId] = useState(null);

const [recentlyUpdatedIds, setRecentlyUpdatedIds] = useState([]);
const [isFilterOpen, setIsFilterOpen] = useState(false);


    useEffect(() => {
      const fetchUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUserId(session?.user?.id);
      };
      fetchUser();
    }, []);

    useEffect(() => {
      if (userId) fetchExpenses();
    }, [userId]);

useEffect(() => {
  setCurrentPage(1);
}, [expenses, dateRange, descriptionFilter, amountRange]);



    const fetchExpenses = async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error) setExpenses(data);
    };

    const addExpense = async (e) => {
      e.preventDefault();
      const { error } = await supabase.from('expenses').insert([{
        description: desc,
        amount: parseFloat(amount),
        user_id: userId,
      }]);
      if (!error) {
        setDesc('');
        setAmount('');
        setShowForm(false);
        fetchExpenses();
        setSuccessMessage('✅ Expense recorded!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    };

    const updateExpense = async (expenseId) => {
      const { error } = await supabase.from('expenses')
        .update({
          description: editedDesc,
          amount: parseFloat(editedAmount),
        })
        .eq('id', expenseId)
        .eq('user_id', userId);

      if (!error) {
        setEditingExpenseId(null);
        fetchExpenses();
      }
    };

    const deleteExpense = async (expenseId) => {
      const confirm = window.confirm('Are you sure you want to delete this expense?');
      if (!confirm) return;

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', userId);

      if (!error) fetchExpenses();
    };



const filteredExpenses = expenses.filter((expense) => {
  const expenseDate = new Date(expense.created_at);
  const fromDate = dateRange.from ? new Date(dateRange.from) : null;

  // Set toDate to the end of the day (23:59:59.999)
  const toDate = dateRange.to
    ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))
    : null;

  const datePass =
    (!fromDate || expenseDate >= fromDate) &&
    (!toDate || expenseDate <= toDate);

  const descriptionPass =
    descriptionFilter.length === 0 || descriptionFilter.includes(expense.description);

  const amountPass =
    (!amountRange.min || expense.amount >= parseFloat(amountRange.min)) &&
    (!amountRange.max || expense.amount <= parseFloat(amountRange.max));

  return datePass && descriptionPass && amountPass;
});


const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentExpenses = filteredExpenses.slice(indexOfFirstItem, indexOfLastItem);

const hasActiveFilters =
  dateRange.from ||
  dateRange.to ||
  descriptionFilter.length > 0 ||
  amountRange.min ||
  amountRange.max;

    const handleClearFilters = () => {
    setDateRange({ from: '', to: '' });
    setDescriptionFilter([]);
    setAmountRange({ min: '', max: '' });
  };


//loading saving and highlighting combine
const handleSave = async (expenseId) => {
  setSavingExpenseId(expenseId); // Set the saving ID
  try {
    await updateExpense(expenseId);
    setRecentlyUpdatedIds((prev) => [...prev, expenseId]); // mark as recently updated

    // Remove highlight after 3 seconds
    setTimeout(() => {
      setRecentlyUpdatedIds((prev) => prev.filter((id) => id !== expenseId));
    }, 3000);
  } catch (error) {
    console.error('Save failed:', error);
  } finally {
    setSavingExpenseId(null); // Reset after saving
  }
};


// export to excel (filtered only)
const handleExportToExcel = () => {
  const exportData = filteredExpenses.map((expense) => ({
    Description: expense.description,
    Amount: expense.amount,
    Date: dayjs(expense.created_at).format('YYYY-MM-DD h:mm A'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");

  XLSX.writeFile(workbook, "expenses.xlsx");
};

// to display Monthly Expense
const monthlyTotalExpense = expenses
  .filter(expense => dayjs(expense.created_at).isSame(dayjs(), 'month'))
  .reduce((sum, expense) => sum + expense.amount, 0);




      return (
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-3xl mx-auto px-4 py-8">

  <div className="mb-2 text-right">
      <button
        onClick={() => {
          const confirmExport = window.confirm("Are you sure you want to export the expenses to Excel?");
          if (confirmExport) {
            handleExportToExcel(); // Call the function properly
          }
        }}
        className="text-green-600 hover:underline text-sm ml-3"
      >
        Export Excel
      </button>
<div className="mt-2 text-gray-800">
  This Month: <strong>₱{monthlyTotalExpense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
</div>
  </div>



            {successMessage && (  
              <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded mb-4 text-center">
                {successMessage}
              </div>
            )}

            {!showForm && (
              <div className="text-center mb-6">
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-orange-600 text-white px-4 py-2 rounded-full hover:bg-orange-700 transition-all"
                >
                  ➕ Add Expense
                </button>
              </div>
            )}

            {showForm && (
              <form
                onSubmit={addExpense}
                className="bg-white p-6 rounded-xl shadow-md mb-6 w-full max-w-xl mx-auto"
              >
                <h2 className="text-lg font-semibold mb-4">📝 Record New Expense</h2>
                <input
                  type="text"
                  placeholder="Description"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  required
                  className="w-full p-2 border mb-3 rounded"
                />
                <input
                  type="number"
                  placeholder="Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full p-2 border mb-4 rounded"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setDesc('');
                      setAmount('');
                    }}
                    className="w-full bg-gray-300 text-black py-2 rounded"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

  <div className="bg-white p-4 rounded shadow">
    <h2 className="text-lg font-semibold mb-3">📋 Expense List</h2>

{hasActiveFilters && (
  <div className="flex flex-wrap justify-between items-center mb-4 text-sm text-gray-700">
    <div className="mb-2 md:mb-0">
      <span className="font-semibold">Active filters:</span>

      {/* Date range filter with total */}
      {dateRange.from && (
        <span>
          Date From: {dateRange.from}
        </span>
      )}
      {dateRange.to && (
        <span>
          Date To: {dateRange.to}
          {(() => {
            const totalAmount = expenses
              .filter((expense) => {
                const expenseDate = new Date(expense.created_at);
                const fromDate = dateRange.from ? new Date(dateRange.from) : null;
                const toDate = dateRange.to
                  ? new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))
                  : null;

                return (
                  (!fromDate || expenseDate >= fromDate) &&
                  (!toDate || expenseDate <= toDate)
                );
              })
              .reduce((sum, e) => sum + e.amount, 0);

            return ` [TotalAmount = ₱${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}]`;
          })()}
        </span>
      )}

      {/* Description filter with totals */}
      {descriptionFilter.length > 0 && (
        <span>
          Description(s):{" "}
          {descriptionFilter.map((desc, index) => {
            const totalAmount = expenses
              .filter((e) => e.description === desc)
              .reduce((sum, e) => sum + e.amount, 0);

            return (
              <span key={desc}>
                [{desc}, TotalAmount = ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}]
                {index < descriptionFilter.length - 1 && ", "}
              </span>
            );
          })}
        </span>
      )}

      {/* Amount filter */}
      {(amountRange.min || amountRange.max) && (
        <span>
          Amount: {amountRange.min || '₱0'} - {amountRange.max || '∞'}
        </span>
      )}
    </div>

    <button
      onClick={handleClearFilters}
      className="text-xs text-blue-600 hover:underline"
    >
      ✖ Clear All Filters
    </button>
  </div>
)}


    {expenses.length === 0 ? (
      <p>No expenses recorded yet.</p>
    ) : (

    <div className={isFilterOpen ? 'overflow-visible' : 'overflow-x-auto'}>

        <table className="table-fixed w-full text-left text-sm min-w-[500px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>

              {/* Description Column with Checkbox Filter */}
  <th className="py-2 px-3 relative w-48">
    <div className="relative inline-block">
      Description
      <button
        ref={filterBtnRef}
        onClick={() => {
          setTempDescriptionFilter(descriptionFilter);
          setShowDescriptionFilter(!showDescriptionFilter);
          setIsFilterOpen(!showDescriptionFilter);
        }}
        className="ml-2 text-gray-600"
      >
        {showDescriptionFilter ? '▲' : '▼'}
      </button>

      {showDescriptionFilter && (
        <div className="absolute z-30 bg-white border rounded p-3 shadow-md w-52 mt-1">
          <p className="text-sm font-semibold mb-2">Filter by Description</p>
          <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
        {[...new Set(expenses.map((e) => e.description))]
          .sort((a, b) => a.localeCompare(b))  // <-- Sort alphabetically
          .map((desc, i) => (
            <label key={i} className="flex items-center text-sm">
              <input
                type="checkbox"
                value={desc}
                checked={tempDescriptionFilter.includes(desc)}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempDescriptionFilter((prev) =>
                    prev.includes(value)
                      ? prev.filter((d) => d !== value)
                      : [...prev, value]
                  );
                }}
                className="mr-2"
              />
              {desc}
            </label>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <button
              onClick={() => {
                setTempDescriptionFilter([]);
                setDescriptionFilter([]);
                setShowDescriptionFilter(false);
                setIsFilterOpen(false);
              }}
              className="text-xs text-gray-600 hover:underline"
            >
              Clear
            </button>
            <button
              onClick={() => {
                setDescriptionFilter(tempDescriptionFilter);
                setShowDescriptionFilter(false);
                setIsFilterOpen(false);
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  </th>


            

            {/* Amount Column with Min-Max Filter */}
            <th className="py-2 px-3 relative w-32">
              Amount
              <button
                onClick={() => {
                  setShowAmountFilter(!showAmountFilter);
                  setIsFilterOpen(!showAmountFilter);
                }}
                className="ml-2 text-gray-600"
              >
                {showAmountFilter ? '▲' : '▼'}
              </button>

              {showAmountFilter && (
                <div className="absolute z-10 bg-white border rounded p-3 shadow-md mt-1 w-52">
                  <p className="text-sm font-semibold mb-2">Filter by Amount</p>
                  <input
                    type="number"
                    value={tempAmountRange.min}
                    onChange={(e) =>
                      setTempAmountRange({ ...tempAmountRange, min: e.target.value })
                    }
                    placeholder="Min"
                    className="mb-2 w-full text-sm border rounded px-2 py-1"
                  />
                  <input
                    type="number"
                    value={tempAmountRange.max}
                    onChange={(e) =>
                      setTempAmountRange({ ...tempAmountRange, max: e.target.value })
                    }
                    placeholder="Max"
                    className="w-full text-sm border rounded px-2 py-1"
                  />
                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => {
                        setTempAmountRange({ min: '', max: '' });
                        setAmountRange({ min: '', max: '' });
                        setShowAmountFilter(false);
                        setIsFilterOpen(false);
                      }}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => {
                        setAmountRange(tempAmountRange);
                        setShowAmountFilter(false);
                        setIsFilterOpen(false);
                      }}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </th>

{/* Date Column with Range Filter */}
            <th className="py-2 px-3 relative w-56">
              Date
              <button
                onClick={() => {
                  setShowDateFilter(!showDateFilter);
                  setIsFilterOpen(!showDateFilter);
                }}
                className="ml-2 text-gray-600"
              >
                {showDateFilter ? '▲' : '▼'}
              </button>


              {showDateFilter && (
                <div className="absolute z-20 bg-white border rounded p-3 shadow-md mt-1 w-64">
                  <p className="text-sm font-semibold mb-2">Filter by Date Range</p>
               <input
  type="date"
  value={dateRangeInput.from}
  onChange={(e) =>
    setDateRangeInput({ ...dateRangeInput, from: e.target.value })
  }
  className="block mb-2 w-full text-sm border rounded px-2 py-1"
/>

<input
  type="date"
  value={dateRangeInput.to}
  onChange={(e) =>
    setDateRangeInput({ ...dateRangeInput, to: e.target.value })
  }
  className="block mb-2 w-full text-sm border rounded px-2 py-1"
/>

                  <div className="flex justify-between mt-2">
                    <button
                      onClick={() => {
                        setDateRange({ from: '', to: '' });
                        setShowDateFilter(false);
                        setIsFilterOpen(false);
                      }}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Clear
                    </button>
<button
  onClick={() => {
    setDateRange(dateRangeInput);
    setShowDateFilter(false); //close the modal
    setIsFilterOpen(false);
  }}
  className="text-xs text-blue-600 hover:underline font-semibold"
>
  Apply
</button>

                  </div>
                </div>
              )}
            </th>

            {/* Actions Column */}
            <th className="py-2 px-3 relative">Actions</th>
          </tr>
        </thead>

        <tbody>
          {currentExpenses.map((exp) => (
            <tr
  key={exp.id}
  className={`border-t ${recentlyUpdatedIds.includes(exp.id) ? 'bg-yellow-100' : ''}`}
>

              {editingExpenseId === exp.id ? (
                <>
                  
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={editedDesc}
                      onChange={(e) => setEditedDesc(e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      value={editedAmount}
                      onChange={(e) => setEditedAmount(e.target.value)}
                      className="w-full p-1 border rounded"
                    />
                  </td>
                  <td className="py-2 px-3">{dayjs(exp.created_at).format('LLL')}</td>
                  <td className="py-2 px-3">
                    <div className="flex gap-2">
<button
  onClick={() => handleSave(exp.id)}
  disabled={savingExpenseId}
  className="px-3 py-1 bg-orange-500 text-white rounded disabled:opacity-50"
>
  {savingExpenseId ? 'Saving...' : 'Save'}
</button>

                      <button
                        onClick={() => setEditingExpenseId(null)}
                        className="bg-gray-400 text-white px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                <>
                 
                  <td className="py-2 px-3">{exp.description}</td>
                  <td className="py-2 px-3">₱{exp.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="py-2 px-3">{dayjs(exp.created_at).format('LLL')}</td>
                  <td className="py-2 px-3 whitespace-nowrap text-sm font-medium">
                    <span
                      onClick={() => {
                        setEditingExpenseId(exp.id);
                        setEditedDesc(exp.description);
                        setEditedAmount(exp.amount);
                      }}
                      className="text-blue-600 hover:underline cursor-pointer mr-3"
                    >
                      Edit
                    </span>
                    <span
                      onClick={() => deleteExpense(exp.id)}
                      className="text-red-600 hover:underline cursor-pointer"
                    >
                      Delete
                    </span>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>


{filteredExpenses.length > 15 && (
  <div className="flex justify-center items-center mt-4 gap-2">
    <button
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      ◀ Prev
    </button>
    <span className="text-sm text-gray-700">
      Page {currentPage} of {Math.ceil(filteredExpenses.length / itemsPerPage)}
    </span>
    <button
      onClick={() =>
        setCurrentPage((prev) =>
          prev < Math.ceil(filteredExpenses.length / itemsPerPage) ? prev + 1 : prev
        )
      }
      disabled={currentPage === Math.ceil(filteredExpenses.length / itemsPerPage)}
      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      Next ▶
    </button>
  </div>
)}



    </div>
  )}
</div>

        </div>
      </div>
    );
  }

  export default ExpensesPage;