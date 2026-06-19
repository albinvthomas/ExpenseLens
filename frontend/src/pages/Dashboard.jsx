import React, { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/client';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  
  // Real data state
  const [budgetSummary, setBudgetSummary] = useState({
    balance: 0,
    income: 0,
    expenses: 0,
    savings: 0
  });
  
  const [categoryData, setCategoryData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [noBudgetAlert, setNoBudgetAlert] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch Analytics
        const analyticsRes = await apiClient.get('/analytics/dashboard');
        
        if (analyticsRes.data.error) {
          // No budget set for this month
          setNoBudgetAlert(true);
        } else {
          const d = analyticsRes.data;
          setBudgetSummary({
            balance: d.summary.remaining,
            income: d.budget.income,
            expenses: d.summary.total_spent,
            savings: d.summary.savings_progress
          });
          setCategoryData(d.category_data || []);
        }

        // Fetch Recent Transactions
        const txRes = await apiClient.get('/transactions/');
        // Sort by date descending and grab top 5
        const sortedTxs = txRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        setRecentTransactions(sortedTxs);
        
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate percentages for the category breakdown
  const totalAllocated = categoryData.reduce((acc, cat) => acc + cat.allocated, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto mt-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
            <p className="text-gray-400 text-lg">Welcome back, <span className="text-green-400">{user.email}</span>!</p>
          </div>
          <button className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg shadow-green-500/20">
            + Add Transaction
          </button>
        </div>

        {noBudgetAlert && (
          <div className="bg-blue-500/20 border border-blue-500 text-blue-300 p-4 mb-8 rounded-lg">
            <strong>Welcome to your new dashboard!</strong> It looks like you haven't set up a budget for this month yet. Set one up to start tracking your expenses properly.
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Remaining Balance</p>
            <h3 className="text-3xl font-bold text-white">{loading ? '...' : formatCurrency(budgetSummary.balance)}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Monthly Income</p>
            <h3 className="text-3xl font-bold text-white">{loading ? '...' : formatCurrency(budgetSummary.income)}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Spent</p>
            <h3 className="text-3xl font-bold text-white">{loading ? '...' : formatCurrency(budgetSummary.expenses)}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Savings Progress</p>
            <h3 className="text-3xl font-bold text-white">{loading ? '...' : formatCurrency(budgetSummary.savings)}</h3>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Transactions Table */}
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <button className="text-sm text-green-400 hover:text-green-300 font-medium transition">View All</button>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-900/50 text-gray-400 text-sm uppercase tracking-wider">
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        No recent transactions found. Add one above!
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-gray-700/30 transition group">
                        <td className="p-4">
                          <p className="text-white font-medium group-hover:text-green-300 transition">{tx.description}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">
                            {tx.category?.name || "Uncategorized"}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">{formatDate(tx.date)}</td>
                        <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Expense Breakdown</h2>
            
            <div className="space-y-6">
              {categoryData.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No spending data available yet.</p>
              ) : (
                categoryData.slice(0, 5).map((cat, idx) => {
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'];
                  const color = colors[idx % colors.length];
                  const percentage = totalAllocated > 0 ? Math.min(100, Math.round((cat.spent / totalAllocated) * 100)) : 0;
                  
                  return (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300">{cat.category}</span>
                        <span className="text-white font-bold">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div className={`${color} h-2 rounded-full`} style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400 mb-4">Need detailed insights?</p>
              <button className="w-full border border-gray-600 hover:border-gray-400 text-white rounded-lg py-2.5 transition font-medium">
                View Full Analytics
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
