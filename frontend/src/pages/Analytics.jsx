import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658', '#a4de6c', '#d0ed57', '#8dd1e1'];

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    fetchAnalytics(selectedPeriod);
  }, [selectedPeriod]);

  const fetchAnalytics = async (period) => {
    setLoading(true);
    try {
      const [year, month] = period.split('-');
      const res = await apiClient.get(`/analytics/dashboard?month=${parseInt(month)}&year=${parseInt(year)}`);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        setData(res.data);
        setError(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) return <div className="p-8 text-white text-center">Loading Analytics...</div>;
  if (error) return <div className="p-8 text-red-400 text-center">{error}</div>;
  if (!data) return null;

  const { budget, summary, category_data, trend_data } = data;

  // Filter out empty categories for Pie chart
  const pieData = category_data ? category_data.filter(c => c.spent > 0) : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-green-400">Analytics Dashboard</h1>
          <input 
            type="month" 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white px-4 py-2 rounded focus:outline-none focus:border-green-500"
          />
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-400 p-4 rounded mb-6 border border-red-500/50">
            {error}
          </div>
        )}
        
        {data && !error && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-gray-400 font-medium mb-1">Effective Available</h3>
            <p className="text-3xl font-bold text-white">{formatCurrency(budget.effective_available)}</p>
            {budget.deficit_carried > 0 && (
              <p className="text-xs text-red-400 mt-2">Reduced by {formatCurrency(budget.deficit_carried)} from previous month's deficit.</p>
            )}
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-gray-400 font-medium mb-1">Total Spent</h3>
            <p className="text-3xl font-bold text-red-400">{formatCurrency(summary.total_spent)}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-gray-400 font-medium mb-1">Remaining Budget</h3>
            <p className={`text-3xl font-bold ${summary.remaining < 0 ? 'text-red-500' : 'text-green-400'}`}>
              {formatCurrency(summary.remaining)}
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-gray-400 font-medium mb-1">Savings Progress</h3>
            <p className="text-3xl font-bold text-blue-400">{formatCurrency(summary.savings_progress)}</p>
            <p className="text-xs text-gray-400 mt-2">Target: {formatCurrency(budget.savings_target)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Bar Chart: Budget vs Actual */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-6">Budget vs Actual Spend</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={category_data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="category" stroke="#9CA3AF" angle={-45} textAnchor="end" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="allocated" name="Allocated (inc. Rollover)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="spent" name="Actual Spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Overspent Categories List */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6">Attention Needed</h3>
            {category_data.filter(c => c.overage > 0).length === 0 ? (
              <div className="text-green-400 flex items-center gap-2">
                <span className="text-2xl">🎉</span> You are within budget for all categories!
              </div>
            ) : (
              <div className="space-y-4">
                {category_data.filter(c => c.overage > 0).map((cat, idx) => (
                  <div key={idx} className="bg-gray-900 p-4 rounded-lg border border-red-500/30">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-gray-200">{cat.category}</h4>
                      <span className="text-red-400 font-bold">Over by {formatCurrency(cat.overage)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Details */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-white mb-6">Category Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {category_data.map((cat, idx) => (
              <div key={idx} className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-lg text-white">{cat.category}</h4>
                  <div className="text-right">
                    <span className="text-gray-400 text-sm">Spent: </span>
                    <span className={`font-bold ${cat.spent > cat.allocated && cat.allocated > 0 ? 'text-red-400' : 'text-white'}`}>
                      {formatCurrency(cat.spent)}
                    </span>
                    <span className="text-gray-400 text-sm ml-2">/ {formatCurrency(cat.allocated)}</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                  <div 
                    className={`h-2.5 rounded-full ${cat.overage > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min((cat.spent / (cat.allocated || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Rollover In: {formatCurrency(cat.rollover_in)}</span>
                  {cat.overage > 0 && <span className="text-red-400 font-bold">Overspent: {formatCurrency(cat.overage)}</span>}
                </div>

                {cat.advice && (
                  <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-blue-400">✨</span>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">AI Insight</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed">{cat.advice}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Spending Breakdown */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6">Spending Breakdown</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="spent"
                    nameKey="category"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h3 className="text-xl font-bold text-white mb-6">6-Month Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(val) => `₹${val}`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="spent" name="Total Spend" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        </>
        )}

      </div>
    </div>
  );
};

export default Analytics;
