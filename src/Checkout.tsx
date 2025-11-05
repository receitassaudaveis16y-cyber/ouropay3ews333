import { useState } from 'react';
import { X, CreditCard, Smartphone, FileText, CheckCircle2, Copy, Download } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface CheckoutProps {
  amount: number;
  description: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

function Checkout({ amount, description, onClose, onSuccess }: CheckoutProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [error, setError] = useState('');

  // PIX data
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState('');
  const [pixCopied, setPixCopied] = useState(false);

  // Boleto data
  const [boletoPdf, setBoletoPdf] = useState('');
  const [boletoBarcode, setBoletoBarcode] = useState('');
  const [boletoBarcodeCopied, setBoletoBarcodeCopied] = useState(false);

  // Customer data
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Credit card data
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardExpirationDate, setCardExpirationDate] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  const formatDocument = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      // CPF: 000.000.000-00
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
      if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    } else {
      // CNPJ: 00.000.000/0000-00
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
      if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
      if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ').substring(0, 19);
  };

  const formatExpirationDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      setCustomerDocument(value);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setCustomerPhone(value);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      setCardNumber(value);
    }
  };

  const handleExpirationDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardExpirationDate(value);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCardCvv(value);
    }
  };

  const copyToClipboard = async (text: string, setCopied: (value: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  };

  const canSubmit = () => {
    const hasBasicInfo = customerName && customerEmail && customerDocument.length >= 11;

    if (selectedMethod === 'credit_card') {
      return hasBasicInfo && cardNumber.length === 16 && cardHolderName && cardExpirationDate.length === 4 && cardCvv.length >= 3;
    }

    return hasBasicInfo;
  };

  const handlePayment = async () => {
    if (!supabase || !canSubmit()) return;

    setIsProcessing(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const paymentData: any = {
        amount,
        payment_method: selectedMethod,
        customer: {
          name: customerName,
          email: customerEmail,
          document: customerDocument,
          phone: customerPhone || undefined,
        },
        description,
      };

      if (selectedMethod === 'credit_card') {
        paymentData.credit_card = {
          card_number: cardNumber,
          card_holder_name: cardHolderName,
          card_expiration_date: cardExpirationDate,
          card_cvv: cardCvv,
        };
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      if (selectedMethod === 'pix' && result.pix) {
        setPixQrCode(result.pix.qr_code);
        setPixQrCodeUrl(result.pix.qr_code_url);
      } else if (selectedMethod === 'boleto' && result.boleto) {
        setBoletoPdf(result.boleto.pdf);
        setBoletoBarcode(result.boleto.barcode);
      } else if (selectedMethod === 'credit_card' && result.status === 'paid') {
        setPaymentCompleted(true);
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Finalizar Pagamento</h2>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {paymentCompleted ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Pagamento aprovado!</h3>
              <p className="text-gray-400">Seu pagamento foi processado com sucesso.</p>
            </div>
          ) : pixQrCode ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Escaneie o QR Code</h3>
                <p className="text-sm text-gray-400 mb-4">Use o app do seu banco para pagar</p>
                {pixQrCodeUrl && (
                  <img src={pixQrCodeUrl} alt="QR Code PIX" className="mx-auto mb-4 rounded-lg" />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Ou copie o código PIX
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pixQrCode}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(pixQrCode, setPixCopied)}
                    className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition-colors flex items-center gap-2"
                  >
                    {pixCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {pixCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-sm text-amber-400">
                  O pagamento será confirmado automaticamente após o processamento do PIX.
                </p>
              </div>
            </div>
          ) : boletoPdf ? (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Boleto gerado!</h3>
                <p className="text-sm text-gray-400 mb-4">Baixe ou copie o código de barras</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Código de barras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={boletoBarcode}
                    readOnly
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(boletoBarcode, setBoletoBarcodeCopied)}
                    className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl transition-colors flex items-center gap-2"
                  >
                    {boletoBarcodeCopied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    {boletoBarcodeCopied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <a
                href={boletoPdf}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Baixar Boleto (PDF)
              </a>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <p className="text-sm text-amber-400">
                  O boleto tem validade de 3 dias. O pagamento será confirmado em até 2 dias úteis após o pagamento.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-[#0f0f0f] rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Valor a pagar:</span>
                  <span className="text-2xl font-bold text-white">
                    {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-3">
                  Método de pagamento
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('pix')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedMethod === 'pix'
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <Smartphone className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <span className="text-sm font-medium text-white block">PIX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('credit_card')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedMethod === 'credit_card'
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <CreditCard className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <span className="text-sm font-medium text-white block">Cartão</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('boleto')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedMethod === 'boleto'
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <FileText className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <span className="text-sm font-medium text-white block">Boleto</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">Dados do pagador</h3>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                    placeholder="João Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                    placeholder="joao@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    CPF/CNPJ
                  </label>
                  <input
                    type="text"
                    value={formatDocument(customerDocument)}
                    onChange={handleDocumentChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                    placeholder="000.000.000-00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Telefone (opcional)
                  </label>
                  <input
                    type="text"
                    value={formatPhone(customerPhone)}
                    onChange={handlePhoneChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {selectedMethod === 'credit_card' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">Dados do cartão</h3>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Número do cartão
                    </label>
                    <input
                      type="text"
                      value={formatCardNumber(cardNumber)}
                      onChange={handleCardNumberChange}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                      placeholder="0000 0000 0000 0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Nome no cartão
                    </label>
                    <input
                      type="text"
                      value={cardHolderName}
                      onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                      placeholder="JOÃO SILVA"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Validade
                      </label>
                      <input
                        type="text"
                        value={formatExpirationDate(cardExpirationDate)}
                        onChange={handleExpirationDateChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                        placeholder="MM/AA"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                        placeholder="000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={!canSubmit() || isProcessing}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Processando...' : `Pagar ${amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Checkout;
