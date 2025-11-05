import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { CreditCard, Lock, ArrowLeft, Zap, Smartphone } from 'lucide-react';

interface PaymentPageProps {
  slug: string;
  onBack: () => void;
}

interface PaymentLinkData {
  id: string;
  title: string;
  description: string;
  amount: number;
  quantity: number;
  shipping_amount: number;
  user_id: string;
}

type PaymentMethod = 'credit_card' | 'pix' | 'pix_credit';
type DocumentType = 'CPF' | 'CNPJ';

function PaymentPage({ slug, onBack }: PaymentPageProps) {
  const [loading, setLoading] = useState(true);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit_card');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('CPF');
  const [customerDocument, setCustomerDocument] = useState('');
  const [countryCode, setCountryCode] = useState('+55');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    loadPaymentLink();
  }, [slug]);

  const loadPaymentLink = async () => {
    if (!supabase) {
      setError('Erro ao carregar dados do pagamento');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('payment_links')
        .select('id, title, description, amount, quantity, shipping_amount, user_id')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Link de pagamento não encontrado ou inativo');
        setPaymentLink(null);
      } else {
        setPaymentLink(data);
        await incrementClicks(data.id);
      }
    } catch (err) {
      console.error('Erro ao carregar link:', err);
      setError('Erro ao carregar dados do pagamento');
    } finally {
      setLoading(false);
    }
  };

  const incrementClicks = async (linkId: string) => {
    if (!supabase) return;

    try {
      await supabase.rpc('increment_payment_link_clicks', { link_id: linkId });
    } catch (err) {
      console.error('Erro ao incrementar cliques:', err);
    }
  };

  const formatCurrency = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleDocumentChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setCustomerDocument(digits.slice(0, 14));
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setCustomerPhone(digits.slice(0, 11));
  };

  const handlePayment = async () => {
    if (!customerName || !customerEmail || !customerDocument || !customerPhone || !paymentLink || !supabase) {
      setError('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (customerDocument.length < 11) {
      setError('CPF/CNPJ inválido');
      return;
    }

    if (customerPhone.length < 10) {
      setError('Telefone inválido');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const totalAmountInReais = totalAmount / 100;

      const paymentData = {
        amount: totalAmountInReais,
        payment_method: paymentMethod === 'pix_credit' ? 'pix' : paymentMethod,
        customer: {
          name: customerName,
          email: customerEmail,
          document: customerDocument,
          phone: customerPhone,
        },
        description: paymentLink.title,
        type: 'payment_link',
        userId: paymentLink.user_id,
      };

      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const result = await response.json();

      await supabase
        .from('payment_links')
        .update({
          sales: (paymentLink.sales || 0) + 1
        })
        .eq('id', paymentLink.id);

      if (paymentMethod === 'pix' || paymentMethod === 'pix_credit') {
        if (result.pix) {
          window.location.href = `/payment-success?method=pix&qr=${encodeURIComponent(result.pix.qr_code)}&amount=${totalAmountInReais}`;
        } else {
          throw new Error('QR Code PIX não gerado');
        }
      } else if (paymentMethod === 'credit_card') {
        if (result.status === 'paid') {
          window.location.href = `/payment-success?method=card&amount=${totalAmountInReais}`;
        } else {
          throw new Error('Pagamento não aprovado');
        }
      }

    } catch (err: any) {
      console.error('Erro ao processar pagamento:', err);
      setError(err.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentLink) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-gray-800">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Link Inválido</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={onBack}
              className="flex items-center gap-2 mx-auto px-6 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalAmount = paymentLink
    ? (paymentLink.amount * paymentLink.quantity) + paymentLink.shipping_amount
    : 0;

  return (
    <div className="min-h-screen bg-[#0f0f0f] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
              <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 p-6">
                <h1 className="text-2xl font-bold text-black mb-2">{paymentLink?.title}</h1>
                <p className="text-black/70 text-sm">Pague com cartões digitais ou Pix Crédito</p>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Forma de pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('credit_card')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'credit_card'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-white block text-center">Cartão</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'pix'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-white block text-center">PIX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix_credit')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'pix_credit'
                          ? 'border-amber-500 bg-amber-500/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <Smartphone className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                      <span className="text-sm font-medium text-white block text-center">PIX Crédito</span>
                    </button>
                  </div>
                </div>

                <div className="border-t border-gray-800 pt-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Dados pessoais</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        E-mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="anasilva@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Nome completo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ana Cristina da Silva"
                        maxLength={64}
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-500"
                      />
                      <div className="text-xs text-gray-500 mt-1">{customerName.length}/64</div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Documento <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <button
                          type="button"
                          onClick={() => setDocumentType('CPF')}
                          className={`px-4 py-2 rounded-lg border-2 transition-all ${
                            documentType === 'CPF'
                              ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                              : 'border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          CPF
                        </button>
                        <button
                          type="button"
                          onClick={() => setDocumentType('CNPJ')}
                          className={`px-4 py-2 rounded-lg border-2 transition-all ${
                            documentType === 'CNPJ'
                              ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                              : 'border-gray-700 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          CNPJ
                        </button>
                      </div>
                      <input
                        type="text"
                        value={formatDocument(customerDocument)}
                        onChange={(e) => handleDocumentChange(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Código do país
                      </label>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="+55">Brasil (+55)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Celular com DDD <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formatPhone(customerPhone)}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="(00) 0 0000-0000"
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                    {error}
                  </div>
                )}

                <div className="border-t border-gray-800 pt-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Lock className="w-4 h-4" />
                    <span>Pagamento protegido</span>
                  </div>

                  <button
                    onClick={handlePayment}
                    disabled={isProcessing || !customerName || !customerEmail || !customerDocument || !customerPhone}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isProcessing ? 'Processando...' : 'Continuar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Resumo da compra</h2>

              <div className="space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-white font-medium">{paymentLink?.title}</span>
                  </div>
                  <div className="text-sm text-gray-400">
                    {paymentLink?.quantity} {paymentLink?.quantity === 1 ? 'unidade' : 'unidades'}
                  </div>
                  <div className="text-lg font-bold text-white mt-2">
                    {formatCurrency(paymentLink?.amount || 0)}
                  </div>
                </div>

                {paymentLink?.description && (
                  <p className="text-xs text-gray-500 pb-4 border-b border-gray-800">
                    {paymentLink.description}
                  </p>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Subtotal</span>
                    <span className="text-white font-semibold">
                      {formatCurrency(paymentLink ? paymentLink.amount * paymentLink.quantity : 0)}
                    </span>
                  </div>

                  {paymentLink && paymentLink.shipping_amount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Frete</span>
                      <span className="text-white font-semibold">
                        {formatCurrency(paymentLink.shipping_amount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t-2 border-amber-500/30">
                    <span className="text-amber-500 font-bold">Total a pagar</span>
                    <span className="text-2xl font-bold text-amber-500">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
