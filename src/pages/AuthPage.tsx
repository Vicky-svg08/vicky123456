import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await signIn({ email, password });
      } else {
        await signUp({ email, password, name });
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-violet-50 p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-2xl shadow-lg">
            💼
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Office Expense</h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl shadow-black/5">
          {/* Mode toggle */}
          <div className="mb-5 flex rounded-xl bg-gray-100 p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-1.5 text-sm font-semibold transition-all duration-200 ${
                  mode === m
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Full name</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <div className="pt-1">
              <Button type="submit" className="w-full justify-center py-2.5" disabled={submitting}>
                {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
