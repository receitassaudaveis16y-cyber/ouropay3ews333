import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShoppingCart, Search, Filter, Download, Eye, DollarSign, CreditCard, Zap, FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

interface SalesProps {
  userId: string;
}

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payment_method: string;
  status: string;
  description: string;
  customer_name: string;
  customer_email: string;
  paid_at: string | null;
  created_at: string;
}

function Sales({ userId }: SalesProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    if (!supabase || !userId) return;

    const loadTransactions = async () => {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setTransactions(data);
        setFilteredTransactions(data);
      }
    };

    loadTransactions();

    const subscription = supabase
      .channel('sales_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadTransactions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase]);

  useEffect(() => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(t => t.payment_method === methodFilter);
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, statusFilter, methodFilter, transactions]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'pix':
        return <Zap className="w-4 h-4" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      case 'boleto':
        return <FileText className="w-4 h-4" />;
      default:
        return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    const methodMap: { [key: string]: string } = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      boleto: 'Boleto'
    };
    return methodMap[method] || method;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'refunded':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-amber-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'Pendente',
      paid: 'Pago',
      failed: 'Falhou',
      refunded: 'Estornado'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-500';
      case 'failed':
      case 'refunded':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-amber-500/20 text-amber-500';
    }
  };

  const totalSales = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = filteredTransactions.filter(t => t.status === 'paid').reduce((sum, t) => sum + t.amount, 0);
  const totalFees = filteredTransactions.reduce((sum, t) => sum + t.fee, 0);

  const exportToCSV = () => {
    const headers = ['Data', 'Cliente', 'Email', 'Descrição', 'Método', 'Valor', 'Taxa', 'Líquido', 'Status'];
    const rows = filteredTransactions.map(t => [
      new Date(t.created_at).toLocaleDateString('pt-BR'),
      t.customer_name || 'N/A',
      t.customer_email || 'N/A',
      t.description || '-',
      getPaymentMethodText(t.payment_method),
      formatCurrency(t.amount),
      formatCurrency(t.fee),
      formatCurrency(t.net_amount),
      getStatusText(t.status),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 lg:mb-8 gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-semibold text-white mb-1">Vendas</h1>
          <p className="text-sm lg:text-base text-gray-400">Gerencie todas as suas transações</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 border border-gray-800 rounded-lg text-sm text-gray-300 hover:bg-gray-800 w-full sm:w-auto justify-center transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Exportar CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ShoppingCart className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
            </div>
            <span className="text-xs lg:text-sm text-gray-400">Total de Vendas</span>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">{formatCurrency(totalSales)}</div>
          <div className="text-xs text-gray-400 mt-1">{filteredTransactions.length} transações</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <CheckCircle className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
            </div>
            <span className="text-xs lg:text-sm text-gray-400">Vendas Pagas</span>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">{formatCurrency(totalPaid)}</div>
          <div className="text-xs text-gray-400 mt-1">{filteredTransactions.filter(t => t.status === 'paid').length} pagas</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 lg:w-10 h-8 lg:h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <DollarSign className="w-4 lg:w-5 h-4 lg:h-5 text-black" />
            </div>
            <span className="text-xs lg:text-sm text-gray-400">Total em Taxas</span>
          </div>
          <div className="text-xl lg:text-3xl font-bold text-white">{formatCurrency(totalFees)}</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-4 lg:p-6 border border-gray-800">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2.5 lg:py-2 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 lg:py-2 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-[#0f0f0f]"
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-[#0f0f0f] rounded-lg border border-gray-800">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-sm"
              >
                <option value="all">Todos</option>
                <option value="paid">Pago</option>
                <option value="pending">Pendente</option>
                <option value="failed">Falhou</option>
                <option value="refunded">Estornado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Método de Pagamento</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-700 bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-sm"
              >
                <option value="all">Todos</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="boleto">Boleto</option>
              </select>
            </div>
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <div className="space-y-4 lg:space-y-0">
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Descrição</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Método</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Valor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Taxa</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Líquido</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors">
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-white">{transaction.customer_name || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{transaction.customer_email || 'N/A'}</div>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">{transaction.description || '-'}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          {getPaymentMethodIcon(transaction.payment_method)}
                          <span>{getPaymentMethodText(transaction.payment_method)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-white">{formatCurrency(transaction.amount)}</td>
                      <td className="py-4 px-4 text-sm text-gray-300">{formatCurrency(transaction.fee)}</td>
                      <td className="py-4 px-4 text-sm font-semibold text-green-500">{formatCurrency(transaction.net_amount)}</td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-300">
                        {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden space-y-3">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-white mb-1">{transaction.customer_name || 'N/A'}</div>
                      <div className="text-xs text-gray-400">{transaction.customer_email || 'N/A'}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {getStatusText(transaction.status)}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Método</span>
                      <div className="flex items-center gap-2 text-white">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        <span>{getPaymentMethodText(transaction.payment_method)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Valor</span>
                      <span className="font-semibold text-white">{formatCurrency(transaction.amount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Taxa</span>
                      <span className="text-gray-300">{formatCurrency(transaction.fee)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Líquido</span>
                      <span className="font-semibold text-green-500">{formatCurrency(transaction.net_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                      <span className="text-gray-400">Data</span>
                      <span className="text-gray-300">{new Date(transaction.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Sales;
