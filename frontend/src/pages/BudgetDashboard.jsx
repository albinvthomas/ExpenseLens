import React, { useState, useEffect } from 'react';
import { getCurrentBudget, setupBudget } from '../api/budgets';
import { getCategories, createCategory, deleteCategory } from '../api/categories';
import { Link } from 'react-router-dom';

const BudgetDashboard = () => {
  const [budget, setBudget] = useState(null);
  const [categories, setCategories] = useState([]);
  
  const now = new Date();
  const [selectedPeriod, setSelectedPeriod] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );

  // Setup Mode State
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [income, setIncome] = useState(0);
  const [savingsTarget, setSavingsTarget] = useState(0);
  const [allocations, setAllocations] = useState([]); // [{ category_id, name, amount, locked, is_custom }]
  
  // New Category State
  const [newCatName, setNewCatName] = useState('');
  const [isEssential, setIsEssential] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const BASELINE_PERCENTAGES = {
    "Housing/Rent": 0.35,
    "Groceries": 0.15,
    "Transport": 0.10,
    "Utilities": 0.08,
    "Entertainment": 0.07,
    "Dining Out": 0.07,
    "Subscriptions": 0.05,
    "Shopping": 0.08,
    "Miscellaneous": 0.05,
  };

  useEffect(() => {
    fetchData(selectedPeriod);
  }, [selectedPeriod]);

  const fetchData = async (period) => {
    setLoading(true);
    setIsSettingUp(false);
    setError(null);
    try {
      const [year, month] = period.split('-');
      const cats = await getCategories();
      setCategories(cats);
      
      const b = await getCurrentBudget(parseInt(month), parseInt(year));
      if (b) {
        setBudget(b);
        setIncome(b.income);
        setSavingsTarget(b.savings_target);
        
        // Map saved allocations
        const mappedAllocations = cats.map(c => {
          const saved = b.allocations.find(a => a.category_id === c.id);
          return {
            category_id: c.id,
            name: c.name,
            amount: saved ? saved.amount : 0,
            locked: (saved && saved.amount > 0) ? true : false,
            is_custom: c.is_custom
          };
        });
        setAllocations(mappedAllocations);
      } else {
        // No budget exists yet
        setIsSettingUp(true);
        const initialAllocations = cats.map(c => ({
          category_id: c.id,
          name: c.name,
          amount: 0,
          locked: false,
          is_custom: c.is_custom
        }));
        setAllocations(initialAllocations);
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setIsSettingUp(true);
        
        // We still need to load categories to initialize allocations
        try {
          const cats = await getCategories();
          setCategories(cats);
          const initialAllocations = cats.map(c => ({
            category_id: c.id,
            name: c.name,
            amount: 0,
            locked: false,
            is_custom: c.is_custom
          }));
          setAllocations(initialAllocations);
        } catch (catErr) {
          setError('Failed to load categories.');
        }
      } else {
        setError('Failed to load data.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-balance algorithm when income/savings or a locked amount changes
  useEffect(() => {
    if (!isSettingUp) return;
    
    const available = (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0);
    if (available < 0) return;

    let newAllocs = allocations.map(a => ({...a}));
    
    // Sum locked
    const lockedSum = newAllocs.filter(a => a.locked).reduce((sum, a) => sum + a.amount, 0);
    const remainingBudget = Math.max(0, available - lockedSum);

    // Sum baseline percentages of UNLOCKED categories
    const unlockedAllocs = newAllocs.filter(a => !a.locked);
    
    if (unlockedAllocs.length > 0) {
      const remainingBaselineSum = unlockedAllocs.reduce((sum, a) => sum + (BASELINE_PERCENTAGES[a.name] || 0), 0);
      
      unlockedAllocs.forEach(a => {
        let basePct = BASELINE_PERCENTAGES[a.name] || 0;
        let amt = 0;
        if (remainingBaselineSum > 0) {
          amt = remainingBudget * (basePct / remainingBaselineSum);
        } else {
          amt = remainingBudget / unlockedAllocs.length;
        }
        
        // Update in newAllocs
        const idx = newAllocs.findIndex(na => na.category_id === a.category_id);
        if (idx !== -1) {
          newAllocs[idx].amount = Math.round(amt * 100) / 100;
        }
      });
      setAllocations(newAllocs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [income, savingsTarget]); // Triggered on main inputs change. Manual slider calls it explicitly.

  const handleAmountChange = (categoryId, newAmount) => {
    const available = (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0);
    let newAllocs = allocations.map(a => ({...a}));
    
    const idx = newAllocs.findIndex(a => a.category_id === categoryId);
    if (idx === -1) return;

    // We can't let them lock an amount greater than total available
    const safeAmount = Math.min(newAmount, available);
    
    newAllocs[idx].amount = safeAmount;
    newAllocs[idx].locked = true;

    // Re-balance unlocked
    const lockedSum = newAllocs.filter(a => a.locked).reduce((sum, a) => sum + a.amount, 0);
    const remainingBudget = Math.max(0, available - lockedSum);
    const unlockedAllocs = newAllocs.filter(a => !a.locked);

    if (unlockedAllocs.length > 0) {
      const remainingBaselineSum = unlockedAllocs.reduce((sum, a) => sum + (BASELINE_PERCENTAGES[a.name] || 0), 0);
      
      unlockedAllocs.forEach(a => {
        let basePct = BASELINE_PERCENTAGES[a.name] || 0;
        let amt = 0;
        if (remainingBaselineSum > 0) {
          amt = remainingBudget * (basePct / remainingBaselineSum);
        } else {
          amt = remainingBudget / unlockedAllocs.length;
        }
        
        const uIdx = newAllocs.findIndex(na => na.category_id === a.category_id);
        if (uIdx !== -1) {
          newAllocs[uIdx].amount = Math.round(amt * 100) / 100;
        }
      });
    }

    setAllocations(newAllocs);
  };

  const handleUnlock = (categoryId) => {
    let newAllocs = allocations.map(a => ({...a}));
    const idx = newAllocs.findIndex(a => a.category_id === categoryId);
    if (idx !== -1) {
      newAllocs[idx].locked = false;
      setAllocations(newAllocs);
      // Trigger a fake re-balance by momentarily setting a state (handled by a generic re-balance func ideally)
      // Since it's quick, we'll manually rebalance here too:
      rebalance(newAllocs);
    }
  };

  const rebalance = (allcs) => {
    const available = (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0);
    const lockedSum = allcs.filter(a => a.locked).reduce((sum, a) => sum + a.amount, 0);
    const remainingBudget = Math.max(0, available - lockedSum);
    const unlockedAllocs = allcs.filter(a => !a.locked);

    if (unlockedAllocs.length > 0) {
      const remainingBaselineSum = unlockedAllocs.reduce((sum, a) => sum + (BASELINE_PERCENTAGES[a.name] || 0), 0);
      unlockedAllocs.forEach(a => {
        let basePct = BASELINE_PERCENTAGES[a.name] || 0;
        let amt = 0;
        if (remainingBaselineSum > 0) {
          amt = remainingBudget * (basePct / remainingBaselineSum);
        } else {
          amt = remainingBudget / unlockedAllocs.length;
        }
        const uIdx = allcs.findIndex(na => na.category_id === a.category_id);
        if (uIdx !== -1) {
          allcs[uIdx].amount = Math.round(amt * 100) / 100;
        }
      });
    }
    setAllocations([...allcs]);
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    try {
      const newCat = await createCategory({
        name: newCatName,
        is_essential: isEssential,
        manual_amount: null
      });
      
      const newAllocs = [...allocations, {
        category_id: newCat.id,
        name: newCat.name,
        amount: 0,
        locked: false,
        is_custom: true
      }];
      setCategories([...categories, newCat]);
      setAllocations(newAllocs);
      setNewCatName('');
      rebalance(newAllocs);
    } catch (err) {
      console.error(err);
      alert("Failed to add category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteCategory(categoryId);
      const newCats = categories.filter(c => c.id !== categoryId);
      const newAllocs = allocations.filter(a => a.category_id !== categoryId);
      setCategories(newCats);
      setAllocations(newAllocs);
      rebalance(newAllocs);
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  const handleSaveBudget = async () => {
    setSaving(true);
    setError(null);
    try {
      const [year, month] = selectedPeriod.split('-');
      await setupBudget({
        income: parseFloat(income),
        savings_target: parseFloat(savingsTarget),
        month: parseInt(month),
        year: parseInt(year),
        allocations: allocations.map(a => ({
          category_id: a.category_id,
          amount: a.amount
        }))
      });
      setIsSettingUp(false);
      await fetchData(selectedPeriod); // refresh saved state
    } catch (err) {
      setError("Failed to save budget.");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white p-6 flex justify-center items-center">Loading Workspace...</div>;
  }

  const available = (parseFloat(income) || 0) - (parseFloat(savingsTarget) || 0);
  const currentTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingToAllocate = available - currentTotal;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-5xl mx-auto mt-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-green-400">Budget Workspace</h1>
            <input 
              type="month" 
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white px-3 py-1.5 rounded focus:outline-none focus:border-green-500 text-sm"
            />
          </div>
          {!isSettingUp && (
            <button 
              onClick={() => setIsSettingUp(true)}
              className="bg-gray-800 border border-gray-700 hover:bg-gray-700 px-4 py-2 rounded text-sm transition"
            >
              Edit Budget
            </button>
          )}
        </div>

        {error && <div className="bg-red-500/20 text-red-400 p-4 rounded mb-6 border border-red-500/50">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Overview & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-white">Monthly Overview</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Monthly Income (₹)</label>
                  {isSettingUp ? (
                    <input 
                      type="number" 
                      value={income} 
                      onChange={(e) => setIncome(e.target.value)}
                      className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{formatCurrency(budget?.income || 0)}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Savings Target (₹)</label>
                  {isSettingUp ? (
                    <input 
                      type="number" 
                      value={savingsTarget} 
                      onChange={(e) => setSavingsTarget(e.target.value)}
                      className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-blue-500"
                    />
                  ) : (
                    <p className="text-2xl font-bold text-blue-400">{formatCurrency(budget?.savings_target || 0)}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-700">
                  <label className="block text-sm text-gray-400 mb-1">Available to Allocate</label>
                  <p className="text-3xl font-bold text-green-400">{formatCurrency(available)}</p>
                  {isSettingUp && Math.abs(remainingToAllocate) > 0.1 && (
                    <p className={`text-sm mt-1 ${remainingToAllocate < 0 ? 'text-red-400' : 'text-yellow-400'}`}>
                      Unallocated: {formatCurrency(remainingToAllocate)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isSettingUp && (
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                <h3 className="text-lg font-bold mb-4 text-white">Add Category</h3>
                <form onSubmit={handleAddCategory} className="space-y-4">
                  <input 
                    type="text" 
                    placeholder="Category Name" 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full p-2 bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500"
                  />
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="essential" 
                      checked={isEssential} 
                      onChange={(e) => setIsEssential(e.target.checked)}
                      className="w-4 h-4 text-green-500 bg-gray-900 border-gray-700 rounded"
                    />
                    <label htmlFor="essential" className="ml-2 text-sm text-gray-400">Essential Expense</label>
                  </div>
                  <button type="submit" className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded transition">
                    Add Inline
                  </button>
                </form>
              </div>
            )}
            
            {isSettingUp && (
              <button 
                onClick={handleSaveBudget} 
                disabled={saving || available < 0}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save & Lock Budget'}
              </button>
            )}
          </div>

          {/* RIGHT: Allocations List */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Allocations</h3>
                {isSettingUp && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hidden sm:inline-block">
                      Adjust amounts to lock them. Others auto-balance.
                    </span>
                    <button 
                      onClick={() => {
                        let newAllocs = allocations.map(a => ({...a, locked: false}));
                        setAllocations(newAllocs);
                        // Trigger rebalance
                        rebalance(newAllocs);
                      }}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition"
                    >
                      Auto-Balance All
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {allocations.map((alloc) => (
                  <div key={alloc.category_id} className={`p-4 rounded-lg border ${alloc.locked ? 'bg-gray-900 border-blue-500/30' : 'bg-gray-900/50 border-gray-700'} flex items-center justify-between transition`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-200">{alloc.name}</h4>
                        {alloc.locked && <span className="text-xs bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">Locked</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {isSettingUp ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">₹</span>
                          <input 
                            type="number" 
                            value={alloc.amount}
                            onChange={(e) => handleAmountChange(alloc.category_id, parseFloat(e.target.value) || 0)}
                            className="w-24 p-1.5 text-right bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:border-green-500"
                          />
                          {alloc.locked && (
                            <button onClick={() => handleUnlock(alloc.category_id)} className="text-xs text-gray-400 hover:text-white underline decoration-gray-500">
                              Unlock
                            </button>
                          )}
                          <button onClick={() => handleDeleteCategory(alloc.category_id)} className="text-red-400 hover:text-red-300 ml-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ) : (
                        <span className="text-lg font-medium text-green-400">{formatCurrency(alloc.amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
                
                {allocations.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No categories found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetDashboard;
