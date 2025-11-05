import { Clock, AlertCircle, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';

interface PendingApprovalProps {
  status: 'pending' | 'under_review' | 'rejected';
  businessName: string;
  rejectionReason?: string;
  onLogout: () => void;
}

function PendingApproval({ status, businessName, rejectionReason, onLogout }: PendingApprovalProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500',
          title: 'Conta em Análise',
          description: 'Sua conta foi criada com sucesso e está aguardando aprovação da nossa equipe.',
          message: 'Isso geralmente leva até 24 horas úteis. Você receberá um email assim que sua conta for aprovada.'
        };
      case 'under_review':
        return {
          icon: AlertCircle,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500',
          title: 'Conta em Revisão',
          description: 'Nossa equipe está revisando suas informações.',
          message: 'Você receberá um email em breve com o resultado da análise.'
        };
      case 'rejected':
        return {
          icon: XCircle,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500',
          title: 'Conta Rejeitada',
          description: 'Infelizmente sua conta não foi aprovada.',
          message: rejectionReason || 'Entre em contato com nossa equipe para mais informações.'
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-amber-500',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500',
          title: 'Aguardando Aprovação',
          description: 'Sua conta está em análise.',
          message: ''
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center ${config.borderColor} border-2 shadow-lg`}>
              <StatusIcon className={`w-8 h-8 ${config.iconColor}`} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{config.title}</h1>
          <p className="text-gray-400 text-lg">{businessName}</p>
        </div>

        <div className={`bg-[#1a1a1a] rounded-2xl p-8 border ${config.borderColor} shadow-xl`}>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-3">{config.description}</h2>
              <p className="text-gray-400 leading-relaxed">{config.message}</p>
            </div>

            {status === 'pending' && (
              <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-4">O que acontece agora?</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <CheckCircle className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Análise de Documentos</p>
                      <p className="text-xs text-gray-400 mt-1">Nossa equipe está verificando seus documentos e informações cadastrais</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <CheckCircle className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Verificação de Compliance</p>
                      <p className="text-xs text-gray-400 mt-1">Validação de dados e conformidade regulatória</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Aprovação Final</p>
                      <p className="text-xs text-gray-400 mt-1">Você receberá um email com o resultado</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {status === 'rejected' && rejectionReason && (
              <div className="bg-red-500/10 rounded-xl p-6 border border-red-500">
                <h3 className="text-sm font-semibold text-red-500 mb-2">Motivo da Rejeição</h3>
                <p className="text-sm text-gray-300">{rejectionReason}</p>
              </div>
            )}

            <div className="bg-[#0f0f0f] rounded-xl p-6 border border-gray-800">
              <h3 className="text-sm font-semibold text-white mb-4">Precisa de Ajuda?</h3>
              <div className="space-y-3">
                <a
                  href="mailto:suporte@goldspay.com"
                  className="flex items-center gap-3 text-sm text-gray-400 hover:text-amber-500 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>suporte@goldspay.com</span>
                </a>
                <a
                  href="tel:+5511999999999"
                  className="flex items-center gap-3 text-sm text-gray-400 hover:text-amber-500 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>+55 (11) 99999-9999</span>
                </a>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={onLogout}
                className="w-full py-4 bg-[#0f0f0f] border-2 border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-900 hover:border-gray-600 transition-all duration-200"
              >
                Sair da Conta
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            GoldsPay - Gateway de Pagamento Confiável
          </p>
        </div>
      </div>
    </div>
  );
}

export default PendingApproval;
