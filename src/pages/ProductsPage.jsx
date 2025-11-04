    import React, { useEffect, useState } from 'react';
    import { supabase } from '../services/supabase';
    import { saveAs } from 'file-saver';
    import Navbar from '../components/Navbar';
    import dayjs from 'dayjs';
    import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import * as XLSX from 'xlsx';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);


    function Products() {
    const [userId, setUserId] = useState(null);
    const [products, setProducts] = useState([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [stock, setStock] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [entries, setEntries] = useState([]);
    const [sales, setSales] = useState([]);
    const [expenses, setExpenses] = useState([]);

{/*const [nameFilter, setNameFilter] = useState('');
const [priceFilter, setPriceFilter] = useState('');
const [costFilter, setCostFilter] = useState('');
const [stockFilter, setStockFilter] = useState(''); */}


const [showHistoryModal, setShowHistoryModal] = useState(false);
const [changeHistory, setChangeHistory] = useState([]);

const [recentlyUpdatedProductIds, setRecentlyUpdatedProductIds] = useState([]);

const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage] = useState(15); // Can change this value if needed

// Filter states
const [nameFilterDropdown, setNameFilterDropdown] = useState(false);
const [tempNameFilter, setTempNameFilter] = useState([]);
const [nameFilter, setNameFilter] = useState([]); // Final applied filter

const [priceRange, setPriceRange] = useState({ min: '', max: '' });
const [tempPriceRange, setTempPriceRange] = useState({ min: '', max: '' });

const [stockRange, setStockRange] = useState({ min: '', max: '' });
const [tempStockRange, setTempStockRange] = useState({ min: '', max: '' });
const [showStockDropdown, setShowStockDropdown] = useState(false);

const [costRange, setCostRange] = useState({ min: '', max: '' });
const [tempCostRange, setTempCostRange] = useState({ min: '', max: '' });
const [showCostDropdown, setShowCostDropdown] = useState(false);
const [showPriceDropdown, setShowPriceDropdown] = useState(false);
const [showNameDropdown, setShowNameDropdown] = useState(false);

const [isSaving, setIsSaving] = useState(false);
const [isEditingProduct, setIsEditingProduct] = useState(false);
const [isFilterOpen, setIsFilterOpen] = useState(false);
const [showArchived, setShowArchived] = useState(true);

const [sortAscending, setSortAscending] = useState(true);

const [sortConfig, setSortConfig] = React.useState({
  key: "name",
  direction: "asc"
});

//Add state for archived pagination

const [archivedCurrentPage, setArchivedCurrentPage] = React.useState(1);
const itemsPerPageArchived = 5;

// Add state for history modal pagination
const [historyCurrentPage, setHistoryCurrentPage] = React.useState(1);
const itemsPerPageHistory = 10;

//Success when adding product
const [successMessage, setSuccessMessage] = useState('');

//highligh for update
const [highlightedRows, setHighlightedRows] = useState([]);

// Product filter dropdown
const [showProductFilter, setShowProductFilter] = useState(false);
const [productFilter, setProductFilter] = useState([]); // applied filter
const [tempProductFilter, setTempProductFilter] = useState([]); // temp selection

// Date range filter
const [showDateFilter, setShowDateFilter] = useState(false);
const [dateRange, setDateRange] = useState({ from: '', to: '' }); // applied filter
const [tempDateRange, setTempDateRange] = useState({ from: '', to: '' }); // temp selection




useEffect(() => {
  setCurrentPage(1);
}, [/* any filter states or product list updates */]);

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
        fetchEntries();
        fetchSales();
        fetchExpenses();
        }
    }, [userId]);

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true }); // Sort alphabetically by name (default)

  if (!error) {
    // ✅ Optional fallback sorting in JS to ensure correct order
    const sortedData = data.sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    console.log("Products sorted by name:", sortedData.map(p => p.name));
    setProducts(sortedData);

    // Fetch recent changes to mark updated products

  } else {
    console.error("Error fetching products:", error.message);
  }
};


    const fetchEntries = async () => {
        const { data, error } = await supabase
        .from('balance_sheet')
        .select('*')
        .eq('user_id', userId);
        if (!error) setEntries(data);
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

    const computeCashBalance = () => {
        const capital = entries.filter((e) => e.type === 'capital');
        const liabilities = entries.filter((e) => e.type === 'liability');

        const inventoryValue = products.reduce(
        (sum, p) => sum + (p.cost || 0) * (p.stock || 0),
        0
        );

        const nonCurrentAssetEntries = capital.filter((e) => e.sub_type === 'non_current')
        .concat(liabilities.filter(e => e.sub_type === 'other_payables'));

        const storeSetupValue = nonCurrentAssetEntries.reduce((sum, e) => sum + e.amount, 0);
        const totalCapital = capital.reduce((sum, e) => sum + e.amount, 0);
        const totalLiabilities = liabilities.reduce((sum, e) => sum + e.amount, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);

        const cogs = sales.reduce((sum, s) => {
        const product = products.find((p) => p.id === s.product_id);
        return sum + (product ? (product.cost || 0) * (s.quantity || 0) : 0);
        }, 0);

        const netProfit = totalSales - cogs - totalExpenses;
        const adjustedCapital = totalCapital + netProfit;

        return adjustedCapital + totalLiabilities - inventoryValue - storeSetupValue;
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        if (!userId) {
        alert("User not authenticated");
        return;
        }

        const parsedPrice = parseFloat(price);
        const parsedCost = parseFloat(cost);
        const parsedStock = parseInt(stock);

        if (parsedPrice < 0 || parsedCost < 0 || parsedStock < 0) {
        alert("Price, cost, or stock cannot be negative.");
        return;
        }

if (!name.trim()) {
  alert("Product name is required.");
  return;
}
if (parsedCost === 0 || parsedStock === 0) {
  alert("Cost and stock must be greater than zero.");
  return;
}


        const newTotalCost = parsedCost * parsedStock;
        const currentCash = computeCashBalance();

if (editingId) {
  // Fetch the current product from DB (authoritative)
  const { data: oldProductData, error: fetchOldError } = await supabase
    .from('products')
    .select('*')
    .eq('id', editingId)
    .single();

  if (fetchOldError) {
    console.error('Failed to fetch old product data:', fetchOldError);
    alert('Failed to fetch product data. Try again.');
    return;
  }

  const oldStock = Number(oldProductData.stock || 0);
  const oldCost = Number(oldProductData.cost || 0);
  const newStock = parsedStock;
  const newCostPerUnit = parsedCost;
  const stockDiff = newStock - oldStock; // positive if adding stock

  // Build change description for history (same as you had)
  const changes = [];
  if (oldProductData.name !== name) changes.push(`name: ${oldProductData.name} → ${name}`);
  if (oldProductData.price !== parsedPrice) changes.push(`price: ₱${oldProductData.price} → ₱${parsedPrice}`);
  if (oldProductData.cost !== parsedCost) changes.push(`cost: ₱${oldProductData.cost} → ₱${parsedCost}`);
  if (oldProductData.stock !== parsedStock) changes.push(`stock: ${oldProductData.stock} → ${parsedStock}`);
  const changeDescription = changes.join(', ');

  // If nothing changed, stop
  if (!changes.length) {
    alert("No changes were made.");
    resetForm();
    setShowForm(false);
    return;
  }

  // If we are increasing stock, ensure we have enough cash for the purchase of added units
  const additionalCost = stockDiff > 0 ? stockDiff * newCostPerUnit : 0;
  const currentCash = computeCashBalance();
  if (additionalCost > currentCash) {
    alert(`Insufficient funds to increase stock.\nNeeded: ₱${additionalCost.toFixed(2)} | Available: ₱${currentCash.toFixed(2)}`);
    return;
  }

  // Compute new weighted average cost only when stock increases
  let costToSave = oldCost;
  if (stockDiff > 0) {
    const oldTotalValue = oldStock * oldCost;
    const addedValue = stockDiff * newCostPerUnit;
    const updatedTotalValue = oldTotalValue + addedValue;
    const updatedStock = oldStock + stockDiff; // equals newStock
    costToSave = updatedStock > 0 ? updatedTotalValue / updatedStock : newCostPerUnit;
  } else {
    // if stock not increased, we will save the parsedCost (user explicitly changed cost)
    // NOTE: changing cost w/o stock change will change inventory valuation immediately.
    // If you don't want this behavior, comment the next line and keep oldCost instead.
    costToSave = parsedCost;
  }

  // Update product with new stock and averaged cost
  const { error: updateError } = await supabase
    .from('products')
    .update({
      name,
      price: parsedPrice,
      cost: Number(costToSave.toFixed(2)),
      stock: newStock,
    })
    .eq('id', editingId);

  if (updateError) {
    console.error('Failed to update product:', updateError);
    alert('Failed to update product.');
    return;
  }

  // Log change history
  await supabase.from('product_changes').insert([{
    user_id: userId,
    product_id: editingId,
    name,
    change_type: 'updated',
    change_description: changeDescription || null,
  }]);

  // If stock increased, insert balance_sheet entries (inventory ↑, cash ↓) by added value
  if (additionalCost > 0) {
    const nowIso = new Date().toISOString();
    await supabase.from('balance_sheet').insert([
      {
        user_id: userId,
        type: 'capital',
        sub_type: 'inventory',
        description: `Inventory Added (Edit) - ${name}`,
        amount: additionalCost,
        created_at: nowIso,
        system_generated: true
      },
      {
        user_id: userId,
        type: 'capital',
        sub_type: 'cash',
        description: `Cash Used for Inventory (Edit) - ${name}`,
        amount: -additionalCost,
        created_at: nowIso,
        system_generated: true
      }
    ]);
  }

  // UI updates
  highlightRow(editingId);
  fetchProducts();
  fetchEntries();
  resetForm();
  setShowForm(false);
}
else {
        if (newTotalCost > currentCash) {
            alert(`Insufficient funds. Available cash: ₱${currentCash.toFixed(2)}`);
            return;
        }

const { error: insertError } = await supabase.from('products').insert([{
  name,
  price: parsedPrice,
  cost: parsedCost,
  stock: parsedStock,
  user_id: userId,
  archived: false,
  created_at: new Date().toISOString()  // Add this line
}]);


        if (!insertError) {
await supabase.from('balance_sheet').insert([
  {
    user_id: userId,
    type: 'capital',
    sub_type: 'inventory',
    description: `Inventory Added - ${name}`,
    amount: newTotalCost,
    created_at: new Date().toISOString(),
    system_generated: true
  },
  {
    user_id: userId,
    type: 'capital',
    sub_type: 'cash',
    description: `Cash Used for Inventory - ${name}`,
    amount: -newTotalCost,
    created_at: new Date().toISOString(),
    system_generated: true
  }
]);

        }
        }

        resetForm();
        fetchProducts();
        fetchEntries();
        setShowForm(false);
    };

    const resetForm = () => {
        setName('');
        setPrice('');
        setCost('');
        setStock('');
        setEditingId(null);
    };

    const handleEdit = (product) => {
        setEditingId(product.id);
        setName(product.name);
        setPrice(product.price);
        setCost(product.cost);
        setStock(product.stock);
    };

   //handleSavevEdit
// Enforce cash check when editing (especially when increasing stock)
// handleSaveEdit — unified, robust weighted-average update logic
const handleSaveEdit = async () => {
  setIsEditingProduct(true);

  // 1) Fetch the authoritative old product from DB
  const { data: oldProductData, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', editingId)
    .single();

  if (fetchError) {
    console.error('Fetch failed:', fetchError.message);
    setIsEditingProduct(false);
    return;
  }

  // 2) Parse new values
  const parsedPrice = parseFloat(price);
  const parsedCost  = parseFloat(cost);
  const parsedStock = parseInt(stock);

  // 3) Build change description (for history)
  const changes = [];
  if (oldProductData.name !== name)  changes.push(`name: ${oldProductData.name} → ${name}`);
  if (oldProductData.price !== parsedPrice) changes.push(`price: ₱${oldProductData.price} → ₱${parsedPrice}`);
  if (oldProductData.cost !== parsedCost)   changes.push(`cost: ₱${oldProductData.cost} → ₱${parsedCost}`);
  if (oldProductData.stock !== parsedStock) changes.push(`stock: ${oldProductData.stock} → ${parsedStock}`);
  const changeDescription = changes.join(', ');

  // 4) Skip if nothing changed
  if (!changes.length) {
    alert("No changes were made.");
    setIsEditingProduct(false);
    return;
  }

  // 5) Compute how much extra cash is needed ONLY if stock increases
  const stockDiff = parsedStock - oldProductData.stock;
  const additionalCost = stockDiff > 0 ? stockDiff * parsedCost : 0;

  // 6) Check current available cash before updating
  const currentCash = computeCashBalance(); // uses current state (old product values)
  if (additionalCost > currentCash) {
    alert(`Insufficient funds to increase stock.\nNeeded: ₱${additionalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Available: ₱${currentCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    setIsEditingProduct(false);
    return;
  }

  // 7) Compute new cost using weighted-average if stock increased
  const oldStock = Number(oldProductData.stock || 0);
  const oldCost = Number(oldProductData.cost || 0);
  let costToSave = oldCost;

  if (stockDiff > 0) {
    const oldTotalValue = oldStock * oldCost;
    const addedValue = stockDiff * parsedCost;
    const updatedTotalValue = oldTotalValue + addedValue;
    const updatedStock = oldStock + stockDiff; // equals parsedStock
    costToSave = updatedStock > 0 ? updatedTotalValue / updatedStock : parsedCost;
  } else {
    // If stock did not increase, keep user's parsedCost (explicit override).
    // NOTE: changing cost without changing stock will change inventory valuation immediately.
    costToSave = parsedCost;
  }

  // 8) Proceed with product update (save averaged cost)
  const { error: updateError } = await supabase
    .from('products')
    .update({ name, price: parsedPrice, cost: Number(costToSave.toFixed(2)), stock: parsedStock })
    .eq('id', editingId);

  if (updateError) {
    console.error('Edit failed:', updateError.message);
    setIsEditingProduct(false);
    return;
  }

  // 9) Log to product history
  await supabase.from('product_changes').insert([{
    user_id: userId,
    product_id: editingId,
    name,
    change_type: 'updated',
    change_description: changeDescription || null,
  }]);

  // 10) If stock actually increased, reflect the purchase in balance_sheet (cash ↓ / inventory ↑)
  if (additionalCost > 0) {
    const nowIso = new Date().toISOString();
    await supabase.from('balance_sheet').insert([
      {
        user_id: userId,
        type: 'capital',
        sub_type: 'inventory',
        description: `Inventory Added (Edit) - ${name}`,
        amount: additionalCost,
        created_at: nowIso,
        system_generated: true
      },
      {
        user_id: userId,
        type: 'capital',
        sub_type: 'cash',
        description: `Cash Used for Inventory (Edit) - ${name}`,
        amount: -additionalCost,
        created_at: nowIso,
        system_generated: true
      }
    ]);
  }

  // 11) UI updates
  highlightRow(editingId);
  fetchProducts();
  fetchEntries();

  // 12) reset editing state
  setEditingId(null);
  setName('');
  setPrice('');
  setCost('');
  setStock('');
  setIsEditingProduct(false);
};


const handleArchive = async (id) => {
  const confirm = window.confirm("Are you sure you want to archive this product?");
  if (!confirm) return;

  // 🔍 Fetch product before archiving
  const { data: productData, error } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single();

  // ✅ Archive
  await supabase.from('products').update({ archived: true }).eq('id', id);

  // 📝 Log to product_changes
  await supabase.from('product_changes').insert([
    {
      user_id: userId,
      product_id: id,
      name: productData?.name || '[Unnamed Product]',
      change_type: 'archived',
    },
  ]);

  fetchProducts();
};



const handleReactivate = async (id) => {
  // 🔍 Fetch product name before reactivation
  const { data: productData } = await supabase
    .from('products')
    .select('name')
    .eq('id', id)
    .single();

  // ✅ Reactivate
  await supabase.from('products').update({ archived: false }).eq('id', id);

  // 📝 Log reactivation
  await supabase.from('product_changes').insert([
    {
      user_id: userId,
      product_id: id,
      name: productData?.name || '[Unnamed Product]',
      change_type: 'reactivated',
    },
  ]);

  fetchProducts();
};


// filteredProducts should be the array your table is currently showing after filters
const exportToExcel = (filteredProducts) => {
  // Prepare worksheet data
  const worksheetData = filteredProducts.map((p) => ({
    "Product Name": p.name,
    "Selling Price": p.price,
    "Unit Cost": p.cost,
    "Stock Quantity": p.stock,
    "Date": p.created_at,
  }));

  // Create worksheet & workbook
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  // Write workbook to binary
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // Save file
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, "products.xlsx");
};

    const activeProducts = products
  .filter(p => !p.archived)
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));


const filteredProducts = activeProducts.filter(p => {
  const matchName = nameFilter.length === 0 || nameFilter.includes(p.name);
  const matchPrice =
    (!priceRange.min || p.price >= parseFloat(priceRange.min)) &&
    (!priceRange.max || p.price <= parseFloat(priceRange.max));
  const matchCost =
    (!costRange.min || p.cost >= parseFloat(costRange.min)) &&
    (!costRange.max || p.cost <= parseFloat(costRange.max));
  const matchStock =
    (!stockRange.min || p.stock >= parseInt(stockRange.min)) &&
    (!stockRange.max || p.stock <= parseInt(stockRange.max));

  return matchName && matchPrice && matchCost && matchStock;
});


    const archivedProducts = products.filter(p => p.archived);

const fetchChangeHistory = async () => {
  const { data, error } = await supabase
    .from('product_changes')
    .select('*')
    .eq('user_id', userId)
    .order('changed_at', { ascending: false });

  if (!error) setChangeHistory(data);
};

// 1️⃣ Apply sorting AFTER filtering
const sortedProducts = React.useMemo(() => {
  let sortableItems = [...filteredProducts]; // filtered first

  if (sortConfig.key) {
    sortableItems.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "name") {
        aVal = aVal?.toLowerCase();
        bVal = bVal?.toLowerCase();
      }

      if (sortConfig.key === "created_at") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  return sortableItems;
}, [filteredProducts, sortConfig]);

// 2️⃣ THEN apply pagination
const indexOfLastItem = currentPage * itemsPerPage;
const indexOfFirstItem = indexOfLastItem - itemsPerPage;
const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem);



//handle add product only
const handleAddProductOnly = async (e) => {
  e.preventDefault();

  if (!userId) {
    alert("User not authenticated");
    return;
  }

  const parsedPrice = parseFloat(price);
  const parsedCost = parseFloat(cost);
  const parsedStock = parseInt(stock);

  if (parsedPrice < 0 || parsedCost < 0 || parsedStock < 0) {
    alert("Price, cost, or stock cannot be negative.");
    return;
  }

  if (!name.trim()) {
    alert("Product name is required.");
    return;
  }

  if (parsedCost === 0 || parsedStock === 0) {
    alert("Cost and stock must be greater than zero.");
    return;
  }

  const newTotalCost = parsedCost * parsedStock;
  const currentCash = computeCashBalance();

  if (newTotalCost > currentCash) {
    alert(`Insufficient funds. Available cash: ₱${currentCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    return;
  }

  setIsSaving(true);

  const { error: insertError } = await supabase.from('products').insert([{
    name,
    price: parsedPrice,
    cost: parsedCost,
    stock: parsedStock,
    user_id: userId,
    archived: false,
    created_at: new Date().toISOString()
  }]);

  if (insertError) {
    console.error('Error inserting product:', insertError.message);
    alert('Failed to add product.');
    setIsSaving(false);
    return;
  }

  await supabase.from('balance_sheet').insert([
    {
      user_id: userId,
      type: 'capital',
      sub_type: 'inventory',
      description: `Inventory Added - ${name}`,
      amount: newTotalCost,
      created_at: new Date().toISOString(),
      system_generated: true
    },
    {
      user_id: userId,
      type: 'capital',
      sub_type: 'cash',
      description: `Cash Used for Inventory - ${name}`,
      amount: -newTotalCost,
      created_at: new Date().toISOString(),
      system_generated: true
    }
  ]);

  // ✅ Show success message
  setSuccessMessage(`✅ Product "${name}" added successfully`);

  resetForm();
  fetchProducts();
  fetchEntries();
  setShowForm(false);
  setIsSaving(false);

  // Auto-hide after 3 seconds
  setTimeout(() => setSuccessMessage(''), 3000);
};


//Sorting feature
const handleSortKeyChange = (e) => {
  setSortConfig((prev) => ({
    ...prev,
    key: e.target.value || null
  }));
};

const toggleSortDirection = () => {
  setSortConfig((prev) => ({
    ...prev,
    direction: prev.direction === "asc" ? "desc" : "asc"
  }));
};

const clearSort = () => {
  setSortConfig({ key: null, direction: "asc" });
};


//Pagination For Archived
const indexOfLastArchived = archivedCurrentPage * itemsPerPageArchived;
const indexOfFirstArchived = indexOfLastArchived - itemsPerPageArchived;
const currentArchivedProducts = archivedProducts.slice(
  indexOfFirstArchived,
  indexOfLastArchived
);

const totalPagesArchived = Math.ceil(
  archivedProducts.length / itemsPerPageArchived
);


// Filter the full history data
const filteredHistory = changeHistory.filter((change) => {
  // Product filter
  const matchProduct =
    productFilter.length === 0 || productFilter.includes(change.name);

  // Date filter
  const changeDate = dayjs(change.changed_at);
const matchDate =
  (!dateRange.from || changeDate.isSameOrAfter(dayjs(dateRange.from).startOf('day'))) &&
  (!dateRange.to || changeDate.isSameOrBefore(dayjs(dateRange.to).endOf('day')));


  return matchProduct && matchDate;
});

const totalPagesHistoryFiltered = Math.ceil(
  filteredHistory.length / itemsPerPageHistory
);

// For history modal pagination
const indexOfLastHistoryItem = historyCurrentPage * itemsPerPageHistory;
const indexOfFirstHistoryItem = indexOfLastHistoryItem - itemsPerPageHistory;
const currentHistoryPage = filteredHistory.slice(indexOfFirstHistoryItem, indexOfLastHistoryItem);


// Function to close and reset History page
const closeHistoryModal = () => {
  setShowHistoryModal(false);
  setHistoryCurrentPage(1); // reset to first page
};

//Highlighting newly added product
const isNewProduct = (createdAt) => {
  return dayjs().diff(dayjs(createdAt), "second") < 150; // less than 2 min 30 sec old
};

//a helper to highlight a row temporarily
const highlightRow = (productId) => {
  setHighlightedRows((prev) => [...prev, productId]);

  // Remove highlight after 3 seconds
  setTimeout(() => {
    setHighlightedRows((prev) => prev.filter((id) => id !== productId));
  }, 3000); // 3000 ms = 3seconds
};





return (  
  <div className="min-h-screen bg-gray-50 font-sans">
    <Navbar />

    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Action Buttons */}
      <div className="mb-2 text-right">

<button
  onClick={() => {
    const confirmExport = window.confirm("Export the products to Excel?");
    if (confirmExport) {
      exportToExcel(filteredProducts); // Pass the filtered list, not all products
    }
  }}
  className="text-green-600 hover:underline text-sm ml-3"
>
  Export Excel
</button>


      </div>

      {/* Available Cash */}
      <p className="text-right mb-4 text-gray-700">
        Available Cash: <strong>₱{computeCashBalance().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </p>

      {/* Form */}
      {showForm && (
   <form onSubmit={handleAddProductOnly} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">Product Name</label>
    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Product Name" className="border border-gray-300 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
  </div>

  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">Selling Price</label>
    <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" required placeholder="Price" className="border border-gray-300 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
  </div>

  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">Unit Cost</label>
    <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} step="0.01" required placeholder="Cost" className="border border-gray-300 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
  </div>

  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required placeholder="Stock" className="border border-gray-300 p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
  </div>

<button
  type="submit"
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm transition disabled:opacity-50"
  disabled={isSaving}
>
  {isSaving ? 'Saving...' : 'Add Product'}
</button>

</form>

      )}

      {/* Active Products Table */}
    
<div className="flex justify-center my-6">
  <button
    onClick={() => {
      if (showForm) resetForm();
setShowForm(!showForm);
    }}
    className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-all duration-200"
  >
    {showForm ? 'Cancel' : '➕ Add Product'}
  </button>

  
</div>

{
  (
    nameFilter.length > 0 ||
    priceRange.min ||
    priceRange.max ||
    costRange.min ||
    costRange.max ||
    stockRange.min ||
    stockRange.max
  ) && (
    <div className="mb-4 flex justify-between items-center">
      <div className="text-sm text-gray-600">
        Active filters:
        {nameFilter.length > 0 && <span className="ml-1">Name</span>}
        {(priceRange.min || priceRange.max) && <span className="ml-1">| Price</span>}
        {(costRange.min || costRange.max) && <span className="ml-1">| Cost</span>}
        {(stockRange.min || stockRange.max) && <span className="ml-1">| Stock</span>}
      </div>
      <button
        onClick={() => {
          setNameFilter([]);
          setPriceRange({ min: '', max: '' });
          setCostRange({ min: '', max: '' });
          setStockRange({ min: '', max: '' });
          setTempNameFilter([]);
          setTempPriceRange({ min: '', max: '' });
          setTempCostRange({ min: '', max: '' });
          setTempStockRange({ min: '', max: '' });
          setCurrentPage(1);
        }}
        className="text-xs text-blue-600 hover:underline"
      >
        ✖ Clear All Filters
      </button>
    </div>
  )
}

      {successMessage && (
  <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded mb-4">
    {successMessage}
  </div>
)}


      <h2 className="text-lg font-semibold mb-3">Active Products</h2>
      
<div className="flex items-center space-x-3 mb-4">
  <label className="text-sm font-medium">Sort By:</label>

  <select
    value={sortConfig.key || ""}
    onChange={handleSortKeyChange}
    className="border rounded px-2 py-1 text-sm"
  >
    <option value="">-- None --</option>
    <option value="name">Name</option>
    <option value="price">Price</option>
    <option value="cost">Cost</option>
    <option value="stock">Stock</option>
    <option value="created_at">Created At</option>
  </select>

  <button
    onClick={toggleSortDirection}
    disabled={!sortConfig.key}
    className="border rounded px-2 py-1 text-sm disabled:opacity-50"
  >
    {sortConfig.direction === "asc" ? "▲ Asc" : "▼ Desc"}
  </button>

  <button
    onClick={clearSort}
    className="text-sm text-gray-600 hover:underline"
  >
    Clear
  </button>
</div>



      <div className={isFilterOpen ? 'overflow-visible' : 'overflow-x-auto'}>
      <table className="w-full text-left text-sm min-w-[600px]">
      <thead className="bg-gray-100 text-gray-700 ">
        <tr>
<th className="text-left p-2 relative">
  Name
  <button
    onClick={() => {
      setNameFilterDropdown(!nameFilterDropdown);
      setIsFilterOpen(!nameFilterDropdown);
    }}
    className="ml-1 text-xs"
  >
    {nameFilterDropdown ? '▲' : '▼'}
  </button>

  {nameFilterDropdown && (
    <div className="absolute z-10 bg-white border rounded p-2 shadow-md mt-2 w-48">
      {/* Scrollable filter list */}
      <div className="max-h-48 overflow-y-auto pr-1">
      {[...new Set(activeProducts.map(p => p.name))]
        .sort((a, b) => a.localeCompare(b))  // <-- Sort alphabetically
        .map((name, idx) => (
          <label key={idx} className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={tempNameFilter.includes(name)}
              onChange={() => {
                if (tempNameFilter.includes(name)) {
                  setTempNameFilter(tempNameFilter.filter(n => n !== name));
                } else {
                  setTempNameFilter([...tempNameFilter, name]);
                }
              }}
            />
            <span>{name}</span>
          </label>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex justify-between"> 
        <button
          onClick={() => {
            setTempNameFilter([]);
            setNameFilter([]);
            setNameFilterDropdown(false);
            setCurrentPage(1);
            setIsFilterOpen(false);
          }}
          className="text-xs text-gray-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={() => {
            setNameFilter(tempNameFilter);
            setNameFilterDropdown(false);
            setCurrentPage(1);
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



<th className="text-left p-2 relative">
  Price
  <button onClick={() => {
    setShowPriceDropdown(!showPriceDropdown);
    setIsFilterOpen(!showPriceDropdown);
  }} className="ml-1 text-xs">
    {showPriceDropdown ? '▲' : '▼'}
  </button>
  {showPriceDropdown && (
    <div className="absolute bg-white border rounded p-2 shadow-md mt-2 w-48">
      <input
        type="number"
        placeholder="Min"
        value={tempPriceRange.min}
        onChange={(e) => setTempPriceRange({ ...tempPriceRange, min: e.target.value })}
        className="mb-2 w-full border rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        placeholder="Max"
        value={tempPriceRange.max}
        onChange={(e) => setTempPriceRange({ ...tempPriceRange, max: e.target.value })}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <div className="mt-2 flex justify-between">        
        <button
          onClick={() => {
            setPriceRange({ min: '', max: '' });
            setTempPriceRange({ min: '', max: '' });
            setShowPriceDropdown(false);
            setCurrentPage(1);
            setIsFilterOpen(false);
          }}
          className="text-xs text-gray-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={() => {
            setPriceRange(tempPriceRange);
            setShowPriceDropdown(false);
            setCurrentPage(1);
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



<th className="text-left p-2 relative">
  Cost
  <button onClick={() => {
    setShowCostDropdown(!showCostDropdown);
    setIsFilterOpen(!showCostDropdown);
  }} className="ml-1 text-xs">
    {showCostDropdown ? '▲' : '▼'}
  </button>
  {showCostDropdown && (
    <div className="absolute z-10 bg-white border rounded p-2 shadow-md mt-2 w-48">
      <input
        type="number"
        placeholder="Min"
        value={tempCostRange.min}
        onChange={(e) => setTempCostRange({ ...tempCostRange, min: e.target.value })}
        className="mb-2 w-full border rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        placeholder="Max"
        value={tempCostRange.max}
        onChange={(e) => setTempCostRange({ ...tempCostRange, max: e.target.value })}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <div className="mt-2 flex justify-between">        
        <button
          onClick={() => {
            setCostRange({ min: '', max: '' });
            setTempCostRange({ min: '', max: '' });
            setShowCostDropdown(false);
            setCurrentPage(1);
            setIsFilterOpen(false);
          }}
          className="text-xs text-gray-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={() => {
            setCostRange(tempCostRange);
            setShowCostDropdown(false);
            setCurrentPage(1);
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


<th className="text-left p-2 relative">
  Stock
  <button onClick={() => {
    setShowStockDropdown(!showStockDropdown);
    setIsFilterOpen(!showStockDropdown);
  }} className="ml-1 text-xs">
    {showStockDropdown ? '▲' : '▼'}
  </button>
  {showStockDropdown && (
    <div className="absolute z-10 bg-white border rounded p-2 shadow-md mt-2 w-48">
      <input
        type="number"
        placeholder="Min"
        value={tempStockRange.min}
        onChange={(e) => setTempStockRange({ ...tempStockRange, min: e.target.value })}
        className="mb-2 w-full border rounded px-2 py-1 text-sm"
      />
      <input
        type="number"
        placeholder="Max"
        value={tempStockRange.max}
        onChange={(e) => setTempStockRange({ ...tempStockRange, max: e.target.value })}
        className="w-full border rounded px-2 py-1 text-sm"
      />
      <div className="mt-2 flex justify-between">       
         <button
          onClick={() => {
            setStockRange({ min: '', max: '' });
            setTempStockRange({ min: '', max: '' });
            setShowStockDropdown(false);
            setCurrentPage(1);
            setIsFilterOpen(false);
          }}
          className="text-xs text-gray-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={() => {
            setStockRange(tempStockRange);
            setShowStockDropdown(false);
            setCurrentPage(1);
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


          <th className="text-left p-2 relative w-48">Date Added</th>
          <th className="text-left p-2 relative w-48">Actions <> </>
                    <button
          onClick={() => {
            fetchChangeHistory();
            setShowHistoryModal(true);
          }}
          className="text-xs text-orange-600 hover:underline font-semibold"
        >
          [History]
        </button>
          </th>
        </tr>
      </thead>
      
                  <tbody>
        {currentProducts.map((p) => (

      
            <tr
    key={p.id}
    className={`border-t hover:bg-gray-50 transition ${
      isNewProduct(p.created_at) ? "bg-green-100" : ""
    }${highlightedRows.includes(p.id) ? "bg-yellow-100" : ""}`}
  >

              {editingId === p.id ? (
                <>
                  <td className="p-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      className="border p-1 w-full"
                    />
                  </td>
                  
                  <td className="p-2">
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="border p-1 w-full"
                    />
                  </td>
                  <td className="p-2 space-x-2">
  <button
    onClick={handleSaveEdit}
    disabled={isEditingProduct}
    className={`px-2 py-1 rounded ${
      isEditingProduct
        ? 'bg-gray-400 cursor-not-allowed'
        : 'bg-blue-600 hover:bg-blue-700 text-white'
    }`}
  >
    {isEditingProduct ? 'Saving...' : 'Save'}
  </button>

                    <button
                      onClick={resetForm}
                      className="bg-gray-400 text-white px-1 py-1 rounded text-sm"
                    >
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="p-2">
          {p.name}
          {recentlyUpdatedProductIds.includes(p.id) && (
            <span title="Recently Updated" className="ml-1 text-yellow-500">✏️</span>
          )}
        </td>
        
                <td className="p-2">₱{Number(p.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-2">₱{Number(p.cost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>

                  <td className={`p-2 ${p.stock < 6 ? 'text-red-600 font-semibold' : ''}`}>
    {p.stock}
  </td>
                  <td className="p-2">{dayjs(p.created_at).format("MMM D, YYYY h:mm A")}</td>
        
                  <td className="p-2 space-x-2">
        <button
          onClick={() => handleEdit(p)}
          className="text-blue-500"
          disabled={editingId !== null}
        >
          Edit
        </button>
        <button
          onClick={() => handleArchive(p.id)}
          className="text-red-500"
          disabled={editingId !== null}
        >
          Archive
        </button>
        
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>  
        
                </table>
      </div>

  {filteredProducts.length > 15 && (
    <div className="flex justify-center items-center mt-4 gap-2">
      <button
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        ◀ Prev
      </button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {Math.ceil(filteredProducts.length / itemsPerPage)}
      </span>
      <button
        onClick={() =>
          setCurrentPage((prev) =>
            prev < Math.ceil(filteredProducts.length / itemsPerPage) ? prev + 1 : prev
          )
        }
        disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
        className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
      >
        Next ▶
      </button>
    </div>
  )}


  {/* Archived Products Table */}
      {archivedProducts.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-3 my-8">
            <h2 className="text-lg font-semibold">Archived Products</h2>
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showArchived ? 'Hide' : 'Show'}
            </button>
          </div>
          {showArchived && (
            <>
              <div className={isFilterOpen ? 'overflow-visible' : 'overflow-x-auto'}>
              <table className="w-full text-left text-sm min-w-[600px]">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="text-left p-2 my-8">Name</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentArchivedProducts.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t hover:bg-gray-50 transition"
                    >
                      <td className="p-2">{p.name}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleReactivate(p.id)}
                          className="text-green-500"
                        >
                          Reactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {/* Pagination Controls */}
              {archivedProducts.length > itemsPerPageArchived && (
                <div className="flex justify-center items-center mt-4 gap-2">
                  <button
                    onClick={() =>
                      setArchivedCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={archivedCurrentPage === 1}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                  >
                    ◀ Prev
                  </button>

                  <span className="text-sm text-gray-700">
                    Page {archivedCurrentPage} of {totalPagesArchived}
                  </span>

                  <button
                    onClick={() =>
                      setArchivedCurrentPage((prev) =>
                        prev < totalPagesArchived ? prev + 1 : prev
                      )
                    }
                    disabled={archivedCurrentPage === totalPagesArchived}
                    className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                  >
                    Next ▶
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      </div>

  {/* Modal */}
  {showHistoryModal && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit History</h2>
          <button
            className="text-red-600"
            onClick={closeHistoryModal}
          >
            Close
          </button>
        </div>


  {/* Active Filters Display */}
  {(productFilter.length > 0 || dateRange.from || dateRange.to) && (
    <div className="mb-2 flex justify-between items-center">
      <div className="text-sm text-gray-600">
        Active filters:
        {productFilter.length > 0 && <span className="ml-1">Product</span>}
        {(dateRange.from || dateRange.to) && <span className="ml-1">| Date</span>}
      </div>
      <button
        onClick={() => {
          // Reset all history filters
          setProductFilter([]);
          setTempProductFilter([]);
          setDateRange({ from: '', to: '' });
          setTempDateRange({ from: '', to: '' });
          setHistoryCurrentPage(1); // Reset to first page
        }}
        className="text-xs text-blue-600 hover:underline"
      >
        ✖ Clear All Filters
      </button>
    </div>
  )}


        <table className="w-full text-sm border">
          <thead className="bg-gray-100 text-sm text-gray-700 uppercase tracking-wide">
            <tr>
              <th className="py-2 px-3 relative w-32">
    Product
    <button
      onClick={() => {
        setTempProductFilter(productFilter);
        setShowProductFilter(!showProductFilter);
      }}
      className="ml-2 text-gray-600"
    >
      {showProductFilter ? '▲' : '▼'}
    </button>

    {showProductFilter && (
      <div className="absolute z-10 bg-white border rounded p-2 shadow-md mt-1 w-48">
        <div className="max-h-48 overflow-y-auto pr-1">
  {[...new Set(changeHistory.map((c) => c.name))].sort((a, b) => a.localeCompare(b)).map((name, idx) => (
    <label key={idx} className="flex items-center space-x-2 text-sm">
      <input
        type="checkbox"
        checked={tempProductFilter.includes(name)}
        onChange={() => {
          if (tempProductFilter.includes(name)) {
            setTempProductFilter(tempProductFilter.filter(n => n !== name));
          } else {
            setTempProductFilter([...tempProductFilter, name]);
          }
        }}
      />
      <span>{name}</span>
    </label>
  ))}
        </div>

        <div className="mt-2 flex justify-between">
          <button
            onClick={() => {
              setTempProductFilter([]);
              setProductFilter([]);
              setShowProductFilter(false);
              setHistoryCurrentPage(1);
            }}
            className="text-xs text-gray-600 hover:underline"
          >
            Clear
          </button>
          <button
            onClick={() => {
              setProductFilter(tempProductFilter);
              setShowProductFilter(false);
              setHistoryCurrentPage(1);
            }}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Apply
          </button>
        </div>
      </div>
    )}
  </th>

              <th className="text-left p-2">Change Type</th>
              <th className="text-left p-2">Description</th>
            <th className="py-2 px-3 relative w-48">
    Date
    <button
      onClick={() => {
        setTempDateRange(dateRange);
        setShowDateFilter(!showDateFilter);
      }}
      className="ml-2 text-gray-600"
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
            onChange={(e) => setTempDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="border p-1 rounded"
          />
          <input
            type="date"
            value={tempDateRange.to}
            onChange={(e) => setTempDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="border p-1 rounded"
          />
          <div className="flex justify-between mt-2">
            <button
              onClick={() => {
                setTempDateRange({ from: '', to: '' });
                setDateRange({ from: '', to: '' });
                setShowDateFilter(false);
                setHistoryCurrentPage(1);
              }}
              className="text-xs text-gray-600 hover:underline"
            >
              Clear
            </button>
            <button
              onClick={() => {
                setDateRange(tempDateRange);
                setShowDateFilter(false);
                setHistoryCurrentPage(1);
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

            </tr>
          </thead>
  <tbody>
  {currentHistoryPage.map((change) => (
    <tr key={change.id} className="border-t">
      <td className="p-2">{change.name}</td>
      <td className="p-2 capitalize">{change.change_type}</td>
      <td className="p-2 text-gray-700 whitespace-pre-wrap">
        {change.change_description || '—'}
      </td>
      <td className="p-2 text-gray-600">
        {dayjs(change.changed_at).format("MMM D, YYYY h:mm A")}
      </td>
    </tr>
  ))}

  </tbody>

        </table>

        {/* Pagination Controls */}
        {changeHistory.length > itemsPerPageHistory && (
          <div className="flex justify-center items-center mt-4 gap-2">
            <button
              onClick={() =>
                setHistoryCurrentPage((prev) => Math.max(prev - 1, 1))
              }
              disabled={historyCurrentPage === 1}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              ◀ Prev
            </button>


            <span className="text-sm text-gray-700">
              Page {historyCurrentPage} of {totalPagesHistoryFiltered}
            </span>

            <button
              onClick={() =>
                setHistoryCurrentPage((prev) =>
                  prev < totalPagesHistoryFiltered ? prev + 1 : prev
                )
              }
              disabled={historyCurrentPage === totalPagesHistoryFiltered}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next ▶
            </button>
          </div>
        )}
      </div>
    </div>
  )}


    </div>
  );

      }

      export default Products;
