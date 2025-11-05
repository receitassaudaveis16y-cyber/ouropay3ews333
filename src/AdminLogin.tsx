import { useState } from 'react';
import { Eye, EyeOff, Shield, Ghost } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
}

function AdminLogin({ onLoginSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const validEmail = 'anapaulamagioli899@gmail.com';
      const validPassword = 'P20071616l.';

      if (email.trim().toLowerCase() === validEmail && password === validPassword) {
        onLoginSuccess();
      } else {
        setError('Email ou senha incorretos');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex relative">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 bg-[#0f0f0f]">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-500/20 blur-3xl rounded-full"></div>
          <div className="relative inline-flex items-center gap-3 mb-6">
            <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
            <span className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
          </div>
          <Shield className="w-24 h-24 text-amber-500 mx-auto mb-4" />
          <p className="text-gray-400 text-lg max-w-md mx-auto">Painel Administrativo</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-[#1a1a1a] flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md">
          <div className="inline-flex items-center gap-2 mb-8 lg:hidden">
            <Ghost className="w-8 h-8 text-amber-500 animate-pulse" />
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">E-mail</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                required
                className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  className="w-full px-4 py-3.5 pr-12 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">{error}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-black font-bold rounded-xl shadow-lg"
            >
              {isLoading ? 'Verificando...' : 'Acessar Painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
