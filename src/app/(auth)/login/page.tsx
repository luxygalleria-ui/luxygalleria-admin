'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login as apiLogin } from '../../../services/authService';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, go to dashboard
    const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null;
    if (token) router.push('/dashboard');
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation: Record<string, string> = {};
    if (!email.trim()) validation.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) validation.email = 'Please enter a valid email address.';
    if (!password) validation.password = 'Password is required.';
    else if (password.length < 6) validation.password = 'Password must be at least 6 characters.';

    if (Object.keys(validation).length > 0) {
      setError(Object.values(validation)[0]);
      return;
    }

    try {
      setIsLoading(true);
      const res = await apiLogin({ email: email.trim(), password });
      if (res && res.success) {
        const data = res.data;
        // Store token/user for client-side checks
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminUser', JSON.stringify(data));
          // make a non-httpOnly cookie copy for legacy checks (middleware checks cookies too)
          document.cookie = `adminToken=${data.token}; path=/; max-age=604800; SameSite=Strict`;
        }
        router.push('/dashboard');
      } else {
        setError(res?.message || 'Invalid email or password');
      }
    } catch (err: any) {
      if (err?.response?.data?.message) setError(err.response.data.message);
      else if (err?.code === 'ERR_NETWORK') setError('Connection refused. Is the backend server running?');
      else setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
            Sign in to Luxy Admin
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter your credentials to access the dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5E34] focus:border-[#8B5E34] focus:z-10 sm:text-sm"
                placeholder="admin@luxygalleria.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-slate-300 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B5E34] focus:border-[#8B5E34] focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-[#8B5E34] focus:ring-[#8B5E34] border-slate-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-[#8B5E34] hover:text-[#7A4F2A]">
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#8B5E34] hover:bg-[#7A4F2A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B5E34] disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
