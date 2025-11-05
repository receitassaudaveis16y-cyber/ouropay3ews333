import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Building2, Mail, Phone, Globe, MapPin, FileText, Save, Edit2, Check, X } from 'lucide-react';

interface CompanyProps {
  userId: string;
}

interface CompanyProfile {
  business_type: string;
  document_number: string;
  business_name: string;
  invoice_name: string;
  representative_email: string;
  representative_phone: string;
  company_website: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  complement?: string;
  status: string;
}

function Company({ userId }: CompanyProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [companyData, setCompanyData] = useState<CompanyProfile>({
    business_type: 'fisica',
    document_number: '',
    business_name: '',
    invoice_name: '',
    representative_email: '',
    representative_phone: '',
    company_website: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
    complement: '',
    status: 'active'
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    if (!supabase || !userId) return;

    try {
      const { data, error } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyData({
          business_type: data.business_type || 'fisica',
          document_number: data.document_number || '',
          business_name: data.business_name || '',
          invoice_name: data.invoice_name || '',
          representative_email: data.representative_email || '',
          representative_phone: data.representative_phone || '',
          company_website: data.company_website || '',
          street: data.street || '',
          number: data.number || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          postal_code: data.postal_code || '',
          complement: data.complement || '',
          status: data.status || 'active'
        });
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados da empresa:', error);
    }
  };

  const handleSave = async () => {
    if (!supabase || !userId) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await supabase
        .from('company_profiles')
        .update({
          invoice_name: companyData.invoice_name,
          representative_email: companyData.representative_email,
          representative_phone: companyData.representative_phone,
          company_website: companyData.company_website,
          street: companyData.street,
          number: companyData.number,
          neighborhood: companyData.neighborhood,
          city: companyData.city,
          state: companyData.state,
          postal_code: companyData.postal_code,
          complement: companyData.complement
        })
        .eq('user_id', userId);

      if (error) throw error;

      setSuccessMessage('Dados atualizados com sucesso!');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Erro ao atualizar dados');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    } else if (digits.length === 14) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
    return value;
  };

  const formatCep = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 8) {
      return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    }
    return value;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Ativa', color: 'text-green-500 bg-green-500/10 border-green-500' },
      pending: { label: 'Pendente', color: 'text-amber-500 bg-amber-500/10 border-amber-500' },
      suspended: { label: 'Suspensa', color: 'text-red-500 bg-red-500/10 border-red-500' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-1">Informações da Empresa</h1>
          <p className="text-gray-400 text-sm">Gerencie os dados cadastrais da sua empresa</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(companyData.status)}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              <span>Editar</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  loadCompanyData();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f0f0f] border border-gray-700 text-white font-semibold rounded-lg hover:bg-gray-900 transition-all"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-500/10 border border-green-500 rounded-lg p-3 text-sm text-green-500 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 bg-red-500/10 border border-red-500 rounded-lg p-3 text-sm text-red-500">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6">
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Building2 className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-semibold text-white">Dados Cadastrais</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tipo de Negócio
              </label>
              <input
                type="text"
                value={companyData.business_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {companyData.business_type === 'juridica' ? 'CNPJ' : 'CPF'}
              </label>
              <input
                type="text"
                value={formatCpfCnpj(companyData.document_number)}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-gray-400"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {companyData.business_type === 'juridica' ? 'Razão Social' : 'Nome Completo'}
              </label>
              <input
                type="text"
                value={companyData.business_name}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-700 bg-[#0f0f0f] text-gray-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Nome na Fatura
              </label>
              <input
                type="text"
                value={companyData.invoice_name}
                onChange={(e) => setCompanyData({ ...companyData, invoice_name: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Site da Empresa
              </label>
              <input
                type="text"
                value={companyData.company_website}
                onChange={(e) => setCompanyData({ ...companyData, company_website: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Mail className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-semibold text-white">Contato</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={companyData.representative_email}
                onChange={(e) => setCompanyData({ ...companyData, representative_email: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={formatPhone(companyData.representative_phone)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setCompanyData({ ...companyData, representative_phone: digits });
                }}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              <MapPin className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-lg font-semibold text-white">Endereço</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                CEP
              </label>
              <input
                type="text"
                value={formatCep(companyData.postal_code)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '');
                  setCompanyData({ ...companyData, postal_code: digits });
                }}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Logradouro
              </label>
              <input
                type="text"
                value={companyData.street}
                onChange={(e) => setCompanyData({ ...companyData, street: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Número
              </label>
              <input
                type="text"
                value={companyData.number}
                onChange={(e) => setCompanyData({ ...companyData, number: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={companyData.neighborhood}
                onChange={(e) => setCompanyData({ ...companyData, neighborhood: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={companyData.city}
                onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Estado
              </label>
              <input
                type="text"
                value={companyData.state}
                onChange={(e) => setCompanyData({ ...companyData, state: e.target.value.toUpperCase() })}
                readOnly={!isEditing}
                maxLength={2}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Complemento
              </label>
              <input
                type="text"
                value={companyData.complement || ''}
                onChange={(e) => setCompanyData({ ...companyData, complement: e.target.value })}
                readOnly={!isEditing}
                className={`w-full px-4 py-3 rounded-xl border transition-all ${
                  isEditing
                    ? 'border-gray-700 bg-[#0f0f0f] text-white focus:outline-none focus:ring-2 focus:ring-amber-500'
                    : 'border-gray-700 bg-[#0f0f0f] text-gray-400'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Company;
