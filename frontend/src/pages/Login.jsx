import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials or server error.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-white text-center">Welcome Back</h2>
        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 mb-6 rounded text-center">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-400 mb-2 font-medium">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full p-3 rounded bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition"
              required 
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2 font-medium">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full p-3 rounded bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition"
              required 
            />
          </div>
          <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-3 rounded-lg shadow-lg hover:-translate-y-0.5 transition duration-200">
            Login
          </button>
        </form>
        <p className="mt-6 text-center text-gray-400">
          Don't have an account? <Link to="/signup" className="text-green-400 hover:text-green-300">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
