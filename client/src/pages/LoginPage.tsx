import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn, Check, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function passwordRules(pw: string, currentPw: string) {
  return {
    length: pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    numberOrSpecial: /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw),
    notSameAsCurrent: pw.length > 0 && pw !== currentPw,
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const changePassword = useAuthStore(s => s.changePassword);

  // Step 1 — login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const status = useAuthStore(s => s.status);
  const currentUser = useAuthStore(s => s.user);

  // If already fully authed (no password change needed), go to app
  useEffect(() => {
    if (status === 'authed' && !currentUser?.mustChangePassword) {
      navigate('/', { replace: true });
    }
  }, [status, currentUser, navigate]);

  // Step 2 — change password
  const [step, setStep] = useState<'login' | 'change-password'>('login');
  const [tempPassword, setTempPassword] = useState(''); // keep track of temp password for server call
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changing, setChanging] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      // Check if the store user needs a password change
      const user = useAuthStore.getState().user;
      if (user?.mustChangePassword) {
        setTempPassword(password);
        setStep('change-password');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const rules = passwordRules(newPassword, tempPassword);
  const allRulesMet = Object.values(rules).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRulesMet || !passwordsMatch) return;
    setChangeError('');
    setChanging(true);
    try {
      await changePassword(tempPassword, newPassword);
      navigate('/', { replace: true });
    } catch (err: any) {
      setChangeError(err.response?.data?.error || err.message || 'Failed to update password. Please try again.');
    } finally {
      setChanging(false);
    }
  };

  if (step === 'change-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mhmr-bg p-6">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col gap-6">
          <div className="text-center">
            <img src="/roundLogo.png" alt="MHMR Logo" className="h-14 w-14 object-contain mx-auto mb-3" />
            <h1 className="text-xl font-bold text-gray-900">Set Your Password</h1>
            <p className="text-sm text-gray-500 mt-1">Choose a personal password to secure your account.</p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            {changeError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {changeError}
              </div>
            )}

            <div>
              <label htmlFor="new-password" className="text-sm font-medium text-gray-700 mb-1 block">New Password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="form-input"
                required
              />
              {newPassword.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {[
                    [rules.length, 'At least 8 characters'],
                    [rules.uppercase, 'One uppercase letter'],
                    [rules.lowercase, 'One lowercase letter'],
                    [rules.numberOrSpecial, 'One number or special character'],
                    [rules.notSameAsCurrent, 'Different from your temporary password'],
                  ].map(([met, label]) => (
                    <li key={label as string} className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-red-500'}`}>
                      {met ? <Check size={12} /> : <X size={12} />}
                      {label as string}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700 mb-1 block">Confirm New Password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="form-input"
                required
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!allRulesMet || !passwordsMatch || changing}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changing ? <Loader2 size={18} className="animate-spin" /> : null}
              {changing ? 'Saving…' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-mhmr-bg p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-6">
        <img src="/roundLogo.png" alt="MHMR Logo" className="h-16 w-16 object-contain" />
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900">MyMissionMyRecord</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your participant account</p>
        </div>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
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
