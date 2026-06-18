import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-6xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
        ExpenseLens
      </h1>
      <p className="text-xl mb-10 text-gray-300 text-center max-w-2xl">
        Gain absolute clarity over your personal finances. Track spending, set budgets, and achieve your goals with ease.
      </p>
      <div className="flex gap-6">
        <Link to="/signup" className="px-8 py-4 bg-green-500 text-lg font-bold rounded-lg shadow-lg hover:bg-green-600 hover:-translate-y-1 transition transform duration-200">
          Get Started
        </Link>
        <Link to="/login" className="px-8 py-4 bg-gray-800 text-lg font-bold rounded-lg shadow border border-gray-700 hover:bg-gray-700 hover:-translate-y-1 transition transform duration-200">
          Login
        </Link>
      </div>
    </div>
  );
};

export default Landing;
