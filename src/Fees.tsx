import { Receipt, CreditCard, Zap, FileText, TrendingDown, DollarSign, CheckCircle, Shield } from 'lucide-react';

interface FeesProps {
  userId: string;
}

function Fees({ userId }: FeesProps) {
  const feeStructure = [
    {
      method: 'PIX',
      icon: Zap,
      iconColor: 'text-black',
      bgColor: 'from-yellow-400 via-amber-500 to-yellow-500',
      fees: [
        { type: 'Taxa por transação', value: '1,99%', description: 'Taxa fixa por cada transação PIX aprovada' }
      ],
      benefits: [
        'Aprovação instantânea',
        'Disponível 24/7',
        'Sem chargeback',
        'Recebimento em D+1'
      ]
    },
    {
      method: 'Cartão de Crédito',
      icon: CreditCard,
      iconColor: 'text-black',
      bgColor: 'from-yellow-400 via-amber-500 to-yellow-500',
      fees: [
        { type: 'Taxa à vista', value: '3,99%', description: 'Para pagamentos em 1x' },
        { type: 'Taxa parcelado 2-6x', value: '4,99%', description: 'Parcelamento de 2 a 6 vezes' },
        { type: 'Taxa parcelado 7-12x', value: '5,99%', description: 'Parcelamento de 7 a 12 vezes' }
      ],
      benefits: [
        'Parcelamento em até 12x',
        'Antifraude incluso',
        'Recebimento em D+30',
        'Todas as bandeiras'
      ]
    },
    {
      method: 'Boleto Bancário',
      icon: FileText,
      iconColor: 'text-black',
      bgColor: 'from-yellow-400 via-amber-500 to-yellow-500',
      fees: [
        { type: 'Taxa por boleto', value: 'R$ 3,99', description: 'Valor fixo por boleto gerado' }
      ],
      benefits: [
        'Sem necessidade de conta bancária',
        'Vencimento configurável',
        'Recebimento em D+2',
        'Link para pagamento'
      ]
    }
  ];

  const competitorComparison = [
    {
      company: 'GoldsPay',
      pix: '1,99%',
      creditCard: '3,99%',
      boleto: 'R$ 3,99',
      highlight: true
    },
    {
      company: 'Mercado Pago',
      pix: '3,99%',
      creditCard: '4,99%',
      boleto: 'R$ 3,49'
    },
    {
      company: 'PagSeguro',
      pix: '0,99%',
      creditCard: '4,99%',
      boleto: 'R$ 3,50'
    },
    {
      company: 'Stripe',
      pix: '2,99%',
      creditCard: '4,49%',
      boleto: 'R$ 3,00'
    }
  ];

  const additionalFeatures = [
    {
      icon: Shield,
      title: 'Antifraude Incluso',
      description: 'Sistema de prevenção a fraudes sem custo adicional'
    },
    {
      icon: TrendingDown,
      title: 'Sem Taxa de Setup',
      description: 'Comece a vender sem pagar nada pela integração'
    },
    {
      icon: DollarSign,
      title: 'Sem Mensalidade',
      description: 'Você só paga quando vender, sem custos fixos'
    },
    {
      icon: CheckCircle,
      title: 'Suporte Premium',
      description: 'Atendimento especializado sem custo extra'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Taxas e Tarifas</h1>
        <p className="text-gray-400">Conheça nossa estrutura de taxas transparente</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8">
        {feeStructure.map((item) => {
          const IconComponent = item.icon;
          return (
            <div key={item.method} className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${item.bgColor} rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30`}>
                    <IconComponent className={`w-6 h-6 ${item.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{item.method}</h2>
                    <p className="text-sm text-gray-400 mt-1">Taxas competitivas e transparentes</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-amber-500 mb-4">Estrutura de Taxas</h3>
                  <div className="space-y-3">
                    {item.fees.map((fee, index) => (
                      <div key={index} className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-400">{fee.type}</span>
                          <span className="text-lg font-bold text-white">{fee.value}</span>
                        </div>
                        <p className="text-xs text-gray-500">{fee.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-amber-500 mb-4">Benefícios Inclusos</h3>
                  <div className="space-y-2">
                    {item.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-300">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 mb-8">
        <h2 className="text-xl font-semibold text-white mb-6">Comparação com Concorrentes</h2>
        <p className="text-sm text-gray-400 mb-6">Veja como nossas taxas se comparam com outros gateways</p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Gateway</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">PIX</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Cartão de Crédito</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Boleto</th>
              </tr>
            </thead>
            <tbody>
              {competitorComparison.map((company, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-800 ${
                    company.highlight ? 'bg-amber-500/10' : ''
                  }`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      {company.highlight && (
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      )}
                      <span className={`text-sm font-semibold ${
                        company.highlight ? 'text-amber-500' : 'text-white'
                      }`}>
                        {company.company}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300">{company.pix}</td>
                  <td className="py-4 px-4 text-sm text-gray-300">{company.creditCard}</td>
                  <td className="py-4 px-4 text-sm text-gray-300">{company.boleto}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-500">
            💡 <strong>Nota:</strong> As taxas dos concorrentes podem variar de acordo com o volume de transações e tipo de conta. Os valores apresentados são referências públicas.
          </p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <h2 className="text-xl font-semibold text-white mb-6">Recursos Adicionais Sem Custo</h2>
        <div className="grid grid-cols-2 gap-4">
          {additionalFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="bg-[#0f0f0f] rounded-lg p-5 border border-gray-800">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">{feature.title}</h3>
                    <p className="text-xs text-gray-400">{feature.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 p-6 bg-gradient-to-r from-yellow-400/10 via-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl">
        <div className="flex items-start gap-4">
          <Receipt className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Precisa de um plano personalizado?</h3>
            <p className="text-sm text-gray-300 mb-4">
              Para empresas com alto volume de transações, oferecemos taxas diferenciadas e condições especiais. Entre em contato com nossa equipe comercial.
            </p>
            <button className="px-6 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200">
              Falar com Especialista
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Fees;
