import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { Eye, EyeOff, CheckCircle2, X, AlertCircle, AlertTriangle, Upload, Ghost, Shield } from 'lucide-react';
const Dashboard = lazy(() => import('./Dashboard'));
const Admin = lazy(() => import('./Admin'));
const AdminLogin = lazy(() => import('./AdminLogin'));
const PendingApproval = lazy(() => import('./PendingApproval'));
const PaymentPage = lazy(() => import('./PaymentPage'));
const ResetPassword = lazy(() => import('./ResetPassword'));
import { supabase } from './lib/supabase';
import { authService } from './lib/auth';

type PasswordStrength = 'weak' | 'medium' | 'strong' | null;

function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const [accountStatus, setAccountStatus] = useState<'pending' | 'approved' | 'rejected' | 'under_review'>('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoginView, setIsLoginView] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [businessType, setBusinessType] = useState<'juridica' | 'fisica'>('fisica');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nomeCompletoError, setNomeCompletoError] = useState(false);
  const [nomeFatura, setNomeFatura] = useState('');
  const [mediaFaturamento, setMediaFaturamento] = useState('');
  const [ticketMedio, setTicketMedio] = useState('');
  const [siteEmpresa, setSiteEmpresa] = useState('');
  const [siteEmpresaError, setSiteEmpresaError] = useState(false);
  const [produtosVendidos, setProdutosVendidos] = useState('');
  const [vendeProdutosFisicos, setVendeProdutosFisicos] = useState(false);
  const [nomeRepresentante, setNomeRepresentante] = useState('');
  const [cpfRepresentante, setCpfRepresentante] = useState('');
  const [emailRepresentante, setEmailRepresentante] = useState('');
  const [emailRepresentanteError, setEmailRepresentanteError] = useState(false);
  const [telefoneRepresentante, setTelefoneRepresentante] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [nomeMae, setNomeMae] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [complemento, setComplemento] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentFrontal, setDocumentFrontal] = useState<File | null>(null);
  const [documentVerso, setDocumentVerso] = useState<File | null>(null);
  const [documentSelfie, setDocumentSelfie] = useState<File | null>(null);
  const [documentContrato, setDocumentContrato] = useState<File | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registrationEmail, setRegistrationEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pending2FAUser, setPending2FAUser] = useState<any>(null);
  const [paymentSlug, setPaymentSlug] = useState<string | null>(null);


  useEffect(() => {
    const checkAuth = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          if (user.email === 'anapaulamagioli899@gmail.com') {
            setShowDashboard(true);
            setIsLoading(false);
            return;
          }

          const { data: profile } = await supabase
            .from('company_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile) {
            const status = profile.status || 'pending';
            setAccountStatus(status);
            setRejectionReason(profile.rejection_reason || '');

            if (status === 'approved') {
              setShowDashboard(true);
            } else {
              setShowPendingApproval(true);
            }
          } else {
            setShowCompanyForm(true);
          }
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };

    const checkRoutes = () => {
      if (window.location.pathname === '/admin') {
        setShowAdminLogin(true);
        setIsLoading(false);
      } else if (window.location.pathname === '/reset-password') {
        setIsLoading(false);
      } else if (window.location.pathname.startsWith('/pay/')) {
        const slug = window.location.pathname.replace('/pay/', '');
        setPaymentSlug(slug);
        setIsLoading(false);
      } else {
        checkAuth();
      }
    };

    checkRoutes();
    window.addEventListener('popstate', checkRoutes);

    return () => {
      window.removeEventListener('popstate', checkRoutes);
    };
  }, [supabase]);

  const calculatePasswordStrength = useCallback((pwd: string): PasswordStrength => {
    if (pwd.length === 0) return null;

    const hasMinLength = pwd.length > 5;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%¨&*()_+=\-;.,><:^{`}/?]/.test(pwd);

    // Para ser forte (difícil), precisa ter maiúscula, minúscula, número e caractere especial
    if (hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) {
      return 'strong';
    }

    // Para ser média, precisa ter pelo menos 3 dos requisitos
    const criteriaMet = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;
    if (criteriaMet >= 3) {
      return 'medium';
    }

    // Caso contrário, é fraca
    return 'weak';
  }, []);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      setCnpj(value);
    }
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setCpf(value);
    }
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    const numericValue = parseInt(digits, 10);
    return `R$ ${(numericValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCurrencyChange = (value: string, setter: (value: string) => void) => {
    const digits = value.replace(/\D/g, '');
    setter(digits);
  };

  const handleNomeCompletoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNomeCompleto(value);
    const hasNameAndSurname = value.trim().split(/\s+/).length >= 2;
    setNomeCompletoError(!hasNameAndSurname && value.length > 0);
  };

  const canSubmit = () => {
    const hasEmail = registrationEmail.length > 0;
    const hasPassword = password.length > 0;
    const passwordsMatch = password === confirmPassword;
    const isStrongEnough = passwordStrength === 'medium' || passwordStrength === 'strong';

    const canSubmitForm = hasEmail && hasPassword && passwordsMatch && isStrongEnough;

    return canSubmitForm;
  };

  const canProceedToStep2 = () => {
    if (businessType === 'juridica') {
      return (
        cnpj.length === 14 &&
        razaoSocial.trim().length > 0 &&
        nomeFatura.trim().length > 0
      );
    } else {
      const hasNameAndSurname = nomeCompleto.trim().split(/\s+/).length >= 2;
      return (
        cpf.length === 11 &&
        hasNameAndSurname &&
        nomeFatura.trim().length > 0
      );
    }
  };

  const isValidUrl = (url: string) => {
    const urlPattern = /^https?:\/\/.+\..+/i;
    return urlPattern.test(url);
  };

  const isValidEmail = (email: string) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const handleSiteEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSiteEmpresa(value);
    if (value.length > 0) {
      setSiteEmpresaError(!isValidUrl(value));
    } else {
      setSiteEmpresaError(false);
    }
  };

  const handleEmailRepresentanteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailRepresentante(value);
    if (value.length > 0) {
      setEmailRepresentanteError(!isValidEmail(value));
    } else {
      setEmailRepresentanteError(false);
    }
  };

  const canProceedToStep3 = () => {
    return (
      mediaFaturamento.trim().length > 0 &&
      ticketMedio.trim().length > 0 &&
      siteEmpresa.trim().length > 0 &&
      isValidUrl(siteEmpresa) &&
      produtosVendidos.trim().length > 0
    );
  };

  const canProceedToStep4 = () => {
    return (
      nomeRepresentante.trim().length > 0 &&
      cpfRepresentante.length === 11 &&
      emailRepresentante.trim().length > 0 &&
      isValidEmail(emailRepresentante) &&
      telefoneRepresentante.length === 11 &&
      dataNascimento.trim().length > 0 &&
      nomeMae.trim().length > 0
    );
  };

  const canProceedToStep5 = () => {
    return (
      cep.length === 8 &&
      logradouro.trim().length > 0 &&
      numero.trim().length > 0 &&
      bairro.trim().length > 0 &&
      cidade.trim().length > 0 &&
      estado.trim().length > 0
    );
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setTelefoneRepresentante(value);
    }
  };

  const formatTelefone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatDataNascimento = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  };

  const handleDataNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      setDataNascimento(value);
    }
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
      setCep(value);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await authService.signUp(registrationEmail, password);

      if (!result.success) {
        setErrorMessage(result.error?.message || 'Erro ao criar conta');
        return;
      }

      setShowSuccessToast(true);
      setTimeout(() => {
        setShowSuccessToast(false);
        setShowCompanyForm(true);
      }, 2000);
    } catch (error: any) {
      setErrorMessage('Erro ao criar conta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (file: File | null, setter: (file: File | null) => void) => {
    setter(file);
  };

  const canFinishRegistration = () => {
    return documentFrontal && documentVerso && documentSelfie && documentContrato;
  };

  const handleVerify2FACode = async () => {
    if (!twoFactorCode || twoFactorCode.length !== 6 || !supabase || !pending2FAUser) {
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
        body: JSON.stringify({ code: twoFactorCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Código inválido');
      }

      setShow2FAModal(false);
      setTwoFactorCode('');

      if (pending2FAUser.email === 'anapaulamagioli899@gmail.com') {
        setShowDashboard(true);
        return;
      }

      const { data: profile } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', pending2FAUser.id)
        .maybeSingle();

      if (profile) {
        const status = profile.status || 'pending';
        setAccountStatus(status);
        setRejectionReason(profile.rejection_reason || '');

        if (status === 'approved') {
          setShowDashboard(true);
        } else {
          setShowPendingApproval(true);
        }
      } else {
        setShowCompanyForm(true);
      }

      setPending2FAUser(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao verificar código');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishRegistration = async () => {
    if (!canFinishRegistration() || !supabase) {
      setErrorMessage('Erro ao processar solicitação. Tente novamente.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Usuário não autenticado');

      const companyData = {
        user_id: user.id,
        business_type: businessType,
        document_number: businessType === 'juridica' ? cnpj : cpf,
        business_name: businessType === 'juridica' ? razaoSocial : nomeCompleto,
        invoice_name: nomeFatura,
        average_revenue: parseFloat(mediaFaturamento) / 100 || 0,
        average_ticket: parseFloat(ticketMedio) / 100 || 0,
        company_website: siteEmpresa,
        products_sold: produtosVendidos,
        sells_physical_products: vendeProdutosFisicos,
        representative_name: nomeRepresentante,
        representative_cpf: cpfRepresentante,
        representative_email: emailRepresentante,
        representative_phone: telefoneRepresentante,
        date_of_birth: dataNascimento,
        mother_name: nomeMae,
        postal_code: cep,
        street: logradouro,
        number: numero,
        neighborhood: bairro,
        city: cidade,
        state: estado,
        complement: complemento,
        document_frontal_url: documentFrontal?.name || '',
        document_back_url: documentVerso?.name || '',
        document_selfie_url: documentSelfie?.name || '',
        document_contract_url: documentContrato?.name || '',
        status: 'pending'
      };

      const { error } = await supabase
        .from('company_profiles')
        .insert([companyData]);

      if (error) throw error;

      setShowDocumentModal(false);
      setAccountStatus('pending');
      setShowPendingApproval(true);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao finalizar cadastro');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse mx-auto mb-4" />
          <p className="text-amber-500 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  if (window.location.pathname === '/reset-password') {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <ResetPassword />
      </Suspense>
    );
  }

  if (paymentSlug) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <PaymentPage
          slug={paymentSlug}
          onBack={() => {
            setPaymentSlug(null);
            window.history.pushState({}, '', '/');
          }}
        />
      </Suspense>
    );
  }

  if (showAdminLogin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <AdminLogin onLoginSuccess={() => {
          setShowAdminLogin(false);
          setShowAdmin(true);
        }} />
      </Suspense>
    );
  }

  if (showAdmin) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <Admin onBack={() => {
          setShowAdmin(false);
          setShowAdminLogin(false);
          window.history.pushState({}, '', '/');
        }} />
      </Suspense>
    );
  }

  if (showPendingApproval) {
    const userName = businessType === 'juridica' ? razaoSocial : (nomeCompleto || loginEmail.split('@')[0]);
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <PendingApproval
          status={accountStatus as 'pending' | 'under_review' | 'rejected'}
          businessName={userName}
          rejectionReason={rejectionReason}
          onLogout={async () => {
            if (supabase) {
              await supabase.auth.signOut();
            }
            setShowPendingApproval(false);
            setShowDashboard(false);
            setShowCompanyForm(false);
            setIsLoginView(true);
          }}
        />
      </Suspense>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex relative">
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 bg-[#0f0f0f]">
          <div className="text-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-500/20 blur-3xl rounded-full"></div>
            <div className="relative inline-flex items-center gap-3 mb-6">
              <Ghost className="w-16 h-16 text-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
              <span className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">GoldsPay</span>
            </div>
            <div className="relative">
              <Shield className="w-24 h-24 text-amber-500 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
              <p className="text-gray-400 text-lg max-w-md mx-auto">Recuperação de Senha</p>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 bg-[#1a1a1a] flex items-center justify-center p-6 lg:p-16">
          <div className="w-full max-w-md">
            <div className="inline-flex items-center gap-2 mb-8 lg:hidden">
              <Ghost className="w-8 h-8 text-amber-500 animate-pulse" />
              <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
            </div>

            <div className="space-y-6">
              {resetSuccess ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                  <h1 className="text-2xl font-semibold text-white">Email Enviado!</h1>
                  <p className="text-gray-400 text-sm">
                    Enviamos um link de recuperação para seu email. Verifique sua caixa de entrada e siga as instruções.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetSuccess(false);
                      setResetEmail('');
                    }}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Voltar ao Login
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-8 h-8 text-amber-500" />
                      <h1 className="text-2xl font-semibold text-white">
                        Recuperar Senha
                      </h1>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Digite seu email para receber um link de recuperação
                    </p>
                  </div>

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!resetEmail) return;

                    setResetLoading(true);
                    setErrorMessage('');

                    try {
                      const result = await authService.resetPassword(resetEmail);

                      if (!result.success) {
                        setErrorMessage(result.error?.message || 'Erro ao enviar email de recuperação');
                        return;
                      }

                      setResetSuccess(true);
                    } catch (error: any) {
                      console.error('Erro inesperado ao resetar senha:', error);
                      setErrorMessage('Erro ao enviar email de recuperação. Tente novamente.');
                    } finally {
                      setResetLoading(false);
                    }
                  }} className="space-y-5">
                    <div>
                      <label htmlFor="resetEmail" className="block text-sm font-medium text-white mb-2">
                        E-mail
                      </label>
                      <input
                        type="email"
                        id="resetEmail"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="seuemail@exemplo.com"
                        required
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    {errorMessage && (
                      <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                        {errorMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={resetLoading || !resetEmail}
                      className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {resetLoading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setErrorMessage('');
                        setResetEmail('');
                      }}
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
      </div>
    );
  }

  if (showDashboard) {
    const userName = businessType === 'juridica'
      ? (razaoSocial || 'Usuário')
      : (nomeCompleto || loginEmail.split('@')[0] || registrationEmail.split('@')[0] || 'Usuário');

    return (
      <Suspense fallback={
        <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
          <Ghost className="w-16 h-16 text-amber-500 animate-pulse" />
        </div>
      }>
        <Dashboard userName={userName} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex relative">
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-gray-800">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <h2 className="text-xl font-semibold text-white">Autenticação de Dois Fatores</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800 text-center">
                <p className="text-white mb-4">Digite o código de 6 dígitos do seu aplicativo authenticator:</p>

                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full max-w-xs mx-auto px-4 py-4 text-center text-2xl font-mono rounded-xl border border-gray-700 bg-[#1a1a1a] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setShow2FAModal(false);
                    setTwoFactorCode('');
                    setPending2FAUser(null);
                    setErrorMessage('');
                  }}
                  className="flex-1 py-3 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerify2FACode}
                  disabled={twoFactorCode.length !== 6 || isSubmitting}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDocumentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Envio de documentos pendentes.</h2>
              <button
                onClick={() => setShowDocumentModal(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-400">
                Realize o upload dos seus documentos para começar utilizar a plataforma. Documentos incompletos podem fazer com que a sua solicitação seja recusada.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Frente do documento
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="frontal"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setDocumentFrontal)}
                      className="hidden"
                    />
                    <label
                      htmlFor="frontal"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors cursor-pointer bg-[#0f0f0f] hover:bg-gray-900"
                    >
                      {documentFrontal ? (
                        <div className="flex items-center gap-2 text-sm text-gray-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span>{documentFrontal.name}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <span className="text-sm text-gray-400">Clique para fazer upload de um arquivo</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Verso do documento
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="verso"
                      accept="image/*,.pdf"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setDocumentVerso)}
                      className="hidden"
                    />
                    <label
                      htmlFor="verso"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors cursor-pointer bg-[#0f0f0f] hover:bg-gray-900"
                    >
                      {documentVerso ? (
                        <div className="flex items-center gap-2 text-sm text-gray-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span>{documentVerso.name}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <span className="text-sm text-gray-400">Clique para fazer upload de um arquivo</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Selfie segurando seu documento
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="selfie"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setDocumentSelfie)}
                      className="hidden"
                    />
                    <label
                      htmlFor="selfie"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors cursor-pointer bg-[#0f0f0f] hover:bg-gray-900"
                    >
                      {documentSelfie ? (
                        <div className="flex items-center gap-2 text-sm text-gray-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span>{documentSelfie.name}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <span className="text-sm text-gray-400">Clique para fazer upload de um arquivo</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Contrato Social
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="contrato"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0] || null, setDocumentContrato)}
                      className="hidden"
                    />
                    <label
                      htmlFor="contrato"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors cursor-pointer bg-[#0f0f0f] hover:bg-gray-900"
                    >
                      {documentContrato ? (
                        <div className="flex items-center gap-2 text-sm text-gray-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span>{documentContrato.name}</span>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <span className="text-sm text-gray-400">Clique para fazer upload de um arquivo</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800">
                {errorMessage && (
                  <div className="mb-4 bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                    {errorMessage}
                  </div>
                )}
                <button
                  onClick={handleFinishRegistration}
                  disabled={!canFinishRegistration() || isSubmitting}
                  className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar Documentos e Finalizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showSuccessToast && (
        <div className="fixed top-6 right-6 bg-[#1a1a1a] rounded-xl shadow-2xl p-4 flex items-start gap-3 max-w-md z-50 animate-slide-in border border-amber-500/30">
          <div className="flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">
              Conta criada com sucesso!
            </h3>
            <p className="text-sm text-gray-400">
              Você pode continuar o cadastro da empresa agora.
            </p>
          </div>
          <button
            onClick={() => setShowSuccessToast(false)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-16 bg-[#0f0f0f]">
        <div className="text-center relative">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-amber-500/20 to-yellow-500/20 blur-3xl rounded-full"></div>
          <div className="relative inline-flex items-center gap-3">
            <Ghost className="w-16 h-16 text-amber-500 animate-pulse drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" />
            <span className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(251,191,36,0.3)]">GoldsPay</span>
          </div>
          <p className="mt-6 text-gray-400 text-lg max-w-md mx-auto">O gateway de pagamento mais confiável e rápido do Brasil</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-[#1a1a1a] flex items-center justify-start lg:justify-center p-6 lg:p-16">
        <div className="w-full max-w-lg">
          <div className="inline-flex items-center gap-2 mb-8 lg:hidden">
            <Ghost className="w-8 h-8 text-amber-500 animate-pulse" />
            <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent">GoldsPay</span>
          </div>

          {showCompanyForm ? (
            <div className="space-y-6 lg:space-y-8">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-white mb-1.5 lg:mb-2">
                  Criar Empresa
                </h1>
                <div className="flex items-center justify-end gap-2 mt-4">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <div
                      key={step}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                        step === currentStep
                          ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-black font-bold shadow-lg shadow-amber-500/50'
                          : step < currentStep
                          ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 text-black font-bold shadow-lg shadow-amber-500/50'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 transition-all duration-300 shadow-lg shadow-amber-500/40"
                    style={{ width: `${(currentStep / 5) * 100}%` }}
                  ></div>
                </div>
              </div>

              <form className="space-y-5">
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Tipo de Negócio
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setBusinessType('juridica')}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            businessType === 'juridica'
                              ? 'border-amber-500 bg-amber-500/20'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                businessType === 'juridica'
                                  ? 'border-amber-500'
                                  : 'border-gray-700'
                              }`}
                            >
                              {businessType === 'juridica' && (
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                              )}
                            </div>
                            <span className="font-medium text-white">Pessoa Jurídica</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBusinessType('fisica')}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            businessType === 'fisica'
                              ? 'border-amber-500 bg-amber-500/20'
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                businessType === 'fisica'
                                  ? 'border-amber-500'
                                  : 'border-gray-700'
                              }`}
                            >
                              {businessType === 'fisica' && (
                                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></div>
                              )}
                            </div>
                            <span className="font-medium text-white">Pessoa Física</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {businessType === 'juridica' ? (
                      <>
                        <div>
                          <label htmlFor="cnpj" className="block text-sm font-medium text-white mb-2">
                            CNPJ
                          </label>
                          <input
                            type="text"
                            id="cnpj"
                            value={formatCnpj(cnpj)}
                            onChange={handleCnpjChange}
                            placeholder="00.000.000/0000-00"
                            maxLength={18}
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">14 dígitos numéricos</p>
                        </div>

                        <div>
                          <label htmlFor="razaoSocial" className="block text-sm font-medium text-white mb-2">
                            Razão Social
                          </label>
                          <input
                            type="text"
                            id="razaoSocial"
                            value={razaoSocial}
                            onChange={(e) => setRazaoSocial(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label htmlFor="cpf" className="block text-sm font-medium text-white mb-2">
                            CPF
                          </label>
                          <input
                            type="text"
                            id="cpf"
                            value={formatCpf(cpf)}
                            onChange={handleCpfChange}
                            placeholder="000.000.000-00"
                            maxLength={14}
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                          />
                          <p className="text-xs text-gray-400 mt-1">11 dígitos numéricos</p>
                        </div>

                        <div>
                          <label htmlFor="nomeCompleto" className="block text-sm font-medium text-white mb-2">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            id="nomeCompleto"
                            value={nomeCompleto}
                            onChange={handleNomeCompletoChange}
                            placeholder="João Silva"
                            className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                          />
                          {nomeCompletoError && (
                            <p className="text-xs text-amber-500 mt-1">Digite nome e sobrenome</p>
                          )}
                        </div>
                      </>
                    )}

                    <div>
                      <label htmlFor="nomeFatura" className="block text-sm font-medium text-white mb-2">
                        Nome na Fatura
                      </label>
                      <input
                        type="text"
                        id="nomeFatura"
                        value={nomeFatura}
                        onChange={(e) => setNomeFatura(e.target.value)}
                        maxLength={12}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                      <p className="text-xs text-gray-400 mt-1">Máximo de 12 caracteres</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      disabled={!canProceedToStep2()}
                      className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                    </button>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div>
                      <label htmlFor="mediaFaturamento" className="block text-sm font-medium text-white mb-2">
                        Média de Faturamento
                      </label>
                      <input
                        type="text"
                        id="mediaFaturamento"
                        value={formatCurrency(mediaFaturamento)}
                        onChange={(e) => handleCurrencyChange(e.target.value, setMediaFaturamento)}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="ticketMedio" className="block text-sm font-medium text-white mb-2">
                        Ticket Médio
                      </label>
                      <input
                        type="text"
                        id="ticketMedio"
                        value={formatCurrency(ticketMedio)}
                        onChange={(e) => handleCurrencyChange(e.target.value, setTicketMedio)}
                        placeholder="R$ 0,00"
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="siteEmpresa" className="block text-sm font-medium text-white mb-2">
                        Site da Empresa
                      </label>
                      <input
                        type="text"
                        id="siteEmpresa"
                        value={siteEmpresa}
                        onChange={handleSiteEmpresaChange}
                        placeholder="https://sitedaempresa.com"
                        className={`w-full px-4 py-3.5 rounded-xl border transition-all bg-[#0f0f0f] text-white placeholder-gray-400 ${
                          siteEmpresaError
                            ? 'border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500'
                            : 'border-gray-500 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-white'
                        }`}
                      />
                      {siteEmpresaError && (
                        <p className="text-xs text-amber-500 mt-1">
                          Digite uma URL válida (ex: https://sitedaempresa.com)
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="produtosVendidos" className="block text-sm font-medium text-white mb-2">
                        Produtos Vendidos
                      </label>
                      <input
                        type="text"
                        id="produtosVendidos"
                        value={produtosVendidos}
                        onChange={(e) => setProdutosVendidos(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <label htmlFor="vendeProdutosFisicos" className="text-sm font-medium text-white">
                        Vende produtos físicos?
                      </label>
                      <button
                        type="button"
                        onClick={() => setVendeProdutosFisicos(!vendeProdutosFisicos)}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 ${
                          vendeProdutosFisicos ? 'bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500' : 'bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            vendeProdutosFisicos ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 py-4 bg-[#0f0f0f] border-2 border-amber-500 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all duration-200"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={!canProceedToStep3()}
                        className="flex-1 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <div>
                      <label htmlFor="nomeRepresentante" className="block text-sm font-medium text-white mb-2">
                        Nome do Representante
                      </label>
                      <input
                        type="text"
                        id="nomeRepresentante"
                        value={nomeRepresentante}
                        onChange={(e) => setNomeRepresentante(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="cpfRepresentante" className="block text-sm font-medium text-white mb-2">
                        CPF do Representante
                      </label>
                      <input
                        type="text"
                        id="cpfRepresentante"
                        value={formatCpf(cpfRepresentante)}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value.length <= 11) {
                            setCpfRepresentante(value);
                          }
                        }}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="emailRepresentante" className="block text-sm font-medium text-white mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        id="emailRepresentante"
                        value={emailRepresentante}
                        onChange={handleEmailRepresentanteChange}
                        placeholder="meuemail@exemplo.com"
                        className={`w-full px-4 py-3.5 rounded-xl border transition-all bg-[#0f0f0f] text-white placeholder:text-gray-500 ${
                          emailRepresentanteError
                            ? 'border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500'
                            : 'border-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent'
                        }`}
                      />
                      {emailRepresentanteError && (
                        <p className="text-xs text-amber-500 mt-1">
                          Digite um email válido (ex: meuemail@exemplo.com)
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="telefoneRepresentante" className="block text-sm font-medium text-white mb-2">
                        Telefone
                      </label>
                      <input
                        type="text"
                        id="telefoneRepresentante"
                        value={formatTelefone(telefoneRepresentante)}
                        onChange={handleTelefoneChange}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="dataNascimento" className="block text-sm font-medium text-white mb-2">
                        Data de Nascimento
                      </label>
                      <input
                        type="text"
                        id="dataNascimento"
                        value={formatDataNascimento(dataNascimento)}
                        onChange={handleDataNascimentoChange}
                        placeholder="DD/MM/AAAA"
                        maxLength={10}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="nomeMae" className="block text-sm font-medium text-white mb-2">
                        Nome da Mãe
                      </label>
                      <input
                        type="text"
                        id="nomeMae"
                        value={nomeMae}
                        onChange={(e) => setNomeMae(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 py-4 bg-[#0f0f0f] border-2 border-amber-500 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all duration-200"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        disabled={!canProceedToStep4()}
                        className="flex-1 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 4 && (
                  <>
                    <div>
                      <label htmlFor="cep" className="block text-sm font-medium text-white mb-2">
                        CEP
                      </label>
                      <input
                        type="text"
                        id="cep"
                        value={formatCep(cep)}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="logradouro" className="block text-sm font-medium text-white mb-2">
                        Logradouro
                      </label>
                      <input
                        type="text"
                        id="logradouro"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="numero" className="block text-sm font-medium text-white mb-2">
                        Número
                      </label>
                      <input
                        type="text"
                        id="numero"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="bairro" className="block text-sm font-medium text-white mb-2">
                        Bairro
                      </label>
                      <input
                        type="text"
                        id="bairro"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="cidade" className="block text-sm font-medium text-white mb-2">
                        Cidade
                      </label>
                      <input
                        type="text"
                        id="cidade"
                        value={cidade}
                        onChange={(e) => setCidade(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="estado" className="block text-sm font-medium text-white mb-2">
                        Estado
                      </label>
                      <input
                        type="text"
                        id="estado"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value.toUpperCase())}
                        maxLength={2}
                        placeholder="GO"
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="complemento" className="block text-sm font-medium text-white mb-2">
                        Complemento
                      </label>
                      <input
                        type="text"
                        id="complemento"
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all text-white placeholder:text-gray-500"
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="flex-1 py-4 bg-[#0f0f0f] border-2 border-amber-500 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all duration-200"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(5)}
                        disabled={!canProceedToStep5()}
                        className="flex-1 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Próximo
                      </button>
                    </div>
                  </>
                )}

                {currentStep === 5 && (
                  <>
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-lg font-semibold text-white mb-1">Confirmação</h2>
                        <p className="text-sm text-gray-400">
                          Verifique se todas as informações estão corretas antes de finalizar o cadastro.
                        </p>
                      </div>

                      <div className="bg-[#0f0f0f] rounded-xl p-5 space-y-5 border border-gray-800">
                        <div>
                          <h3 className="text-sm font-semibold text-amber-500 mb-3">Informações Básicas</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tipo de Negócio:</span>
                              <span className="font-medium text-white">
                                {businessType === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Documento:</span>
                              <span className="font-medium text-white">
                                {businessType === 'juridica' ? formatCnpj(cnpj) : formatCpf(cpf)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Nome:</span>
                              <span className="font-medium text-white">
                                {businessType === 'juridica' ? razaoSocial : nomeCompleto}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Nome na Fatura:</span>
                              <span className="font-medium text-white">{nomeFatura}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-amber-500 mb-3">Informações Financeiras</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Média de Faturamento:</span>
                              <span className="font-medium text-white">{formatCurrency(mediaFaturamento)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Ticket Médio:</span>
                              <span className="font-medium text-white">{formatCurrency(ticketMedio)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Vende produtos físicos:</span>
                              <span className="font-medium text-white">{vendeProdutosFisicos ? 'Sim' : 'Não'}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-amber-500 mb-3">Informações Comerciais</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Site da Empresa:</span>
                              <span className="font-medium text-white truncate max-w-[200px]">{siteEmpresa}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Produtos Vendidos:</span>
                              <span className="font-medium text-white truncate max-w-[200px]">{produtosVendidos}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-amber-500 mb-3">Informações do Representante</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Nome do Representante:</span>
                              <span className="font-medium text-white">{nomeRepresentante}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">CPF do Representante:</span>
                              <span className="font-medium text-white">{formatCpf(cpfRepresentante)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Email:</span>
                              <span className="font-medium text-white truncate max-w-[200px]">{emailRepresentante}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Telefone:</span>
                              <span className="font-medium text-white">{formatTelefone(telefoneRepresentante)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Data de Nascimento:</span>
                              <span className="font-medium text-white">{formatDataNascimento(dataNascimento)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Nome da Mãe:</span>
                              <span className="font-medium text-white">{nomeMae}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-semibold text-amber-500 mb-3">Endereço</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">CEP:</span>
                              <span className="font-medium text-white">{formatCep(cep)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Logradouro:</span>
                              <span className="font-medium text-white">{logradouro}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Número:</span>
                              <span className="font-medium text-white">{numero}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Bairro:</span>
                              <span className="font-medium text-white">{bairro}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Cidade:</span>
                              <span className="font-medium text-white">{cidade}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Estado:</span>
                              <span className="font-medium text-white">{estado}</span>
                            </div>
                            {complemento && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Complemento:</span>
                                <span className="font-medium text-white">{complemento}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(4)}
                        className="flex-1 py-4 bg-[#0f0f0f] border-2 border-amber-500 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all duration-200"
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDocumentModal(true)}
                        className="flex-1 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200"
                      >
                        Finalizar
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          ) : !isLoginView ? (
            <div className="space-y-6 lg:space-y-8">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-white mb-1.5 lg:mb-2">
                  Crie sua conta
                </h1>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
                  Preencha os dados para criar sua conta.
                </p>
              </div>

              <form className="space-y-4 lg:space-y-5" onSubmit={handleCreateAccount}>
                <div>
                  <label htmlFor="email" className="block text-xs lg:text-sm font-medium text-white mb-1.5 lg:mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={registrationEmail}
                    onChange={(e) => setRegistrationEmail(e.target.value)}
                    placeholder="meuemail@exemplo.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 lg:px-4 py-3 lg:py-3.5 rounded-lg lg:rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all text-sm lg:text-base text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs lg:text-sm font-medium text-white mb-1.5 lg:mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full px-3.5 lg:px-4 py-3 lg:py-3.5 pr-11 lg:pr-12 rounded-lg lg:rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all text-sm lg:text-base text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 lg:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 lg:w-5 h-4.5 lg:h-5" /> : <Eye className="w-4.5 lg:w-5 h-4.5 lg:h-5" />}
                    </button>
                  </div>
                  {passwordStrength === 'weak' && (
                    <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 text-xs lg:text-sm text-amber-500">
                      <AlertCircle className="w-4 h-4" />
                      <span>Senha muito fraca</span>
                    </div>
                  )}
                  {passwordStrength === 'medium' && (
                    <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 text-xs lg:text-sm text-orange-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Senha média</span>
                    </div>
                  )}
                  {passwordStrength === 'strong' && (
                    <div className="mt-1.5 lg:mt-2 flex items-center gap-1.5 text-xs lg:text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Senha difícil</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs lg:text-sm font-medium text-white mb-1.5 lg:mb-2">
                    Confirme sua senha
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      placeholder="Digite sua senha novamente"
                      value={confirmPassword}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 lg:px-4 py-3 lg:py-3.5 pr-11 lg:pr-12 rounded-lg lg:rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all text-sm lg:text-base text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 lg:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4.5 lg:w-5 h-4.5 lg:h-5" /> : <Eye className="w-4.5 lg:w-5 h-4.5 lg:h-5" />}
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
                  disabled={!canSubmit() || isSubmitting}
                  className="w-full py-3.5 lg:py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-lg lg:rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 mt-6 lg:mt-8 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Conta'}
                </button>

                <p className="text-center text-xs lg:text-sm text-gray-400 pt-1 lg:pt-2">
                  Já possui conta?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLoginView(true)}
                    className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                  >
                    Entrar
                  </button>
                </p>
              </form>
            </div>
          ) : (
            <div className="space-y-6 lg:space-y-8">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-white mb-1.5 lg:mb-2">
                  Entrar na minha conta.
                </h1>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">
                  Preencha os campos abaixo para acessar sua conta
                </p>
              </div>

              <form className="space-y-4 lg:space-y-5" onSubmit={async (e) => {
                e.preventDefault();
                if (!loginEmail || !loginPassword) return;

                setIsSubmitting(true);
                setErrorMessage('');

                try {
                  const result = await authService.signIn(loginEmail, loginPassword);

                  if (!result.success) {
                    setErrorMessage(result.error?.message || 'Erro ao fazer login');
                    return;
                  }

                  const user = result.data;

                  if (!supabase) {
                    setErrorMessage('Por favor, configure as credenciais do banco de dados');
                    return;
                  }

                  const { data: mfaSettings } = await supabase
                    .from('user_mfa_settings')
                    .select('is_enabled')
                    .eq('user_id', user.id)
                    .maybeSingle();

                  if (mfaSettings?.is_enabled) {
                    setPending2FAUser(user);
                    setShow2FAModal(true);
                    return;
                  }

                  if (user.email === 'anapaulamagioli899@gmail.com') {
                    setShowDashboard(true);
                    return;
                  }

                  const { data: profile } = await supabase
                    .from('company_profiles')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                  if (profile) {
                    const status = profile.status || 'pending';
                    setAccountStatus(status);
                    setRejectionReason(profile.rejection_reason || '');

                    if (status === 'approved') {
                      setShowDashboard(true);
                    } else {
                      setShowPendingApproval(true);
                    }
                  } else {
                    setShowCompanyForm(true);
                  }
                } catch (error: any) {
                  setErrorMessage('Erro ao fazer login. Tente novamente.');
                } finally {
                  setIsSubmitting(false);
                }
              }}>
                <div>
                  <label htmlFor="loginEmail" className="block text-xs lg:text-sm font-medium text-white mb-1.5 lg:mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="meuemail@exemplo.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 lg:px-4 py-3 lg:py-3.5 rounded-lg lg:rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all text-sm lg:text-base text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="loginPassword" className="block text-xs lg:text-sm font-medium text-white mb-1.5 lg:mb-2">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="loginPassword"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      minLength={6}
                      autoComplete="current-password"
                      className="w-full px-3.5 lg:px-4 py-3 lg:py-3.5 pr-11 lg:pr-12 rounded-lg lg:rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-red-800 focus:border-transparent transition-all text-sm lg:text-base text-white placeholder:text-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 lg:right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4.5 lg:w-5 h-4.5 lg:h-5" /> : <Eye className="w-4.5 lg:w-5 h-4.5 lg:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="text-left">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                  >
                    Esqueci a senha
                  </button>
                </div>

                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 lg:py-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-400 hover:from-yellow-400 hover:via-amber-500 hover:to-yellow-400 text-black font-bold rounded-lg lg:rounded-xl shadow-[0_0_30px_rgba(251,191,36,0.6)] hover:shadow-[0_0_50px_rgba(251,191,36,0.9)] transition-all duration-300 mt-6 lg:mt-8 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? 'Entrando...' : 'Entrar'}
                </button>

                <p className="text-center text-xs lg:text-sm text-gray-400 pt-1 lg:pt-2">
                  Novo por aqui?{' '}
                  <button
                    type="button"
                    onClick={() => setIsLoginView(false)}
                    className="text-amber-500 hover:text-amber-400 font-semibold transition-colors"
                  >
                    Criar uma conta
                  </button>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
