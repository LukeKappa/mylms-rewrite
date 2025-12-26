'use client';

import { useState } from 'react';
import { Key, X } from 'lucide-react';
import { addToken } from '../addTokenAction';

export function AddTokenButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const result = await addToken(token);

    if (result.success) {
      setMessage({ type: 'success', text: `Token added! Welcome ${result.fullname}` });
      setToken('');
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload(); // Refresh to use new token
      }, 2000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to add token' });
    }

    setIsLoading(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-neutral-400 hover:text-white flex items-center gap-2 transition-colors"
        title="Add API Token"
      >
        <Key size={16} />
        <span className="hidden sm:inline">Add Token</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Add API Token</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-neutral-400 mb-4">
          Add your Moodle API token to enable faster navigation and downloads. This works alongside your SSO session.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-neutral-300 mb-2">
              API Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="a1b2c3d4e5f6..."
              className="w-full px-3 py-2 bg-black border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !token}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Add Token'}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="text-xs text-neutral-500 mt-4">
          Get your token from: Moodle → Profile → Preferences → Security keys
        </p>
      </div>
    </div>
  );
}
