import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Copy, Check, Plus, Trash2, ExternalLink, Calendar, DollarSign } from 'lucide-react';

interface PaymentLinkProps {
  userId: string;
}

interface PaymentLink {
  id: string;
  title: string;
  description: string;
  amount: number;
  link: string;
  created_at: string;
  clicks: number;
  sales: number;
}

function PaymentLink({ userId }: PaymentLinkProps) {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [shippingAmount, setShippingAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    if (userId) {
      loadLinks();
    }
  }, [userId]);

  const loadLinks = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('payment_links')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedLinks: PaymentLink[] = (data || []).map(link => ({
        id: link.id,
        title: link.title,
        description: link.description,
        amount: parseFloat(link.amount.toString()),
        link: `${window.location.origin}/pay/${link.slug}`,
        created_at: link.created_at,
        clicks: link.clicks,
        sales: link.sales,
      }));

      setLinks(formattedLinks);
    } catch (error) {
      console.error('Erro ao carregar links:', error);
    }
  };

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    const numericValue = parseInt(digits, 10);
    return `R$ ${(numericValue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCurrencyChange = (value: string) => {
    const digits = value.replace(/\D/g, '');
    setAmount(digits);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateLink = async () => {
    if (!title || !amount || !supabase || !userId) return;

    setIsSubmitting(true);

    try {
      const slug = Math.random().toString(36).substr(2, 9);
      const amountInCents = parseFloat(amount) / 100;
      const shippingInCents = shippingAmount ? parseFloat(shippingAmount) / 100 : 0;
      const quantityValue = parseInt(quantity) || 1;

      const { data, error } = await supabase
        .from('payment_links')
        .insert({
          user_id: userId,
          title,
          description,
          amount: amountInCents,
          slug,
          is_active: true,
          clicks: 0,
          sales: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const newLink: PaymentLink = {
        id: data.id,
        title: data.title,
        description: data.description,
        amount: parseFloat(data.amount.toString()),
        link: `${window.location.origin}/pay/${data.slug}`,
        created_at: data.created_at,
        clicks: data.clicks,
        sales: data.sales,
      };

      setLinks([newLink, ...links]);
      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setAmount('');
      setQuantity('1');
      setShippingAmount('');
    } catch (error) {
      console.error('Erro ao criar link:', error);
      alert('Erro ao criar link de pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    if (!supabase) return;

    if (!confirm('Tem certeza que deseja excluir este link?')) return;

    try {
      const { error } = await supabase
        .from('payment_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLinks(links.filter(link => link.id !== id));
    } catch (error) {
      console.error('Erro ao excluir link:', error);
      alert('Erro ao excluir link de pagamento');
    }
  };

  return (
    <div>
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full border border-gray-800">
            <div className="border-b border-gray-800 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Criar Link de Pagamento</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Título do Produto/Serviço
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Curso de React"
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Descrição <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que está sendo vendido"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Valor
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(amount)}
                    onChange={(e) => handleCurrencyChange(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Valor do Frete <span className="text-gray-500 text-xs">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formatCurrency(shippingAmount)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setShippingAmount(digits);
                  }}
                  placeholder="R$ 0,00"
                  className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="border-t border-gray-800 px-6 py-4 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLink}
                disabled={!title || !amount || isSubmitting}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Criando...' : 'Criar Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Links de Pagamento</h1>
          <p className="text-gray-400 text-sm">Crie e gerencie seus links de pagamento</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Avançar</span>
        </button>
      </div>

      <div className="grid gap-4">
        {links.map((link) => (
          <div key={link.id} className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">{link.title}</h3>
                <p className="text-sm text-gray-400 mb-3">{link.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-500" />
                    <span className="text-white font-semibold">
                      {(link.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-400">
                      {new Date(link.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDeleteLink(link.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={link.link}
                  readOnly
                  className="flex-1 px-3 py-2 bg-[#1a1a1a] border border-gray-700 rounded-lg text-white text-sm"
                />
                <button
                  onClick={() => copyToClipboard(link.link, link.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all"
                >
                  {copiedId === link.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
                <a
                  href={link.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Cliques</div>
                  <div className="text-xl font-bold text-white">{link.clicks}</div>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-gray-800">
                  <div className="text-xs text-gray-400 mb-1">Vendas</div>
                  <div className="text-xl font-bold text-amber-500">{link.sales}</div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {links.length === 0 && (
          <div className="bg-[#1a1a1a] rounded-xl p-12 border border-gray-800 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
                <Plus className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Nenhum link criado</h3>
              <p className="text-gray-400 text-sm mb-6">
                Crie seu primeiro link de pagamento para começar a receber pagamentos online
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all"
              >
                Criar Primeiro Link
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentLink;
