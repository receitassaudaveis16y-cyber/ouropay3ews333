import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet as WalletIcon, TrendingDown, ArrowDownToLine, Eye, EyeOff, DollarSign, Clock, CheckCircle, XCircle, ArrowUpToLine, Copy, QrCode } from 'lucide-react';

interface WalletProps {
  userId: string;
}

interface Wallet {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_withdrawn: number;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  bank_name: string;
  account_number: string;
  requested_at: string;
  completed_at: string | null;
}

interface Deposit {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_proof_url?: string;
  requested_at: string;
  completed_at: string | null;
}

function Wallet({ userId }: WalletProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [showValues, setShowValues] = useState(true);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [accountNumber, setAccountNumber] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('pix');
  
  // Novos estados para QR Code
  const [pixQrCode, setPixQrCode] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    if (!supabase || !userId) return;

    const loadWallet = async () => {
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!walletData) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert([{
            user_id: userId,
            available_balance: 0,
            pending_balance: 0,
            total_withdrawn: 0
          }])
          .select()
          .single();

        if (newWallet) setWallet(newWallet);
      } else {
        setWallet(walletData);
      }
    };

    const loadWithdrawals = async () => {
      const { data } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) setWithdrawals(data);
    };

    const loadDeposits = async () => {
      const { data } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) setDeposits(data);
    };

    loadWallet();
    loadWithdrawals();
    loadDeposits();
  }, [userId, supabase]);

  // Polling para verificar pagamento
  useEffect(() => {
    if (!showQrCode || !supabase) return;

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('deposits')
          .select('status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data?.status === 'completed') {
          clearInterval(interval);
          setShowQrCode(false);
          setShowDepositModal(false);
          alert('Pagamento confirmado! 🎉');
          // Recarregar dados
          window.location.reload();
        }
      } catch (error) {
        console.error('Erro ao verificar pagamento:', error);
      }
    }, 5000);

    // Limpar após 15 minutos
    const timeout = setTimeout(() => {
      clearInterval(interval);
      alert('PIX expirado. Gere um novo.');
      setShowQrCode(false);
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [showQrCode, userId, supabase]);

  const handleWithdraw = async () => {
    if (!supabase || !wallet || !userId) return;

    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      alert('Por favor, informe um valor válido para o saque');
      return;
    }

    if (amount > wallet.available_balance) {
      alert(`Saldo insuficiente. Você tem ${formatCurrency(wallet.available_balance)} disponível para saque`);
      return;
    }

    if (!bankName.trim() || !accountNumber.trim()) {
      alert('Por favor, preencha todos os dados bancários');
      return;
    }

    const minWithdrawal = 10;
    if (amount < minWithdrawal) {
      alert(`O valor mínimo para saque é ${formatCurrency(minWithdrawal)}`);
      return;
    }

    setPaymentLoading(true);

    try {
      const { data: currentWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!currentWallet) {
        alert('Carteira não encontrada');
        setPaymentLoading(false);
        return;
      }

      if (parseFloat(currentWallet.available_balance) < amount) {
        alert(`Saldo insuficiente. Você tem ${formatCurrency(parseFloat(currentWallet.available_balance))} disponível para saque`);
        setWallet(currentWallet);
        setPaymentLoading(false);
        return;
      }

      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .insert([{
          user_id: userId,
          wallet_id: currentWallet.id,
          amount: amount,
          bank_name: bankName.trim(),
          account_type: accountType,
          account_number: accountNumber.trim(),
          status: 'pending'
        }])
        .select()
        .single();

      if (error) {
        console.error('Withdrawal error:', error);

        if (error.message.includes('Insufficient balance') || error.message.includes('insufficient')) {
          alert('Saldo insuficiente para realizar o saque. Verifique seu saldo disponível');
        } else if (error.message.includes('foreign key') || error.message.includes('wallet_id')) {
          alert('Erro ao processar saque. Carteira não encontrada');
        } else {
          alert(`Erro ao processar saque: ${error.message}`);
        }

        const { data: refreshedWallet } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (refreshedWallet) {
          setWallet(refreshedWallet);
        }

        return;
      }

      const { data: updatedWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (updatedWallet) {
        setWallet(updatedWallet);
      }

      const { data: updatedWithdrawals } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (updatedWithdrawals) {
        setWithdrawals(updatedWithdrawals);
      }

      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountType('checking');

      alert(`Saque de ${formatCurrency(amount)} solicitado com sucesso! O valor está sendo processado e será transferido em até 3 dias úteis`);

    } catch (error: any) {
      console.error('Erro ao processar saque:', error);

      if (error.message && error.message.includes('Insufficient balance')) {
        alert('Saldo insuficiente para realizar o saque');
      } else {
        alert('Erro ao processar saque. Por favor, tente novamente mais tarde');
      }

      const { data: refreshedWallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (refreshedWallet) {
        setWallet(refreshedWallet);
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!supabase || !wallet || !userId) return;

    const amount = parseFloat(depositAmount);
    if (amount <= 0) {
      alert('Valor mínimo: R$ 1,00');
      return;
    }

    setPaymentLoading(true);

    try {
      // Passo 1: Criar registro no banco
      const { data: deposit, error: depositError } = await supabase
        .from('deposits')
        .insert([{
          user_id: userId,
          wallet_id: wallet.id,
          amount,
          payment_method: depositMethod,
          status: 'pending'
        }])
        .select()
        .single();

      if (depositError) throw depositError;

      // Passo 2: Chamar Edge Function para gerar PIX
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment', {
        body: {
          amount: amount,
          userId: userId,
          depositId: deposit.id,
          type: 'deposit'
        }
      });

      if (paymentError) throw paymentError;

      // Passo 3: Armazenar QR Code
      setPixQrCode(paymentData.qr_code_base64);
      setPixCode(paymentData.qr_code);
      setShowQrCode(true);
      
      alert('PIX gerado! Escaneie o QR Code para pagar');

    } catch (error) {
      console.error('Erro ao processar depósito:', error);
      alert('Erro ao gerar PIX. Tente novamente.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCopyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou'
    };
    return statusMap[status] || status;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-white mb-1">Carteira</h1>
          <p className="text-sm lg:text-base text-gray-400">Gerencie seu saldo e saques</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowValues(!showValues)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 flex-1 sm:flex-none"
          >
            {showValues ? <><Eye className="w-4 h-4" /> Ocultar</> : <><EyeOff className="w-4 h-4" /> Mostrar</>}
          </button>
          <button
            onClick={() => setShowDepositModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 flex-1 sm:flex-none"
          >
            <ArrowUpToLine className="w-4 h-4" />
            <span className="hidden sm:inline">Depositar</span>
            <span className="sm:hidden">Depositar</span>
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            disabled={!wallet || wallet.available_balance <= 0}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span className="hidden sm:inline">Solicitar Saque</span>
            <span className="sm:hidden">Sacar</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <DollarSign className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
              </div>
              <span className="text-xs lg:text-sm text-gray-400">Saldo Disponível</span>
            </div>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">
            {showValues ? formatCurrency(wallet?.available_balance || 0) : '---'}
          </div>
          <div className="text-xs text-gray-400 mt-2">Disponível para saque</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Clock className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
              </div>
              <span className="text-xs lg:text-sm text-gray-400">Saldo Pendente</span>
            </div>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">
            {showValues ? formatCurrency(wallet?.pending_balance || 0) : '---'}
          </div>
          <div className="text-xs text-gray-400 mt-2">Aguardando aprovação</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <TrendingDown className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
              </div>
              <span className="text-xs lg:text-sm text-gray-400">Total Sacado</span>
            </div>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">
            {showValues ? formatCurrency(wallet?.total_withdrawn || 0) : '---'}
          </div>
          <div className="text-xs text-gray-400 mt-2">Histórico total</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800 mb-6 lg:mb-8">
        <h2 className="text-base lg:text-lg font-semibold text-white mb-4 lg:mb-6">Histórico de Depósitos</h2>

        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <ArrowUpToLine className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum depósito realizado ainda</p>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-0">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Valor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Método</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-4 px-4 text-sm text-white">
                        {new Date(deposit.requested_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-white">
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">
                        {deposit.payment_method === 'pix' ? 'PIX' : deposit.payment_method === 'boleto' ? 'Boleto' : 'Transferência'}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(deposit.status)}
                          <span className="text-sm text-gray-300">{getStatusText(deposit.status)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-3">
              {deposits.map((deposit) => (
                <div key={deposit.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{formatCurrency(deposit.amount)}</div>
                      <div className="text-xs text-gray-400">{new Date(deposit.requested_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(deposit.status)}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Método</span>
                      <span className="text-white">
                        {deposit.payment_method === 'pix' ? 'PIX' : deposit.payment_method === 'boleto' ? 'Boleto' : 'Transferência'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Status</span>
                      <span className="text-white">{getStatusText(deposit.status)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
        <h2 className="text-base lg:text-lg font-semibold text-white mb-4 lg:mb-6">Histórico de Saques</h2>

        {withdrawals.length === 0 ? (
          <div className="text-center py-12">
            <WalletIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum saque realizado ainda</p>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-0">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Valor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Banco</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Conta</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-4 px-4 text-sm text-white">
                        {new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-white">
                        {formatCurrency(withdrawal.amount)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">{withdrawal.bank_name}</td>
                      <td className="py-4 px-4 text-sm text-gray-300">{withdrawal.account_number}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(withdrawal.status)}
                          <span className="text-sm text-gray-300">{getStatusText(withdrawal.status)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-3">
              {withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-sm font-semibold text-white mb-1">{formatCurrency(withdrawal.amount)}</div>
                      <div className="text-xs text-gray-400">{new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(withdrawal.status)}
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Banco</span>
                      <span className="text-white">{withdrawal.bank_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Conta</span>
                      <span className="text-white">{withdrawal.account_number}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Status</span>
                      <span className="text-white">{getStatusText(withdrawal.status)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showDepositModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 border border-gray-800 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-6">Fazer Depósito</h2>

            {showQrCode ? (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-full mb-3">
                    <QrCode className="w-6 h-6 text-green-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">PIX Gerado com Sucesso!</h3>
                  <p className="text-sm text-gray-400">Escaneie o QR Code ou copie o código</p>
                </div>

                <div className="flex justify-center p-6 bg-white rounded-xl">
                  <img 
                    src={`data:image/png;base64,${pixQrCode}`}
                    alt="QR Code PIX" 
                    className="w-64 h-64"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Código PIX (Copia e Cola)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pixCode}
                      readOnly
                      className="flex-1 px-3 py-2 text-xs border border-gray-700 rounded-lg bg-[#0f0f0f] text-white font-mono break-all"
                    />
                    <button
                      onClick={handleCopyPixCode}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                  <p className="text-xs text-amber-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Este PIX expira em 15 minutos
                  </p>
                </div>

                <div className="space-y-2 text-sm text-gray-400 bg-[#0f0f0f] rounded-lg p-4">
                  <p className="font-medium text-white mb-2">📱 Como pagar:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Abra o app do seu banco</li>
                    <li>Escolha Pagar com PIX</li>
                    <li>Escaneie o QR Code ou cole o código</li>
                    <li>Confirme o pagamento</li>
                  </ol>
                </div>

                <button
                  onClick={() => {
                    setShowQrCode(false);
                    setDepositAmount('');
                  }}
                  className="w-full py-3 border border-gray-700 rounded-lg text-white hover:bg-[#0f0f0f] transition-colors"
                >
                  Fazer outro depósito
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Valor</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Valor mínimo: R$ 1,00
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Método de Pagamento</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-green-500 text-white"
                  >
                    <option value="pix">PIX</option>
                    <option value="boleto">Boleto Bancário</option>
                    <option value="transfer">Transferência Bancária</option>
                  </select>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-xs text-blue-400">
                    Após confirmar, você receberá o QR Code PIX. O saldo será creditado após a confirmação do pagamento.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowDepositModal(false)}
                    className="flex-1 py-3 border border-gray-700 rounded-lg text-white hover:bg-[#0f0f0f] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={!depositAmount || parseFloat(depositAmount) <= 0 || paymentLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 hover:shadow-xl hover:shadow-green-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? 'Gerando PIX...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full p-6 border border-gray-800">
            <h2 className="text-xl font-semibold text-white mb-6">Solicitar Saque</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Valor</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Saldo disponível: {formatCurrency(wallet?.available_balance || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Banco</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Nome do banco"
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Tipo de Conta</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                >
                  <option value="checking">Conta Corrente</option>
                  <option value="savings">Conta Poupança</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Número da Conta</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="0000-0"
                  className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-3 border border-gray-700 rounded-lg text-white hover:bg-[#0f0f0f] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || !bankName || !accountNumber}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallet;