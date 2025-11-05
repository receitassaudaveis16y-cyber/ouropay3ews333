import { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle2, Eye, EyeOff, Ghost } from 'lucide-react';
import { authService } from './lib/auth';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      setIsValidToken(true);
    } else {
      setErrorMessage('Link inválido ou expirado');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const result = await authService.updatePassword(password);

      if (!result.success) {
        setErrorMessage(result.error?.message || 'Erro ao atualizar senha');
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      setErrorMessage('Erro ao atualizar senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gray-800 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Ghost className="w-8 h-8 text-amber-500 animate-pulse" />
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
          </div>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-semibold text-white">Link Inválido</h1>
            <p className="text-gray-400 text-sm">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-2xl border border-gray-800 p-8">
        <div className="flex items-center gap-3 mb-6">
          <Ghost className="w-8 h-8 text-amber-500 animate-pulse" />
          <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
        </div>

        <div className="space-y-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-semibold text-white">Senha Atualizada!</h1>
              <p className="text-gray-400 text-sm">
                Sua senha foi alterada com sucesso. Você será redirecionado para a página de login...
              </p>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Lock className="w-8 h-8 text-amber-500" />
                  <h1 className="text-2xl font-semibold text-white">
                    Nova Senha
                  </h1>
                </div>
                <p className="text-gray-400 text-sm">
                  Digite sua nova senha
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Digite a senha novamente"
                      required
                      className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? 'Atualizando...' : 'Atualizar Senha'}
                </button>

                <button
                  type="button"
                  onClick={() => window.location.href = '/'}
                  className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Voltar ao login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
