import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, Search, TrendingUp, ShoppingBag, Calendar, Mail, Phone, FileText } from 'lucide-react';

interface CustomersProps {
  userId: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  total_spent: number;
  total_transactions: number;
  first_purchase_at: string | null;
  last_purchase_at: string | null;
  created_at: string;
}

function Customers({ userId }: CustomersProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    if (!supabase || !userId) return;

    const loadCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .order('total_spent', { ascending: false });

      if (data) {
        setCustomers(data);
        setFilteredCustomers(data);
      }
    };

    loadCustomers();

    const subscription = supabase
      .channel('customers_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `user_id=eq.${userId}`
        },
        () => {
          loadCustomers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, supabase]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.document?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchTerm, customers]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const averageTicket = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Clientes</h1>
          <p className="text-gray-400">Gerencie sua base de clientes</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Users className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Total de Clientes</span>
          </div>
          <div className="text-3xl font-bold text-white">{totalCustomers}</div>
          <div className="text-xs text-gray-400 mt-1">Clientes únicos</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Receita Total</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
          <div className="text-xs text-gray-400 mt-1">De todos os clientes</div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <ShoppingBag className="w-5 h-5 text-black" />
            </div>
            <span className="text-sm text-gray-400">Ticket Médio</span>
          </div>
          <div className="text-3xl font-bold text-white">{formatCurrency(averageTicket)}</div>
          <div className="text-xs text-gray-400 mt-1">Por cliente</div>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, email ou documento..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white text-sm"
            />
          </div>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Cliente</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Documento</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Telefone</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Total Gasto</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Transações</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Primeira Compra</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className="border-b border-gray-800 hover:bg-[#0f0f0f] transition-colors cursor-pointer"
                  >
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-white">{customer.name}</div>
                      <div className="text-xs text-gray-400">{customer.email}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-300">{customer.document || 'N/A'}</td>
                    <td className="py-4 px-4 text-sm text-gray-300">{formatPhone(customer.phone)}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-white">{formatCurrency(customer.total_spent)}</td>
                    <td className="py-4 px-4 text-sm text-gray-300">{customer.total_transactions}</td>
                    <td className="py-4 px-4 text-sm text-gray-300">
                      {customer.first_purchase_at ? new Date(customer.first_purchase_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-300">
                      {customer.last_purchase_at ? new Date(customer.last_purchase_at).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedCustomer(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full p-6 border border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Detalhes do Cliente</h2>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-400">Nome</span>
                  </div>
                  <div className="text-white font-semibold">{selectedCustomer.name}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-400">Email</span>
                  </div>
                  <div className="text-white">{selectedCustomer.email}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-400">Telefone</span>
                  </div>
                  <div className="text-white">{formatPhone(selectedCustomer.phone)}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-400">Documento</span>
                  </div>
                  <div className="text-white">{selectedCustomer.document || 'N/A'}</div>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Estatísticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-400">Total Gasto</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(selectedCustomer.total_spent)}</div>
                  </div>

                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingBag className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-400">Transações</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{selectedCustomer.total_transactions}</div>
                  </div>

                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-400">Primeira Compra</span>
                    </div>
                    <div className="text-white">
                      {selectedCustomer.first_purchase_at
                        ? new Date(selectedCustomer.first_purchase_at).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-400">Última Compra</span>
                    </div>
                    <div className="text-white">
                      {selectedCustomer.last_purchase_at
                        ? new Date(selectedCustomer.last_purchase_at).toLocaleDateString('pt-BR')
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
