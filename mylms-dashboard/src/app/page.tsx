'use client';

import { backendClient } from '@/lib/backendClient';
import { AlertCircle, Key } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [loadingToken, setLoadingToken] = useState(false);
  const router = useRouter();

  async function handleTokenLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;

    setError(null);
    setLoadingToken(true);

    try {
      // Call the Rust backend directly
      const result = await backendClient.login(token.trim());
      
      if (!result.success || result.error) {
        setError(result.error || 'Login failed');
      } else {
        // Store token in localStorage for subsequent API calls
        localStorage.setItem('moodle_token', token.trim());
        
        // Also store user info for quick access
        if (result.user) {
          localStorage.setItem('user_info', JSON.stringify(result.user));
        }
        
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to connect to backend. Is the server running?');
    } finally {
      setLoadingToken(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">MyLocalMS</h1>
          <p className="mt-2 text-neutral-400">Enter your Moodle Web Service token to continue</p>
        </div>

        <div className="bg-neutral-900/50 p-8 rounded-xl border border-neutral-800 shadow-sm space-y-6">
          {error && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm flex items-center gap-2 border border-red-900/50">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Token Login Form */}
          <form onSubmit={handleTokenLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="block text-sm font-medium text-neutral-300">
                Moodle Web Service Token
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                  <Key size={16} />
                </div>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here..."
                  className="w-full bg-black border border-neutral-700 text-white rounded-md pl-10 pr-4 py-3 focus:ring-2 focus:ring-white focus:border-transparent placeholder-neutral-600"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loadingToken || !token}
              className="w-full bg-white text-black h-12 rounded-md font-medium hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingToken ? 'Verifying...' : 'Login with Token'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
