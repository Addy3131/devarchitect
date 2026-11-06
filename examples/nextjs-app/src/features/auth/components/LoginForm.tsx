'use client';
import React, { useState } from 'react';
import { loginUser } from '../services/authService';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await loginUser(username, 'secret');
    setStatus(res.status);
  };

  return (
    <form onSubmit={handleSubmit} className="border border-slate-800 p-4 rounded max-w-sm">
      <h3 className="font-semibold mb-2">Login</h3>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => setUsername(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 p-2 rounded mb-2"
      />
      <button type="submit" className="w-full bg-cyan-600 p-2 rounded font-bold">
        Sign In
      </button>
      {status && <p className="mt-2 text-green-400">Status: {status}</p>}
    </form>
  );
}

