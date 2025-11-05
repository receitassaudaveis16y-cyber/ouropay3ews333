import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { FileText, Download, Calendar, TrendingUp, DollarSign, Filter, BarChart3, PieChart, AlertCircle } from 'lucide-react';

interface ReportsProps {
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  paid_at: string | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

function Reports({ userId }: ReportsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState<'financial' | 'reconciliation'>('financial');
  const [isGenerating, setIsGenerating] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (!supabase || !userId || !startDate || !endDate) return;

    loadData();
  }, [userId, startDate, endDate, supabase]);

  const loadData = async () => {
    if (!supabase) return;

    const { data: transData } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    const { data: withData } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false });

    if (transData) setTransactions(transData);
    if (withData) setWithdrawals(withData);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const calculateMetrics = () => {
    const totalRevenue = transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalFees = transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.fee, 0);

    const netRevenue = transactions
      .filter(t => t.status === 'paid')
      .reduce((sum, t) => sum + t.net_amount, 0);

    const totalWithdrawals = withdrawals
      .filter(w => w.status === 'completed')
      .reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

    const pendingAmount = transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);

    const refundedAmount = transactions
      .filter(t => t.status === 'refunded')
      .reduce((sum, t) => sum + t.amount, 0);

    const byMethod = {
      pix: transactions.filter(t => t.payment_method === 'pix' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
      credit_card: transactions.filter(t => t.payment_method === 'credit_card' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
      boleto: transactions.filter(t => t.payment_method === 'boleto' && t.status === 'paid').reduce((sum, t) => sum + t.amount, 0),
    };

    return {
      totalRevenue,
      totalFees,
      netRevenue,
      totalWithdrawals,
      pendingAmount,
      refundedAmount,
      byMethod,
      transactionCount: transactions.length,
      paidCount: transactions.filter(t => t.status === 'paid').length,
    };
  };

  const generateFinancialReport = () => {
    const metrics = calculateMetrics();

    const headers = [
      'RELATÓRIO FINANCEIRO - GOLDSPAY',
      `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'RESUMO FINANCEIRO',
      `Receita Bruta,${formatCurrency(metrics.totalRevenue)}`,
      `Taxas,${formatCurrency(metrics.totalFees)}`,
      `Receita Líquida,${formatCurrency(metrics.netRevenue)}`,
      `Saques Realizados,${formatCurrency(metrics.totalWithdrawals)}`,
      `Saldo Retido,${formatCurrency(metrics.pendingAmount)}`,
      `Estornos,${formatCurrency(metrics.refundedAmount)}`,
      '',
      'TRANSAÇÕES',
      `Total de Transações,${metrics.transactionCount}`,
      `Transações Pagas,${metrics.paidCount}`,
      `Taxa de Conversão,${metrics.transactionCount > 0 ? ((metrics.paidCount / metrics.transactionCount) * 100).toFixed(2) : 0}%`,
      '',
      'RECEITA POR MÉTODO DE PAGAMENTO',
      `PIX,${formatCurrency(metrics.byMethod.pix)}`,
      `Cartão de Crédito,${formatCurrency(metrics.byMethod.credit_card)}`,
      `Boleto,${formatCurrency(metrics.byMethod.boleto)}`,
      '',
      'DETALHAMENTO DE TRANSAÇÕES',
      'Data,Valor,Taxa,Líquido,Método,Status',
    ];

    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString('pt-BR'),
      formatCurrency(t.amount),
      formatCurrency(t.fee),
      formatCurrency(t.net_amount),
      t.payment_method === 'pix' ? 'PIX' : t.payment_method === 'credit_card' ? 'Cartão' : 'Boleto',
      t.status === 'paid' ? 'Pago' : t.status === 'pending' ? 'Pendente' : t.status === 'refunded' ? 'Estornado' : 'Falhou',
    ].join(','));

    const csvContent = [...headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_financeiro_${startDate}_${endDate}.csv`;
    link.click();
  };

  const generateReconciliationReport = () => {
    const paidTransactions = transactions.filter(t => t.status === 'paid');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');

    const headers = [
      'RELATÓRIO DE CONCILIAÇÃO BANCÁRIA - GOLDSPAY',
      `Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}`,
      `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      '',
      'ENTRADAS (RECEBIMENTOS)',
      'Data Pagamento,Valor Bruto,Taxa,Valor Líquido,Método,ID Transação',
    ];

    const receiptRows = paidTransactions.map(t => [
      t.paid_at ? new Date(t.paid_at).toLocaleDateString('pt-BR') : 'N/A',
      formatCurrency(t.amount),
      formatCurrency(t.fee),
      formatCurrency(t.net_amount),
      t.payment_method === 'pix' ? 'PIX' : t.payment_method === 'credit_card' ? 'Cartão' : 'Boleto',
      t.id.substring(0, 8),
    ].join(','));

    const totalReceipts = paidTransactions.reduce((sum, t) => sum + t.net_amount, 0);

    const withdrawalHeaders = [
      '',
      `TOTAL DE ENTRADAS,${formatCurrency(totalReceipts)}`,
      '',
      'SAÍDAS (SAQUES)',
      'Data Saque,Valor,Status,ID Saque',
    ];

    const withdrawalRows = completedWithdrawals.map(w => [
      w.completed_at ? new Date(w.completed_at).toLocaleDateString('pt-BR') : 'N/A',
      formatCurrency(parseFloat(w.amount.toString())),
      'Concluído',
      w.id.substring(0, 8),
    ].join(','));

    const totalWithdrawals = completedWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);

    const summary = [
      '',
      `TOTAL DE SAÍDAS,${formatCurrency(totalWithdrawals)}`,
      '',
      'RESUMO DA CONCILIAÇÃO',
      `Entradas Totais,${formatCurrency(totalReceipts)}`,
      `Saídas Totais,${formatCurrency(totalWithdrawals)}`,
      `Saldo Líquido,${formatCurrency(totalReceipts - totalWithdrawals)}`,
      '',
      'OBSERVAÇÕES',
      'Este relatório considera apenas transações pagas e saques concluídos no período selecionado.',
      'Para conciliação bancária completa considere também os valores pendentes e em processamento.',
    ];

    const csvContent = [...headers, ...receiptRows, ...withdrawalHeaders, ...withdrawalRows, ...summary].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `conciliacao_bancaria_${startDate}_${endDate}.csv`;
    link.click();
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);

    setTimeout(() => {
      if (reportType === 'financial') {
        generateFinancialReport();
      } else {
        generateReconciliationReport();
      }
      setIsGenerating(false);
    }, 500);
  };

  const metrics = calculateMetrics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Relatórios e Exportação</h1>
          <p className="text-gray-400">Gere relatórios financeiros e conciliações bancárias</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Receita Bruta</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">{metrics.paidCount} transações pagas</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <DollarSign className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Receita Líquida</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.netRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">Após taxas</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <BarChart3 className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Total em Taxas</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalFees)}</div>
          <div className="text-xs text-gray-400 mt-1">Gateway + processamento</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <PieChart className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Saques</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(metrics.totalWithdrawals)}</div>
          <div className="text-xs text-gray-400 mt-1">Concluídos</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Configurar Relatório</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inicial
              </div>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Final
              </div>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Tipo de Relatório
              </div>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'financial' | 'reconciliation')}
              className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
            >
              <option value="financial">Relatório Financeiro</option>
              <option value="reconciliation">Conciliação Bancária</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleGenerateReport}
          disabled={isGenerating || !startDate || !endDate}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span>{isGenerating ? 'Gerando...' : 'Gerar e Baixar Relatório'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Relatório Financeiro</h3>
          <p className="text-sm text-gray-400 mb-4">
            Gera um relatório completo com receitas, taxas, saques e análise detalhada por método de pagamento.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Resumo financeiro do período</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Análise por método de pagamento</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Detalhamento de todas as transações</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Taxa de conversão e métricas</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Conciliação Bancária</h3>
          <p className="text-sm text-gray-400 mb-4">
            Relatório específico para conciliação com seu banco, separando entradas e saídas do período.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Listagem completa de recebimentos</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Detalhamento de saques realizados</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Saldo líquido do período</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span>Formato compatível para conciliação</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-400">
            <p className="font-semibold mb-1">Dica para Contadores</p>
            <p>
              Os relatórios são gerados em formato CSV compatível com Excel e softwares de contabilidade.
              Para conciliação bancária, recomendamos exportar relatórios mensais e comparar com os extratos bancários.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;
