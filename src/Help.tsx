import { useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, BookOpen, MessageCircle, FileText, Video, Mail, Phone, HelpCircle, ChevronRight, X } from 'lucide-react';

interface HelpProps {
  userId: string;
}

function Help({ userId }: HelpProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState('outro');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  const faqs = [
    {
      category: 'Pagamentos',
      questions: [
        {
          question: 'Como recebo meus pagamentos?',
          answer: 'Os pagamentos são creditados automaticamente na sua carteira após a aprovação. Para PIX, o valor está disponível na hora. Para cartão de crédito, em até 30 dias.'
        },
        {
          question: 'Quais métodos de pagamento vocês aceitam?',
          answer: 'Aceitamos PIX, Cartão de Crédito e Boleto Bancário. Cada método tem suas próprias taxas e prazos.'
        },
        {
          question: 'Como funciona o saque?',
          answer: 'Acesse a aba "Carteira", clique em "Solicitar Saque", informe o valor e seus dados bancários. O prazo de processamento é de 1 a 3 dias úteis.'
        }
      ]
    },
    {
      category: 'Integração',
      questions: [
        {
          question: 'Como integro a API no meu site?',
          answer: 'Acesse "Integrações" no menu, copie suas chaves de API e siga nossa documentação técnica disponível na mesma página.'
        },
        {
          question: 'Preciso ter conhecimento técnico para usar?',
          answer: 'Não necessariamente. Você pode usar nossos Links de Pagamento sem integração. Para integrações personalizadas, recomendamos um desenvolvedor.'
        }
      ]
    },
    {
      category: 'Segurança',
      questions: [
        {
          question: 'Meus dados estão seguros?',
          answer: 'Sim! Utilizamos criptografia de ponta a ponta e seguimos os padrões PCI DSS. Seus dados nunca são compartilhados sem autorização.'
        },
        {
          question: 'Como proteger minha conta?',
          answer: 'Use uma senha forte, nunca compartilhe suas credenciais e ative a autenticação em dois fatores nas configurações.'
        }
      ]
    },
    {
      category: 'Taxas',
      questions: [
        {
          question: 'Quais são as taxas cobradas?',
          answer: 'PIX: 0,99% por transação. Cartão de Crédito: 3,99%. Boleto: R$ 2,50 por boleto. Não cobramos taxa de setup ou mensalidade.'
        },
        {
          question: 'Há taxa para saques?',
          answer: 'Não cobramos taxa para saques. O valor solicitado é transferido integralmente para sua conta bancária.'
        }
      ]
    }
  ];

  const resources = [
    {
      icon: BookOpen,
      title: 'Documentação da API',
      description: 'Guias completos para desenvolvedores',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Video,
      title: 'Tutoriais em Vídeo',
      description: 'Aprenda assistindo passo a passo',
      color: 'from-red-500 to-red-600'
    },
    {
      icon: FileText,
      title: 'Base de Conhecimento',
      description: 'Artigos e guias detalhados',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: MessageCircle,
      title: 'Comunidade',
      description: 'Conecte-se com outros usuários',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const contactOptions = [
    {
      icon: Mail,
      title: 'E-mail',
      value: 'suporte@goldspay.com',
      description: 'Resposta em até 24h'
    },
    {
      icon: Phone,
      title: 'Telefone',
      value: '(11) 9999-9999',
      description: 'Seg-Sex, 9h às 18h'
    },
    {
      icon: MessageCircle,
      title: 'Chat ao Vivo',
      value: 'Disponível agora',
      description: 'Tempo médio: 2 minutos'
    }
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;

    const query = searchQuery.toLowerCase();
    return faqs.map(category => ({
      ...category,
      questions: category.questions.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      )
    })).filter(category => category.questions.length > 0);
  }, [searchQuery, faqs]);

  const handleSubmitTicket = async () => {
    if (!supabase || !ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          subject: ticketSubject,
          message: ticketMessage,
          category: ticketCategory,
          status: 'open',
          priority: 'medium'
        });

      if (error) throw error;

      setSubmitSuccess(true);
      setTicketSubject('');
      setTicketMessage('');
      setTicketCategory('outro');

      setTimeout(() => {
        setShowTicketModal(false);
        setSubmitSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      alert('Erro ao criar ticket de suporte. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {showTicketModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full border border-gray-800">
            <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Abrir Ticket de Suporte</h2>
              <button
                onClick={() => setShowTicketModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ticket Criado com Sucesso!</h3>
                <p className="text-gray-400">
                  Nossa equipe entrará em contato em breve.
                </p>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Categoria
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                    >
                      <option value="pagamentos">Pagamentos</option>
                      <option value="integracao">Integração</option>
                      <option value="seguranca">Segurança</option>
                      <option value="taxas">Taxas</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Assunto
                    </label>
                    <input
                      type="text"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="Descreva brevemente o problema"
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Mensagem
                    </label>
                    <textarea
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Descreva o problema em detalhes"
                      rows={6}
                      className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white placeholder:text-gray-500 resize-none"
                    />
                  </div>
                </div>

                <div className="border-t border-gray-800 px-6 py-4 flex gap-3">
                  <button
                    onClick={() => setShowTicketModal(false)}
                    className="flex-1 py-3 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmitTicket}
                    disabled={!ticketSubject.trim() || !ticketMessage.trim() || isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Enviando...' : 'Enviar Ticket'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-500 rounded-2xl p-6 lg:p-8 text-black">
        <h1 className="text-2xl lg:text-3xl font-bold mb-2">Central de Ajuda</h1>
        <p className="text-sm lg:text-base opacity-90 mb-6">
          Encontre respostas, tutoriais e entre em contato com nosso suporte
        </p>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busque por 'pagamento', 'saque', 'integração'..."
            className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border-2 border-transparent focus:border-black focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {resources.map((resource, index) => (
          <button
            key={index}
            className="bg-[#1a1a1a] rounded-xl p-6 hover:bg-[#222] transition-all group text-left border border-gray-800 hover:border-amber-500"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${resource.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <resource.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-white font-semibold mb-1">{resource.title}</h3>
            <p className="text-sm text-gray-400">{resource.description}</p>
          </button>
        ))}
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-6 lg:p-8 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Perguntas Frequentes</h2>
        </div>

        <div className="space-y-6">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Nenhum resultado encontrado para "{searchQuery}"</p>
            </div>
          ) : (
            filteredFaqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className="text-amber-500 font-semibold mb-4 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                {category.category}
              </h3>
              <div className="space-y-4 ml-6">
                {category.questions.map((faq, faqIndex) => (
                  <div key={faqIndex} className="bg-[#0f0f0f] rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition-colors">
                    <h4 className="text-white font-medium mb-2">{faq.question}</h4>
                    <p className="text-sm text-gray-400 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-2xl p-6 lg:p-8 border border-gray-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-white">Entre em Contato</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contactOptions.map((option, index) => (
            <button
              key={index}
              className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800 hover:border-amber-500 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <option.icon className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-white font-semibold mb-1">{option.title}</h3>
              <p className="text-amber-500 font-medium mb-2">{option.value}</p>
              <p className="text-xs text-gray-400">{option.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-6 lg:p-8 border border-amber-500/30">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Não encontrou o que procurava?</h3>
          <p className="text-gray-400 mb-6">
            Nossa equipe de suporte está pronta para ajudar você
          </p>
          <button
            onClick={() => setShowTicketModal(true)}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-bold rounded-xl shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all"
          >
            Abrir Ticket de Suporte
          </button>
        </div>
      </div>
    </div>
  );
}

export default Help;
