import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Printer, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import { login } from '../lib/api'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('admin@cybercafe.local')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(email, password)
      setAuth(result.user, result.token)
      navigate('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#140c07] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-gradient-to-b from-primary-500/12 to-transparent blur-3xl rounded-full" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo and Brand Title */}
        <div className="text-center mb-8">
          <div className="w-18 h-18 w-16 h-16 rounded-3xl bg-gradient-to-br from-[#fbbf24] to-[#d97706] p-0.5 shadow-[0_8px_24px_rgba(217,119,6,0.4),inset_0_2px_3px_rgba(255,255,255,0.4)] flex items-center justify-center mx-auto mb-4">
            <div className="w-full h-full rounded-[22px] bg-gradient-to-br from-[#f59e0b] to-[#b45309] flex items-center justify-center">
              <Printer className="w-8 h-8 text-[#241308]" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-[#fdf7f0] tracking-tight">Print Hub Admin</h1>
          <p className="text-[#a88a74] text-xs font-semibold uppercase tracking-wider mt-1">Management Portal</p>
        </div>

        {/* Tactile Clay Login Card */}
        <div className="card p-8 sm:p-9">
          <h2 className="text-lg font-bold text-[#fef5ec] mb-6">Sign In to Dashboard</h2>

          {error && (
            <div className="bg-[#381c1a] border border-rose-600/40 rounded-2xl p-3.5 mb-5 flex items-center gap-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-200 text-xs font-semibold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] block mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8c6b53]" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="admin@cybercafe.local"
                  required
                  id="email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#bfa08a] block mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8c6b53]" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter password"
                  required
                  id="password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              id="login-btn"
              className="btn-primary w-full py-3.5 mt-2 text-sm"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Authenticating...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#3e271a] text-center bg-[#190f09]/40 -mx-8 -mb-8 p-4 rounded-b-3xl">
            <p className="text-[11px] text-[#8c6b53] font-medium">Default Credentials for Setup:</p>
            <p className="text-xs text-primary-400 font-mono font-bold mt-0.5">admin@cybercafe.local / Admin@1234</p>
          </div>
        </div>
      </div>
    </div>
  )
}
