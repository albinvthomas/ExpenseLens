import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto mt-10">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-green-400">Welcome, {user.email}!</h2>
          <p className="text-gray-300">
            You have successfully logged in. This is your protected dashboard. 
            From here, you will be able to manage your categories, budgets, and transactions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
