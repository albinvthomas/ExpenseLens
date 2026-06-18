import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between items-center shadow-md">
      <Link to="/" className="text-xl font-bold tracking-wider text-green-400">ExpenseLens</Link>
      <div className="flex gap-4 items-center">
        {user ? (
          <>
            <Link to="/dashboard" className="hover:text-green-300 transition">Dashboard</Link>
            <Link to="/transactions" className="hover:text-green-300 transition">Transactions</Link>
            <Link to="/analytics" className="hover:text-green-300 transition">Analytics</Link>
            <Link to="/budget" className="hover:text-green-300 transition">Budget</Link>
            <span className="text-gray-400 text-sm border-l border-gray-600 pl-4"> {user.email}</span>
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-green-300 transition">Login</Link>
            <Link to="/signup" className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded font-medium transition shadow">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
