// File: src/components/LoginPage.tsx
import { useState } from 'react';
import logo from '../../server/assets/logo.png';

interface Props {
  onLogin: (role: 'admin' | 'user') => void;
}

const LoginPage = ({ onLogin }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email === 'admin' && password === 'admin123') {
      onLogin('admin');
    } else if (email === 'user' && password === 'user123') {
      onLogin('user');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-100 to-white">
      <div className="bg-white shadow-lg rounded-lg p-8 w-80 flex flex-col items-center">
        <img src={logo} alt="Wealth Plus Logo" className="w-32 mb-4" />
        <h1 className="text-2xl font-bold text-[#292d6c] mb-6">Login to Wealth Plus</h1>
        <input
          type="email"
          placeholder="Email"
          className="p-2 border border-gray-300 w-full rounded mb-4 focus:outline-none focus:ring-2 focus:ring-[#292d6c]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 border border-gray-300 w-full rounded mb-6 focus:outline-none focus:ring-2 focus:ring-[#292d6c]"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="bg-[#1B75BB] hover:bg-[#252A78] text-white px-6 py-2 rounded w-full transition-all duration-300"
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
