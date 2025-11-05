import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import {
  CheckCircle,
  AlertCircle,
  Upload,
  User,
  Building2,
  FileText,
  Camera,
  Clock,
  ChevronRight,
  X,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';

interface KYCData {
  type: 'individual' | 'business';
  status: string;
  verification_level: number;
}

interface FormData {
  full_name: string;
  cpf: string;
  birth_date: string;
  email: string;
  phone: string;
  address: {
    street: string;
    number: string;
    complement: string;
    city: string;
    state: string;
    zip_code: string;
  };
}

const KYC = () => {
  const supabase = useSupabaseClient();
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    cpf: '',
    birth_date: '',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);

  useEffect(() => {
    fetchKYCStatus();
  }, []);

  const fetchKYCStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('kyc_verifications')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setKycData(data);
        setFormData(prev => ({
          ...prev,
          full_name: data.full_name || '',
          cpf: data.cpf || '',
          birth_date: data.birth_date || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || prev.address,
        }));
      }
    } catch (err) {
      console.error('Error fetching KYC status:', err);
    }
  };

  const handleStartKYC = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('kyc_verifications')
        .insert({
          user_id: user.id,
          type: 'individual',
          status: 'pending',
          verification_level: 1,
        });

      if (error) throw error;

      setSuccess('KYC iniciado com sucesso!');
      setStep(1);
      await fetchKYCStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar KYC');
    } finally {
      setLoading(false);
    }
  };

  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;

    return true;
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!validateCPF(formData.cpf)) {
        throw new Error('CPF inválido');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('kyc_verifications')
        .update({
          full_name: formData.full_name,
          cpf: formData.cpf.replace(/[^\d]/g, ''),
          birth_date: formData.birth_date,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          status: 'pending',
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSuccess('Informações salvas com sucesso!');
      setStep(2);
      await fetchKYCStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar informações');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${documentType}-${Date.now()}.${fileExt}`;
      const filePath = `kyc-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc')
        .getPublicUrl(filePath);

      const { data: kyc } = await supabase
        .from('kyc_verifications')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!kyc) throw new Error('KYC not found');

      const { error: docError } = await supabase
        .from('kyc_documents')
        .insert({
          kyc_verification_id: kyc.id,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          file_mime_type: file.type,
          file_path: filePath,
          file_url: publicUrl,
          processing_status: 'pending',
        });

      if (docError) throw docError;

      setSuccess(`Documento ${documentType} enviado com sucesso!`);
      setSelectedFile(null);
      await fetchKYCStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleSelfieCapture = async (file: File) => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;

          const { error } = await supabase
            .from('kyc_verifications')
            .update({
              selfie_image: base64String,
              verification_level: 3,
            })
            .eq('user_id', user.id);

          if (error) throw error;

          setSelfieImage(base64String);
          setSuccess('Selfie capturada com sucesso!');
          await fetchKYCStatus();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao processar selfie');
        } finally {
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao capturar selfie');
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const { error } = await supabase
        .from('kyc_verifications')
        .update({
          status: 'under_review',
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setSuccess('Verificação enviada para revisão! Você receberá um email em breve.');
      setStep(4);
      await fetchKYCStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar para revisão');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'under_review':
        return <Clock className="w-6 h-6 text-blue-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-yellow-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      not_started: 'Não iniciado',
      pending: 'Pendente',
      under_review: 'Em análise',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      expired: 'Expirado',
    };
    return labels[status] || status;
  };

  if (!kycData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h1 className="text-3xl font-bold mb-4">Verificação de Identidade (KYC)</h1>
            <p className="text-gray-600 mb-8">
              Complete o processo de verificação para desbloqueiar todos os recursos da plataforma.
            </p>
            <button
              onClick={handleStartKYC}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
            >
              {loading ? 'Iniciando...' : 'Iniciar Verificação'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Verificação de Identidade</h1>
            <div className="flex items-center gap-2">
              {getStatusIcon(kycData.status)}
              <span className="font-semibold text-gray-700">
                {getStatusLabel(kycData.status)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Erro</h3>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Sucesso</h3>
                <p className="text-green-800 text-sm">{success}</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { num: 1, title: 'Informações', icon: FileText },
            { num: 2, title: 'Documentos', icon: Upload },
            { num: 3, title: 'Selfie', icon: Camera },
            { num: 4, title: 'Revisão', icon: CheckCircle },
          ].map((s, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border-2 ${
                step >= s.num
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    step >= s.num
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {s.num}
                </div>
                <div>
                  <p className="text-sm font-semibold">{s.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Informações Pessoais</h2>
            <form onSubmit={handleSubmitInfo} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  placeholder="João Silva"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">CPF</label>
                  <input
                    type="text"
                    required
                    value={formData.cpf}
                    onChange={(e) =>
                      setFormData({ ...formData, cpf: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    placeholder="123.456.789-10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Data de Nascimento</label>
                  <input
                    type="date"
                    required
                    value={formData.birth_date}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_date: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefone
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                    placeholder="11999999999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Endereço</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    required
                    placeholder="Rua"
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Número"
                    value={formData.address.number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, number: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    placeholder="Complemento"
                    value={formData.address.complement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, complement: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    required
                    placeholder="Cidade"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Estado"
                    maxLength={2}
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <input
                    type="text"
                    required
                    placeholder="CEP"
                    value={formData.address.zip_code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, zip_code: e.target.value },
                      })
                    }
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                {loading ? 'Salvando...' : 'Continuar para Documentos'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {step >= 2 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Enviar Documentos</h2>
            <div className="space-y-4">
              {['cpf', 'rg', 'cnh'].map((docType) => (
                <div
                  key={docType}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-600 transition"
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="font-semibold text-gray-700 mb-1">
                    {docType.toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Clique para selecionar ou arraste um arquivo
                  </p>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                        handleFileUpload(e.target.files[0], docType);
                      }
                    }}
                    className="hidden"
                    id={`file-${docType}`}
                  />
                  <label
                    htmlFor={`file-${docType}`}
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer"
                  >
                    Selecionar arquivo
                  </label>
                </div>
              ))}
            </div>

            {step >= 3 && (
              <div className="mt-8 pt-8 border-t-2">
                <h3 className="text-xl font-bold mb-6">Capturar Selfie</h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {selfieImage ? (
                    <img
                      src={selfieImage}
                      alt="Selfie"
                      className="w-32 h-32 object-cover rounded-lg mx-auto mb-4"
                    />
                  ) : (
                    <Camera className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  )}
                  <p className="font-semibold text-gray-700 mb-4">
                    {selfieImage ? 'Selfie capturada' : 'Capturar selfie para verificação'}
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleSelfieCapture(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="selfie-input"
                  />
                  <label
                    htmlFor="selfie-input"
                    className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded cursor-pointer"
                  >
                    Capturar selfie
                  </label>
                </div>

                {selfieImage && (
                  <button
                    onClick={handleSubmitReview}
                    disabled={loading}
                    className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition duration-200"
                  >
                    {loading ? 'Enviando para revisão...' : 'Enviar para Revisão'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step >= 4 && kycData.status === 'under_review' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Clock className="w-16 h-16 mx-auto mb-4 text-blue-600" />
            <h2 className="text-2xl font-bold mb-2">Verificação em Análise</h2>
            <p className="text-gray-600 mb-4">
              Seus documentos foram recebidos com sucesso. Nossa equipe está analisando. Você receberá um email em breve.
            </p>
            <p className="text-sm text-gray-500">Tempo estimado: 24 a 48 horas</p>
          </div>
        )}

        {kycData.status === 'approved' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Verificação Aprovada</h2>
            <p className="text-gray-600">
              Parabéns! Sua verificação foi aprovada. Você agora tem acesso a todos os recursos da plataforma.
            </p>
          </div>
        )}

        {kycData.status === 'rejected' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold mb-2">Verificação Rejeitada</h2>
            <p className="text-gray-600 mb-4">
              {kycData.rejected_reason || 'Sua verificação foi rejeitada. Entre em contato com nosso suporte.'}
            </p>
            <button
              onClick={() => setStep(1)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYC;
