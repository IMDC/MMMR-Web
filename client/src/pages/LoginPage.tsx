import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-mhmr-bg p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6">
        <img src="/roundLogo.png" alt="MHMR Logo" className="h-16 w-16 object-contain" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">MyMissionMyRecord</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your participant account</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="text-sm font-medium text-gray-700 mb-1 block">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
