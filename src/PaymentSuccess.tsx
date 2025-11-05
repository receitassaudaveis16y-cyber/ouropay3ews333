import { useState, useEffect } from 'react';
import { CheckCircle, Copy, Download, ArrowLeft, Zap, CreditCard, Clock, QrCode } from 'lucide-react';

function PaymentSuccess() {
  const [copied, setCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [countdown, setCountdown] = useState(900);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const method = params.get('method') as 'pix' | 'card';
    const qr = params.get('qr');
    const amountStr = params.get('amount');

    setPaymentMethod(method);
    setQrCode(qr);
    setAmount(amountStr ? parseFloat(amountStr) : 0);
  }, []);

  useEffect(() => {
    if (paymentMethod === 'pix' && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [paymentMethod, countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCopy = () => {
    if (qrCode) {
      navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 400;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 400, 400);

    const qrSize = 10;
    const padding = 20;
    const totalSize = qrSize * 33 + padding * 2;
    const offsetX = (400 - totalSize) / 2;
    const offsetY = (400 - totalSize) / 2;

    for (let i = 0; i < qrCode.length; i++) {
      const row = Math.floor(i / 33);
      const col = i % 33;

      if (qrCode[i] === '1') {
        ctx.fillStyle = 'black';
        ctx.fillRect(
          offsetX + padding + col * qrSize,
          offsetY + padding + row * qrSize,
          qrSize,
          qrSize
        );
      }
    }

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'qrcode-pix.png';
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleGoBack = () => {
    window.location.href = '/';
  };

  if (!paymentMethod) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (paymentMethod === 'card') {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Pagamento Aprovado!</h1>
              <p className="text-white/80">Sua transação foi processada com sucesso</p>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between py-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <CreditCard className="w-6 h-6 text-black" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Método de Pagamento</div>
                    <div className="text-lg font-semibold text-white">Cartão de Crédito</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-b border-gray-800">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Valor Pago</div>
                  <div className="text-3xl font-bold text-green-500">{formatCurrency(amount)}</div>
                </div>
              </div>

              <div className="bg-green-500/10 border border-green-500 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-500 mb-3">O que acontece agora?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Confirmação por Email</p>
                      <p className="text-xs text-gray-400 mt-1">Você receberá um comprovante no email cadastrado</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">Processamento Imediato</p>
                      <p className="text-xs text-gray-400 mt-1">Seu pedido já está sendo processado</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGoBack}
                className="w-full py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4">
              <Zap className="w-12 h-12 text-amber-500" />
            </div>
            <h1 className="text-3xl font-bold text-black mb-2">Pague com PIX</h1>
            <p className="text-black/70">Escaneie o QR Code ou copie o código</p>
          </div>

          <div className="p-8 space-y-6">
            {countdown > 0 ? (
              <div className="flex items-center justify-center gap-2 py-3 bg-amber-500/10 border border-amber-500 rounded-xl">
                <Clock className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 font-semibold">
                  Expira em {formatTime(countdown)}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 bg-red-500/10 border border-red-500 rounded-xl">
                <Clock className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-semibold">
                  PIX expirado. Gere um novo pagamento.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between py-4 border-b border-gray-800">
              <div>
                <div className="text-sm text-gray-400 mb-1">Valor a Pagar</div>
                <div className="text-3xl font-bold text-white">{formatCurrency(amount)}</div>
              </div>
            </div>

            {qrCode && countdown > 0 && (
              <>
                <div className="text-center">
                  <div className="inline-block bg-white p-6 rounded-xl mb-4">
                    <QrCode className="w-48 h-48 text-black" />
                  </div>
                  <p className="text-sm text-gray-400">Escaneie este QR Code com o app do seu banco</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Código PIX (Copia e Cola)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qrCode}
                      readOnly
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-white text-sm font-mono break-all"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDownloadQR}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>Baixar QR Code</span>
                </button>

                <div className="bg-blue-500/10 border border-blue-500 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-blue-500 mb-3">Como pagar com PIX?</h3>
                  <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                    <li>Abra o app do seu banco</li>
                    <li>Escolha a opção Pagar com PIX</li>
                    <li>Escaneie o QR Code ou cole o código acima</li>
                    <li>Confirme o pagamento</li>
                  </ol>
                </div>

                <div className="bg-green-500/10 border border-green-500 rounded-xl p-6">
                  <h3 className="text-sm font-semibold text-green-500 mb-3">Após o pagamento</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Confirmação Automática</p>
                        <p className="text-xs text-gray-400 mt-1">O pagamento é confirmado na hora</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white">Comprovante por Email</p>
                        <p className="text-xs text-gray-400 mt-1">Você receberá uma confirmação no email cadastrado</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;
