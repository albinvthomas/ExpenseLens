import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  // Placeholder data to make the dashboard look alive
  const summary = {
    balance: "$12,450.00",
    income: "$8,200.00",
    expenses: "$3,450.00",
    savings: "$4,750.00"
  };

  const recentTransactions = [
    { id: 1, desc: 'Whole Foods Market', category: 'Groceries', date: 'Oct 24, 2026', amount: '-$120.50', type: 'expense' },
    { id: 2, desc: 'TechCorp Salary', category: 'Income', date: 'Oct 23, 2026', amount: '+$4,100.00', type: 'income' },
    { id: 3, desc: 'Netflix Subscription', category: 'Entertainment', date: 'Oct 21, 2026', amount: '-$15.99', type: 'expense' },
    { id: 4, desc: 'Uber Ride', category: 'Transport', date: 'Oct 20, 2026', amount: '-$24.00', type: 'expense' },
    { id: 5, desc: 'Starbucks', category: 'Dining', date: 'Oct 19, 2026', amount: '-$5.50', type: 'expense' }
  ];

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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Balance</p>
            <h3 className="text-3xl font-bold text-white">{summary.balance}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Monthly Income</p>
            <h3 className="text-3xl font-bold text-white">{summary.income}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 to-red-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Monthly Expenses</p>
            <h3 className="text-3xl font-bold text-white">{summary.expenses}</h3>
          </div>
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl relative overflow-hidden group hover:border-gray-600 transition">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Savings</p>
            <h3 className="text-3xl font-bold text-white">{summary.savings}</h3>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Transactions Table (Takes up 2 columns on large screens) */}
          <div className="lg:col-span-2 bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
              <button className="text-sm text-green-400 hover:text-green-300 font-medium transition">View All</button>
            </div>
            <div className="p-0">
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
                  {recentTransactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-700/30 transition group">
                      <td className="p-4">
                        <p className="text-white font-medium group-hover:text-green-300 transition">{tx.desc}</p>
                      </td>
                      <td className="p-4">
                        <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full">{tx.category}</span>
                      </td>
                      <td className="p-4 text-gray-400 text-sm">{tx.date}</td>
                      <td className={`p-4 text-right font-bold ${tx.type === 'income' ? 'text-green-400' : 'text-white'}`}>
                        {tx.amount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats / Charts Area */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Expense Breakdown</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Housing</span>
                  <span className="text-white font-bold">45%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Food & Groceries</span>
                  <span className="text-white font-bold">25%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '25%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Transportation</span>
                  <span className="text-white font-bold">15%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-300">Entertainment</span>
                  <span className="text-white font-bold">10%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
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
