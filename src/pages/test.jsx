return (
  <div className="min-h-screen bg-gray-50">
    <Navbar />

    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Products</h1>

      {/* Action Buttons */}
      <div className="mb-4">
        <button
          onClick={() => {
            if (!showForm) resetForm();
            setShowForm(!showForm);
          }}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {showForm ? 'Cancel' : 'Add Product'}
        </button>

        <button
          onClick={() => {
            fetchChangeHistory();
            setShowHistoryModal(true);
          }}
          className="ml-2 bg-purple-500 text-white px-4 py-2 rounded"
        >
          Change History
        </button>

        <button
          onClick={exportToCSV}
          className="ml-2 bg-green-500 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* Available Cash */}
      <p className="text-right mb-4 text-gray-700">
        Available Cash: <strong>₱{computeCashBalance().toFixed(2)}</strong>
      </p>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleAddOrUpdate}
          className="mb-6 grid grid-cols-2 gap-4 bg-white p-4 rounded shadow"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product Name"
            required
            className="border p-2"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price"
            step="0.01"
            required
            className="border p-2"
          />
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Cost"
            step="0.01"
            required
            className="border p-2"
          />
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="Stock"
            required
            className="border p-2"
          />
          <button type="submit" className="col-span-2 bg-blue-600 text-white py-2 rounded">
            {editingId ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      )}

      {/* Active Products Table */}
      <h2 className="text-xl font-semibold mb-2">Active Products</h2>
      <table className="w-full mb-8 bg-white shadow rounded">
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left p-2">
            Name<br />
            <select
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="border px-1 py-0.5 text-sm w-full"
            >
              <option value="">All</option>
              {[...new Set(activeProducts.map(p => p.name))].map((name, index) => (
                <option key={index} value={name}>{name}</option>
              ))}
            </select>
          </th>
          <th className="text-left p-2">
            Price<br />
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value)}
              className="border px-1 py-0.5 text-sm w-full"
            >
              <option value="">All</option>
              {[...new Set(activeProducts.map(p => p.price))].map((price, index) => (
                <option key={index} value={price}>{price}</option>
              ))}
            </select>
          </th>
          <th className="text-left p-2">
            Cost<br />
            <select
              value={costFilter}
              onChange={(e) => setCostFilter(e.target.value)}
              className="border px-1 py-0.5 text-sm w-full"
            >
              <option value="">All</option>
              {[...new Set(activeProducts.map(p => p.cost))].map((cost, index) => (
                <option key={index} value={cost}>{cost}</option>
              ))}
            </select>
          </th>
          <th className="text-left p-2">
            Stock<br />
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="border px-1 py-0.5 text-sm w-full"
            >
              <option value="">All</option>
              {[...new Set(activeProducts.map(p => p.stock))].map((stock, index) => (
                <option key={index} value={stock}>{stock}</option>
              ))}
            </select>
          </th>
          <th className="text-left p-2">Created At</th>
          <th className="text-left p-2">Actions</th>
        </tr>
      </thead>
      
      
                  <tbody>
        {filteredProducts.map((p) => (
      
          <tr key={p.id} className="border-t">
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
                    onClick={(e) => handleAddOrUpdate(e)}
                    className="text-green-600 font-semibold"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetForm}
                    className="text-gray-500"
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
      
                <td className="p-2">₱{p.price}</td>
                <td className="p-2">₱{p.cost}</td>
                <td className="p-2">{p.stock}</td>
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

      {/* Archived Products Table */}
      <h2 className="text-xl font-semibold mb-2 mt-6">Archived Products</h2>
      <table className="w-full bg-white shadow rounded">
            <thead className="bg-gray-200">
            <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Actions</th>
            </tr>
            </thead>
            <tbody>
            {archivedProducts.map((p) => (
                <tr key={p.id} className="border-t">
                <td className="p-2">{p.name}</td>
                <td className="p-2">
                    <button onClick={() => handleReactivate(p.id)} className="text-green-500">Reactivate</button>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
    </div>

    {/* Modal */}
    {showHistoryModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Change History</h2>
            <button
              className="text-red-600"
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </button>
          </div>

          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Change Type</th>
                <th className="text-left p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {changeHistory.map((change) => (
                <tr key={change.id} className="border-t">
                  <td className="p-2">{change.name}</td>
                  <td className="p-2 capitalize">{change.change_type}</td>
                  <td className="p-2 text-gray-600">
                    {dayjs(change.changed_at).format("MMM D, YYYY h:mm A")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </div>
);
