import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleEmergencyExit = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white border border-red-100 rounded-2xl shadow-lg p-8 max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">403 - Access Denied</h1>
        <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
        <button
          onClick={handleEmergencyExit}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition"
        >
          Sign Out & Return to Login
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
