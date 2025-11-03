import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Menu, X } from 'lucide-react'; // icons

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const linkClasses = (path) =>
    `block py-2 px-3 text-sm rounded ${
      location.pathname === path
        ? 'text-blue-600 font-semibold underline'
        : 'text-gray-700 hover:text-blue-600'
    }`;
return (
  <nav className="bg-white shadow mb-6 px-4 py-3">
    <div className="flex items-center w-full">
      {/* Logo + Menu (left) */}
      <div className="flex items-center space-x-[1]">
        <img src="/store logo.png" alt="Store Logo" className="w-14 h-14" />
        <div className="hidden md:flex space-x-1 items-center">
          <Link to="/dashboard" className={linkClasses('/dashboard')}>Dashboard</Link>
          <Link to="/products" className={linkClasses('/products')}>Products</Link>
          <Link to="/sales" className={linkClasses('/sales')}>Sales</Link>
          <Link to="/expenses" className={linkClasses('/expenses')}>Expenses</Link>
          <Link to="/income-statement" className={linkClasses('/income-statement')}>Income Statement</Link>
          <Link to="/balance-sheet" className={linkClasses('/balance-sheet')}>Balance Sheet</Link>
        </div>
      </div>

      {/* Logout (right side) */}
      <div className="hidden md:block ml-auto">
        <button
          onClick={handleLogout}
          className="text-sm text-gray-600 hover:underline mr-10"
        >
          Logout
        </button>
      </div>

      {/* Mobile Hamburger */}
      <div className="ml-auto md:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-700"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
    </div>

    {/* Mobile Dropdown */}
    {isOpen && (
      <div className="mt-3 space-y-1 md:hidden">
        <Link to="/dashboard" className={linkClasses('/dashboard')} onClick={() => setIsOpen(false)}>Dashboard</Link>
        <Link to="/products" className={linkClasses('/products')} onClick={() => setIsOpen(false)}>Products</Link>
        <Link to="/sales" className={linkClasses('/sales')} onClick={() => setIsOpen(false)}>Sales</Link>
        <Link to="/expenses" className={linkClasses('/expenses')} onClick={() => setIsOpen(false)}>Expenses</Link>
        <Link to="/income-statement" className={linkClasses('/income-statement')} onClick={() => setIsOpen(false)}>Income Statement</Link>
        <Link to="/balance-sheet" className={linkClasses('/balance-sheet')} onClick={() => setIsOpen(false)}>Balance Sheet</Link>
        <button
          onClick={() => {
            setIsOpen(false);
            handleLogout();
          }}
          className="block w-full text-left py-2 px-3 text-sm text-gray-600 hover:underline"
        >
          Logout
        </button>
      </div>
    )}
  </nav>
);


}

export default Navbar;
