import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Save, Eye, EyeOff, Key, Bell, Shield, CreditCard, Mail, QrCode, Copy, Check, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  userId: string;
}

function Settings({ userId }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('account');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorModal, setShowTwoFactorModal] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState('');
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState('');
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [autoWithdrawal, setAutoWithdrawal] = useState(false);
  const [withdrawalDay, setWithdrawalDay] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    loadUserData();
    loadTwoFactorStatus();
  }, []);

  const loadUserData = async () => {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || '');
    }
  };

  const loadTwoFactorStatus = async () => {
    if (!supabase) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-2fa`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTwoFactorEnabled(data.is_enabled || false);
      }
    } catch (error) {
      console.error('Erro ao carregar status 2FA:', error);
    }
  };

  const handleTwoFactorToggle = async () => {
    if (twoFactorEnabled) {
      if (confirm('Tem certeza que deseja desativar a autenticação de dois fatores?')) {
        await disableTwoFactor();
      }
    } else {
      await enableTwoFactor();
    }
  };

  const enableTwoFactor = async () => {
    if (!supabase) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-2fa`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'enable' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao configurar 2FA');
      }

      const data = await response.json();
      setTwoFactorSecret(data.secret);
      setTwoFactorQrUrl(data.qrCodeUrl);
      setTwoFactorBackupCodes(data.backupCodes);
      setTwoFactorStep('setup');
      setShowTwoFactorModal(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao ativar 2FA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!supabase) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-2fa`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'disable' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao desativar 2FA');
      }

      setTwoFactorEnabled(false);
      setSuccessMessage('2FA desativado com sucesso!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao desativar 2FA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyTwoFactorCode = async () => {
    if (!supabase || !twoFactorCode || twoFactorCode.length !== 6) {
      setErrorMessage('Código deve ter 6 dígitos');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão não encontrada');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-2fa`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: twoFactorCode, action: 'enable' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Código inválido');
      }

      setTwoFactorStep('backup');
      setTwoFactorCode('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao verificar código');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishTwoFactorSetup = () => {
    setTwoFactorEnabled(true);
    setShowTwoFactorModal(false);
    setTwoFactorStep('setup');
    setTwoFactorCode('');
    setTwoFactorSecret('');
    setTwoFactorQrUrl('');
    setTwoFactorBackupCodes([]);
    setSuccessMessage('2FA ativado com sucesso!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const copyBackupCodes = () => {
    const codes = twoFactorBackupCodes.join('\n');
    navigator.clipboard.writeText(codes);
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (!supabase) throw new Error('Supabase não inicializado');

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccessMessage('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao alterar senha');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Conta', icon: Key },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard }
  ];

  return (
    <div>
      {showTwoFactorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full border border-gray-800">
            <div className="border-b border-gray-800 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">
                {twoFactorStep === 'setup' && 'Configurar Autenticação de Dois Fatores'}
                {twoFactorStep === 'verify' && 'Verificar Código'}
                {twoFactorStep === 'backup' && 'Códigos de Backup'}
              </h2>
            </div>

            <div className="p-6">
              {twoFactorStep === 'setup' && (
                <div className="space-y-4">
                  <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <QrCode className="w-8 h-8 text-black" />
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Escaneie o QR Code</h3>
                        <p className="text-sm text-gray-400">Use um app como Google Authenticator, Authy ou Microsoft Authenticator</p>
                      </div>

                      <div className="bg-white p-4 rounded-lg">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFactorQrUrl)}`}
                          alt="QR Code 2FA"
                          className="w-48 h-48"
                        />
                      </div>

                      <div className="w-full">
                        <p className="text-xs text-gray-400 mb-2">Ou digite manualmente este código:</p>
                        <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                          <code className="text-amber-500 font-mono text-sm break-all">{twoFactorSecret}</code>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setTwoFactorStep('verify')}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all"
                  >
                    Próximo
                  </button>
                </div>
              )}

              {twoFactorStep === 'verify' && (
                <div className="space-y-4">
                  <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800 text-center">
                    <p className="text-white mb-4">Digite o código de 6 dígitos do seu aplicativo authenticator:</p>

                    <input
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full max-w-xs mx-auto px-4 py-4 text-center text-2xl font-mono rounded-xl border border-gray-700 bg-[#1a1a1a] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      maxLength={6}
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                      {errorMessage}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setTwoFactorStep('setup');
                        setTwoFactorCode('');
                        setErrorMessage('');
                      }}
                      className="flex-1 py-3 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleVerifyTwoFactorCode}
                      disabled={twoFactorCode.length !== 6 || isSubmitting}
                      className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Verificando...' : 'Verificar'}
                    </button>
                  </div>
                </div>
              )}

              {twoFactorStep === 'backup' && (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-500">
                        <p className="font-semibold mb-1">Guarde estes códigos em local seguro!</p>
                        <p>Use-os para acessar sua conta se perder acesso ao authenticator.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Códigos de Backup</h3>
                      <button
                        onClick={copyBackupCodes}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg transition-all"
                      >
                        {copiedBackupCodes ? (
                          <><Check className="w-4 h-4" /> Copiado!</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Copiar Todos</>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {twoFactorBackupCodes.map((code, index) => (
                        <div key={index} className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-700">
                          <code className="text-amber-500 font-mono text-sm">{code}</code>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleFinishTwoFactorSetup}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all"
                  >
                    Concluir Configuração
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1">Configurações</h1>
        <p className="text-gray-400 text-sm">Gerencie suas preferências e configurações da conta</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="bg-[#1a1a1a] rounded-xl p-2 border border-gray-800">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-500 font-medium'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-9">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Informações da Conta</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Email
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="email"
                          value={email}
                          readOnly
                          className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-gray-400"
                        />
                        <Mail className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Entre em contato com o suporte para alterar seu email
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Alterar Senha</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Senha Atual
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Confirmar Nova Senha
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
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

                    {successMessage && (
                      <div className="bg-green-500/10 border border-green-500 rounded-lg p-3 text-sm text-green-500">
                        {successMessage}
                      </div>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      disabled={isSubmitting || !newPassword || !confirmPassword}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSubmitting ? 'Salvando...' : 'Alterar Senha'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Preferências de Notificação</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <div>
                        <div className="text-white font-medium">Notificações por Email</div>
                        <div className="text-sm text-gray-400">Receba atualizações importantes por email</div>
                      </div>
                      <button
                        onClick={() => setEmailNotifications(!emailNotifications)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          emailNotifications ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            emailNotifications ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <div>
                        <div className="text-white font-medium">Notificações Push</div>
                        <div className="text-sm text-gray-400">Receba notificações no navegador</div>
                      </div>
                      <button
                        onClick={() => setPushNotifications(!pushNotifications)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          pushNotifications ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            pushNotifications ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Segurança da Conta</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <div>
                        <div className="text-white font-medium">Autenticação de Dois Fatores</div>
                        <div className="text-sm text-gray-400">Adicione uma camada extra de segurança com authenticator</div>
                      </div>
                      <button
                        onClick={handleTwoFactorToggle}
                        disabled={isSubmitting}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          twoFactorEnabled ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500' : 'bg-gray-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            twoFactorEnabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {twoFactorEnabled && (
                      <div className="bg-green-500/10 border border-green-500 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-green-500">
                          <Shield className="w-4 h-4" />
                          <span>2FA está ativo. Você precisará do código ao fazer login.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Configurações de Pagamento</h2>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-800">
                      <div>
                        <div className="text-white font-medium">Saque Automático</div>
                        <div className="text-sm text-gray-400">Transfira automaticamente seus fundos</div>
                      </div>
                      <button
                        onClick={() => setAutoWithdrawal(!autoWithdrawal)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          autoWithdrawal ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            autoWithdrawal ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {autoWithdrawal && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Dia do Saque Automático
                        </label>
                        <select
                          value={withdrawalDay}
                          onChange={(e) => setWithdrawalDay(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>
                              Dia {day} de cada mês
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
