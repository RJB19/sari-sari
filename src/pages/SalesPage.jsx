  import React, { useEffect, useState } from 'react';
  import { supabase } from '../services/supabase';
  import Navbar from '../components/Navbar';
  import dayjs from 'dayjs';
  import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(localizedFormat);
import * as XLSX from 'xlsx';


  function SalesPage() {
    const [userId, setUserId] = useState(null);
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [saleQty, setSaleQty] = useState('');
    const [sales, setSales] = useState([]);
    const [showSaleForm, setShowSaleForm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingSaleId, setEditingSaleId] = useState(null);
    const [editedQty, setEditedQty] = useState('');
    const [editedProductId, setEditedProductId] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isSavingSale, setIsSavingSale] = useState(false);
    const [isUpdatingSale, setIsUpdatingSale] = useState(false);

  const [productFilter, setProductFilter] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  const [showProductFilter, setShowProductFilter] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);

  const [tempProductFilter, setTempProductFilter] = useState([]);
  const [tempDateRange, setTempDateRange] = useState({ from: '', to: '' });

  const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(15); // can change this to 5, 20, etc.

const [recentlyUpdatedSaleId, setRecentlyUpdatedSaleId] = useState(null);



useEffect(() => {
  setCurrentPage(1);
}, [productFilter, dateRange]);



    useEffect(() => {
      const fetchUser = async () => {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.warn("No session found or error fetching session:", error);
          return;
        }
        setUserId(session.user.id);
      };
      fetchUser();
    }, []);

    useEffect(() => {
      if (userId) {
        fetchProducts();
        fetchSales();
      }
    }, [userId]);

  const fetchProducts = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name');
    if (!error) setProducts(data);
    else console.error("Error fetching products:", error);
    setIsLoading(false);
  };

