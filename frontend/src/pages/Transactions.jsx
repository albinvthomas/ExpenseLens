import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { getCategories } from '../api/categories';
import { Link } from 'react-router-dom';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('All');

  const filteredTransactions = transactions.filter(tx => 
    filter === 'All' ? true : 
    (filter === 'Income' ? tx.type === 'income' : tx.type === 'expense')
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const cats = await getCategories();
      setCategories(cats);
      
      const res = await apiClient.get('/transactions/');
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setError(null);
    setUploadResult(null);

    try {
      const res = await apiClient.post('/statements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadResult(`Successfully parsed ${res.data.transactions_parsed} transactions!`);
      setFile(null);
      fetchData(); // reload transactions
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to process statement. Ensure your API key is correct.");
    } finally {
      setUploading(false);
    }
  };

  const handleCategoryChange = async (transactionId, newCategoryId) => {
    try {
      const res = await apiClient.put(`/transactions/${transactionId}`, {
        category_id: parseInt(newCategoryId)
      });
      
      // Update locally
      setTransactions(transactions.map(t => 
        t.id === transactionId ? res.data : t
      ));
      
      // We don't need to show a success message every time, 
      // but the backend has now learned this rule!
    } catch (err) {
      console.error(err);
      alert("Failed to update transaction category.");
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };
  
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto mt-6">
        <h1 className="text-3xl font-bold text-green-400 mb-8">Transactions & Statements</h1>

        {/* Upload Section */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg mb-8">
          <h2 className="text-xl font-bold text-white mb-4">AI Statement Importer</h2>
          <p className="text-gray-400 mb-4 text-sm">
            Upload your bank statement (CSV or PDF). Our AI will automatically parse the transactions and categorize them based on your custom categories. Correcting a category teaches the AI to remember it for next time!
          </p>
          
          <form onSubmit={handleUpload} className="flex flex-col sm:flex-row items-center gap-4">
            <input 
              type="file" 
              accept=".csv, .pdf"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-green-500 file:text-white
                hover:file:bg-green-600 transition"
            />
            <button 
              type="submit" 
              disabled={!file || uploading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-full shadow-lg transition"
            >
              {uploading ? 'Parsing with AI...' : 'Upload & Categorize'}
            </button>
          </form>

          {error && <div className="mt-4 text-red-400 text-sm">{error}</div>}
          {uploadResult && <div className="mt-4 text-green-400 text-sm font-medium">{uploadResult}</div>}
        </div>

        {/* Transactions Table */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded text-white p-2 text-sm focus:outline-none focus:border-green-500"
            >
              <option value="All">All Transactions</option>
              <option value="Income">Income Only</option>
              <option value="Expense">Expenses Only</option>
            </select>
          </div>
          
          {loading ? (
            <div className="p-6 text-center text-gray-400">Loading transactions...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No transactions found for this filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-700 text-gray-300">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Date</th>
                    <th className="p-4 w-1/2">Description</th>
                    <th className="p-4 text-right whitespace-nowrap">Amount</th>
                    <th className="p-4 w-1/4">Category (Auto/Learned)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition">
                      <td className="p-4 text-sm text-gray-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                      <td className="p-4 font-medium text-gray-200">
                        {tx.description}
                      </td>
                      <td className={`p-4 text-right font-bold whitespace-nowrap ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="p-4">
                        <select 
                          value={tx.category_id}
                          onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                          className="w-full bg-gray-900 border border-gray-600 rounded text-white p-2 focus:outline-none focus:border-green-500 text-sm"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
