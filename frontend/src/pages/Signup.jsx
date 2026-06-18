import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/client';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/auth/request-otp', { email });
      setSuccess('Verification code sent to your email!');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send OTP.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signup(email, password, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
      <div className="bg-gray-800 p-10 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
        <h2 className="text-3xl font-bold mb-6 text-white text-center">Create Account</h2>
        {error && <div className="bg-red-500/20 border border-red-500 text-red-300 p-3 mb-6 rounded text-center">{error}</div>}
        {success && <div className="bg-green-500/20 border border-green-500 text-green-300 p-3 mb-6 rounded text-center">{success}</div>}
        
        {step === 1 ? (
          <form onSubmit={handleRequestOTP} className="space-y-6">
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
                minLength={6}
              />
            </div>
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold p-3 rounded-lg shadow-lg hover:-translate-y-0.5 transition duration-200">
              Send Verification Code
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <p className="text-gray-300 text-center mb-4">
              We sent a 6-digit code to <strong>{email}</strong>.
            </p>
            <div>
              <label className="block text-gray-400 mb-2 font-medium">Verification Code</label>
              <input 
                type="text" 
                value={otp} 
                onChange={e => setOtp(e.target.value)} 
                className="w-full p-3 rounded bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-green-500 transition text-center tracking-widest text-xl"
                placeholder="000000"
                maxLength={6}
                required 
              />
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold p-3 rounded-lg shadow-lg hover:-translate-y-0.5 transition duration-200">
              Verify & Sign Up
            </button>
            <button type="button" onClick={() => setStep(1)} className="w-full text-gray-400 hover:text-white transition mt-2 text-sm">
              Change Email
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-gray-400">
          Already have an account? <Link to="/login" className="text-green-400 hover:text-green-300">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