const fetchSales = async () => {
  setIsLoading(true);

  const { data, error } = await supabase
    .from('sales')
    .select(`
      id,
      quantity,
      amount,
      created_at,
      product_id,
      products (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching sales with product name:", error);
  } else {
    setSales(data);
  }

  setIsLoading(false);
};



  const addSale = async (e) => {
    e.preventDefault();
    setIsSavingSale(true);

    try {
      const product = products.find((p) => String(p.id) === selectedProduct);
      if (!product) {
        alert("Invalid product selected");
        return;
      }

      const qty = parseInt(saleQty);
      if (!qty || qty <= 0) {
        alert("Invalid quantity");
        return;
      }

      if (qty > product.stock) {
        alert("Not enough stock!");
        return;
      }

      const total = qty * product.price;

      const { error: saleError } = await supabase.from('sales').insert([{
        product_id: product.id,
        quantity: qty,
        amount: total,
        user_id: userId,
      }]);

      const { error: stockError } = await supabase
        .from('products')
        .update({ stock: product.stock - qty })
        .eq('id', product.id)
        .eq('user_id', userId);

      if (!saleError && !stockError) {
        setSelectedProduct('');
        setSaleQty('');
        setShowSaleForm(false);
        fetchSales();
        fetchProducts();

        setSuccessMessage(`✅ Sale recorded for "${product.name}"`);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        console.error(saleError || stockError);
        alert("Something went wrong while recording the sale.");
      }
    } finally {
      setIsSavingSale(false); // ✅ Always runs, even if `return` happened
    }
  };


const handleUpdateSale = async (sale) => {
  setIsUpdatingSale(true);

  try {
    const newProductId = parseInt(editedProductId);
    const newQty = parseInt(editedQty);
    const newProduct = products.find(p => p.id === newProductId);
    const oldProduct = products.find(p => p.id === sale.product_id);

    if (!newProduct || isNaN(newQty) || newQty <= 0) {
      alert("Invalid product or quantity.");
      return;
    }

    const isSameProduct = sale.product_id === newProduct.id;

    if (isSameProduct) {
      const diff = newQty - sale.quantity;
      if (diff > 0 && newProduct.stock < diff) {
        alert("Not enough stock.");
        return;
      }
    } else {
      if (newProduct.stock < newQty) {
        alert("Not enough stock in selected new product.");
        return;
      }
    }

    const newAmount = newQty * newProduct.price;

    const { error: updateError } = await supabase
      .from('sales')
      .update({
        product_id: newProduct.id,
        quantity: newQty,
        amount: newAmount
      })
      .eq('id', sale.id);

    if (updateError) {
      console.error("Sale update error:", updateError);
      alert("Failed to update sale");
      return;
    }

    // Restore stock to old product if switching
    if (!isSameProduct) {
      await supabase
        .from('products')
        .update({ stock: oldProduct.stock + sale.quantity })
        .eq('id', oldProduct.id);
    }

    const stockChange = isSameProduct ? newQty - sale.quantity : newQty;

    await supabase
      .from('products')
      .update({
        stock: newProduct.stock - stockChange
      })
      .eq('id', newProduct.id);

    setEditingSaleId(null);
    setEditedQty('');
    setEditedProductId('');
    fetchSales();
    fetchProducts();

    // ✅ Highlight the updated row
setRecentlyUpdatedSaleId(sale.id);

setTimeout(() => {
  setRecentlyUpdatedSaleId(null);
}, 3000); // highlight for 3 seconds


  } finally {
    setIsUpdatingSale(false);
  }
};



    const handleDeleteSale = async (sale) => {
      const confirm = window.confirm('Are you sure you want to delete this sale?');
      if (!confirm) return;

      const product = products.find(p => p.id === sale.product_id);
      if (!product) {
        alert("Product not found");
        return;
      }

      const { error: deleteError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);

      if (deleteError) {
        console.error(deleteError);
        alert("Failed to delete sale.");
        return;
      }

      const { error: stockError } = await supabase
        .from('products')
        .update({
          stock: product.stock + sale.quantity,
        })
        .eq('id', product.id);

      if (stockError) {
        console.error(stockError);
        alert("Failed to restore stock.");
      }

      await fetchSales();
      await fetchProducts();
    };


    const filteredSales = sales.filter((sale) => {
    const matchProduct =
      productFilter.length === 0 || productFilter.includes(String(sale.product_id));

    const saleDate = new Date(sale.created_at);
    const from = dateRange.from ? new Date(dateRange.from) : null;
    const to = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : null;

    const matchDate = (!from || saleDate >= from) && (!to || saleDate <= to);

    return matchProduct && matchDate;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentSales = filteredSales.slice(indexOfFirstItem, indexOfLastItem);


const soldProductIds = [...new Set(sales.map(s => s.product_id))];
const soldProducts = products.filter(p => soldProductIds.includes(p.id));

// Expor for ALl and Active Filter
const handleExportToExcel = () => {
  // Use filteredSales if filters are active, otherwise use full sales array
  const exportSource =
    productFilter.length > 0 || dateRange.from || dateRange.to
      ? filteredSales
      : sales;

  const exportData = exportSource.map((sale) => ({
    Product: sale.products?.name || "N/A",
    Quantity: sale.quantity,
    Amount: sale.amount,
    Date: dayjs(sale.created_at).format("YYYY-MM-DD h:mm A"),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

  XLSX.writeFile(workbook, "sales.xlsx");
};


//helper to calculate totals for each filtered product
const activeFilterTotals = productFilter.map((productId) => {
  const salesOfProduct = filteredSales.filter(
    (sale) => String(sale.product_id) === productId
  );

  const totalQty = salesOfProduct.reduce((sum, s) => sum + s.quantity, 0);
  const totalAmount = salesOfProduct.reduce((sum, s) => sum + s.amount, 0);

  const productName = products.find((p) => String(p.id) === productId)?.name || "N/A";

  return { productName, totalQty, totalAmount };
});


// Compute totals for the date filter
let dateFilterTotalAmount = 0;

if (dateRange.from || dateRange.to) {
  const from = dateRange.from ? new Date(dateRange.from) : null;
  const to = dateRange.to ? new Date(dateRange.to + 'T23:59:59') : null;

  const salesInDateRange = sales.filter((sale) => {
    const saleDate = new Date(sale.created_at);
    return (!from || saleDate >= from) && (!to || saleDate <= to);
  });

  dateFilterTotalAmount = salesInDateRange.reduce((sum, s) => sum + s.amount, 0);
}


//to display Today's Sales
const todaysTotalSales = sales
  .filter(sale => dayjs(sale.created_at).isSame(dayjs(), 'day'))
  .reduce((sum, sale) => sum + sale.amount, 0);


    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">

<div className="mb-2 text-right">
  <button
    onClick={() => {
      const confirmExport = window.confirm("Are you sure you want to export the sales to Excel?");
      if (confirmExport) {
        handleExportToExcel();
      }
    }}
    className="text-green-600 hover:underline text-sm ml-3"
  >
    Export Excel
  </button>
    <div className="mt-2 text-gray-800">
    Today's Sales: <strong>₱{todaysTotalSales.toFixed(2)}</strong>
  </div>
</div>


          <div className="text-center mb-6">
            {successMessage && (
              <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded mb-4 text-center">
                {successMessage}
              </div>
            )}

            {!showSaleForm && (
              <button
                onClick={() => setShowSaleForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-full hover:bg-green-700 transition-all duration-200"
              >
                ➕ Record Sale
              </button>
            )}
          </div>

          {showSaleForm && (
            <form
              onSubmit={addSale}
              className="bg-white p-6 rounded-xl shadow-md mb-6 w-full max-w-xl mx-auto"
            >
              <h2 className="text-lg font-semibold mb-4">🧾 Record Sale</h2>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full p-2 border mb-3 rounded"
                required
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₱{p.price}) - Stock: {p.stock}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Quantity"
                value={saleQty}
                onChange={(e) => setSaleQty(e.target.value)}
                className="w-full p-2 border mb-4 rounded"
                required
              />
              <div className="flex gap-2">
  <button
    type="submit"
    disabled={isSavingSale}
    className={`w-full py-2 rounded ${
      isSavingSale ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
    }`}
  >
    {isSavingSale ? 'Saving...' : 'Save Sale'}
  </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSaleForm(false);
                    setSelectedProduct('');
                    setSaleQty('');
                  }}
                  className="w-full bg-gray-300 text-black py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

  <div className="bg-white p-4 rounded shadow">
    <h2 className="text-lg font-semibold mb-3">📈 Recent Sales</h2>

{(productFilter.length > 0 || dateRange.from || dateRange.to) && (
  <div className="flex flex-wrap justify-between items-center mb-4 text-sm text-gray-700">
    <div className="mb-2 md:mb-0">
      {productFilter.length > 0 && (
        <span className="mr-4">
          Product(s):{" "}
          {activeFilterTotals.map((item, idx) => (
            <span key={idx} className="mr-2">
              [{item.productName}, TotalQty={item.totalQty}, TotalAmount=₱
              {item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}]
              {idx < activeFilterTotals.length - 1 && ", "}
            </span>
          ))}
        </span>
      )}

      {(dateRange.from || dateRange.to) && (
        <span>
          | Date:
          {dateRange.from && ` from ${dateRange.from}`}
          {dateRange.to && ` to ${dateRange.to}`} 
          {dateFilterTotalAmount > 0 && 
            ` [Total Amount=₱${dateFilterTotalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}]`
          }
        </span>
      )}
    </div>

    <button
      onClick={() => {
        setProductFilter([]);
        setDateRange({ from: "", to: "" });
        setTempProductFilter([]);
        setTempDateRange({ from: "", to: "" });
      }}
      className="text-xs text-blue-600 hover:underline"
    >
      ✖ Clear All Filters
    </button>
  </div>
)}



{filteredSales.length === 0 ? (
  <p className="text-gray-600 italic text-center py-8">
    {sales.length === 0
      ? "📭 No sales recorded yet."
      : "🔍 No sales match your filter criteria."}
  </p>



    ) : (
      

      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[600px]">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
  <th className="py-2 px-3 relative">
    Product
<button
  onClick={() => {
    setTempProductFilter(productFilter);
    setShowProductFilter(!showProductFilter);
  }}
  className="ml-2 text-gray-600"
  aria-haspopup="true"
  aria-expanded={showProductFilter}
>
  {showProductFilter ? '▲' : '▼'}
</button>


    {showProductFilter && (
      <div className="absolute z-10 bg-white border rounded p-3 shadow-md mt-1 w-52">
        <p className="text-sm font-semibold mb-2">Filter by Product</p>
        <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
          {soldProducts.map((p) => (
            <label key={p.id} className="flex items-center text-sm">
              <input
                type="checkbox"
                value={p.id}
                checked={tempProductFilter.includes(String(p.id))}
                onChange={(e) => {
                  const value = e.target.value;
                  setTempProductFilter((prev) =>
                    prev.includes(value)
                      ? prev.filter((id) => id !== value)
                      : [...prev, value]
                  );
                }}
                className="mr-2"
              />
              {p.name}
            </label>
          ))}
        </div>
        <div className="flex justify-between items-center mt-2">
<button
  onClick={() => {
    setTempProductFilter([]);
    setProductFilter([]);         // Reset actual product filter
    setShowProductFilter(false);  // Close dropdown
  }}
  className="text-xs text-gray-600 hover:underline"
>
  Clear
</button>

          <button
            onClick={() => {
              setProductFilter(tempProductFilter);
              setShowProductFilter(false);
            }}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    )}
  </th>

              <th className="py-2 px-3">Qty</th>
              <th className="py-2 px-3">Amount</th>
  <th className="py-2 px-3 relative w-48">
    Date
<button
  onClick={() => {
    setTempDateRange(dateRange);
    setShowDateFilter(!showDateFilter);
  }}
  className="ml-2 text-gray-600"
  aria-haspopup="true"
  aria-expanded={showDateFilter}
>
  {showDateFilter ? '▲' : '▼'}
</button>


    {showDateFilter && (
      <div className="absolute z-10 bg-white border rounded p-3 shadow-md mt-1 w-64">
        <p className="text-sm font-semibold mb-2">Filter by Date</p>
        <div className="flex flex-col gap-2">
          <input
            type="date"
            value={tempDateRange.from}
            onChange={(e) =>
              setTempDateRange((prev) => ({ ...prev, from: e.target.value }))
            }
            className="border p-1 rounded"
          />
          <input
            type="date"
            value={tempDateRange.to}
            onChange={(e) =>
              setTempDateRange((prev) => ({ ...prev, to: e.target.value }))
            }
            className="border p-1 rounded"
          />
          <div className="flex justify-between mt-2">
<button
  onClick={() => {
    setTempDateRange({ from: '', to: '' });
    setDateRange({ from: '', to: '' });   // Reset actual date filter
    setShowDateFilter(false);            // Close dropdown
  }}
  className="text-xs text-gray-600 hover:underline"
>
  Clear
</button>

            <button
              onClick={() => {
                setDateRange(tempDateRange);
                setShowDateFilter(false);
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )}
  </th>

              <th className="py-2 px-3 relative w-48">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentSales.map((sale) => (
              <tr 
  key={sale.id} 
  className={`border-t ${recentlyUpdatedSaleId === sale.id ? 'bg-yellow-100' : ''}`}
>

                {editingSaleId === sale.id ? (
                  <>
                    <td className="py-2 px-3">
                      <select
                        value={editedProductId}
                        onChange={(e) => setEditedProductId(e.target.value)}
                        className="border p-1 rounded w-full"
                        disabled={isUpdatingSale}
                      >
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="number"
                        value={editedQty}
                        onChange={(e) => setEditedQty(e.target.value)}
                        className="border p-1 rounded w-14"
                        disabled={isUpdatingSale}
                      />
                    </td>
                    <td className="py-2 px-3">₱{(editedQty * products.find(p => p.id === parseInt(editedProductId))?.price || 0).toFixed(2)}</td>
                    <td className="py-2 px-3">{dayjs(sale.created_at).format('MMM D, YYYY h:mm A')
}</td>
                    <td className="py-2 px-3 space-x-1">
                      <button
                        onClick={() => handleUpdateSale(sale)}
                        disabled={isUpdatingSale}
                        className={`px-2 py-1 rounded text-sm text-white ${
                          isUpdatingSale ? "bg-gray-400" : "bg-green-600"
                        }`}
                      >
                        {isUpdatingSale ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          if (isUpdatingSale) return;
                          setEditingSaleId(null);
                          setEditedQty('');
                          setEditedProductId('');
                        }}
                        className="bg-gray-400 text-white px-2 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 px-3">{sale.products?.name || "N/A"}</td>
                    <td className="py-2 px-3">{sale.quantity}</td>
                    <td className="py-2 px-3">₱{sale.amount.toFixed(2)}</td>
                    <td className="py-2 px-3">{dayjs(sale.created_at).format('MMM D, YYYY h:mm A')
}</td>
                    <td className="py-2 px-3 space-x-1">
  <button
    onClick={() => {
      setEditingSaleId(sale.id);
      setEditedQty(sale.quantity);
      setEditedProductId(sale.product_id);
    }}
    className="text-blue-600 hover:underline text-sm mr-3"
  >
    Edit
  </button>
  <button
    onClick={() => handleDeleteSale(sale)}
    className="text-red-600 hover:underline text-sm ml-3"
  >
    Delete
  </button>

                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

{filteredSales.length > itemsPerPage && (
  <div className="flex justify-center items-center mt-4 gap-2">
    <button
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      disabled={currentPage === 1}
      className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
    >
      ◀ Prev
    </button>
    <span className="text-sm text-gray-700">
      Page {currentPage} of {Math.ceil(filteredSales.length / itemsPerPage)}
    </span>
    <button
      onClick={() =>
        setCurrentPage((prev) =>
          prev < Math.ceil(filteredSales.length / itemsPerPage) ? prev + 1 : prev
        )
      }
      disabled={currentPage === Math.ceil(filteredSales.length / itemsPerPage)}
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

  export default SalesPage;
