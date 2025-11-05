import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Users,
  DollarSign,
  TrendingUp,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  ArrowLeft,
  Settings,
  Key,
  Palette,
  Trash2,
  Save,
  Bell,
  BarChart3,
  FileText,
  Lock,
  Unlock,
  Edit,
  UserX,
  Database,
  Zap,
  Globe,
  CreditCard,
  Image as ImageIcon,
  Type,
  Percent,
  Target,
  Plus,
  Menu,
  X
} from 'lucide-react';

interface AdminProps {
  onBack: () => void;
}

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

interface CompanyProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  document_number: string;
  representative_name: string;
  representative_email: string;
  representative_phone: string;
  status: string;
  approved_by?: string;
  approved_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  company_website?: string;
  street?: string;
  city?: string;
  state?: string;
}

interface UserRegistrationStatus {
  id: string;
  user_id: string;
  email: string;
  registration_step: 'created' | 'company_info' | 'documents' | 'completed';
  is_complete: boolean;
  company_data_complete: boolean;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: string;
  status: string;
  payment_method: string;
  created_at: string;
}

interface PlatformSetting {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  description: string;
}

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  details: any;
  created_at: string;
}

function Admin({ onBack }: AdminProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fraudRules, setFraudRules] = useState<any[]>([]);
  const [payoutBatches, setPayoutBatches] = useState<any[]>([]);
  const [reconciliationReports, setReconciliationReports] = useState<any[]>([]);
  const [complianceDocs, setComplianceDocs] = useState<any[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRegistrations, setUserRegistrations] = useState<UserRegistrationStatus[]>([]);

  const supabase = useMemo(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
  }, []);

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    activeTransactions: 0,
    approvalRate: 0,
    averageTicket: 0,
    rejectionRate: 0,
    averageApprovalTime: 0,
    conversionRate: 0,
  });

  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const [isProcessing, setIsProcessing] = useState(false);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: 'success', message: '' });
    }, 5000);
  };

  useEffect(() => {
    loadData();

    if (!supabase) return;

    // Configurar atualização em tempo real para company_profiles
    const companySubscription = supabase
      .channel('company_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'company_profiles'
        },
        (payload) => {
          console.log('Company profile changed:', payload);
          loadData();
        }
      )
      .subscribe();

    // Configurar atualização em tempo real para transactions
    const transactionSubscription = supabase
      .channel('transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          console.log('Transaction changed:', payload);
          loadData();
        }
      )
      .subscribe();

    // Configurar atualização em tempo real para activity_logs
    const activitySubscription = supabase
      .channel('activity_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          console.log('Activity log added:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(companySubscription);
      supabase.removeChannel(transactionSubscription);
      supabase.removeChannel(activitySubscription);
    };
  }, []);

  const loadData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.allSettled([
        supabase.from('company_profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('platform_settings').select('*'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('fraud_detection_rules').select('*').order('priority', { ascending: true }),
        supabase.from('payout_batches').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('reconciliation_reports').select('*').order('report_date', { ascending: false }).limit(30),
        supabase.from('compliance_documents').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('user_registration_status').select('*').order('created_at', { ascending: false })
      ]);

      const [companiesRes, transactionsRes, settingsRes, logsRes, fraudRes, payoutsRes, reconRes, docsRes, registrationsRes] = results;

      if (companiesRes.status === 'fulfilled' && companiesRes.value.data) {
        setCompanies(companiesRes.value.data);
      }
      if (transactionsRes.status === 'fulfilled' && transactionsRes.value.data) {
        setTransactions(transactionsRes.value.data);
      }
      if (logsRes.status === 'fulfilled' && logsRes.value.data) {
        setActivityLogs(logsRes.value.data);
      }
      if (fraudRes.status === 'fulfilled' && fraudRes.value.data) {
        setFraudRules(fraudRes.value.data);
      }
      if (payoutsRes.status === 'fulfilled' && payoutsRes.value.data) {
        setPayoutBatches(payoutsRes.value.data);
      }
      if (reconRes.status === 'fulfilled' && reconRes.value.data) {
        setReconciliationReports(reconRes.value.data);
      }
      if (docsRes.status === 'fulfilled' && docsRes.value.data) {
        setComplianceDocs(docsRes.value.data);
      }
      if (registrationsRes.status === 'fulfilled' && registrationsRes.value.data) {
        setUserRegistrations(registrationsRes.value.data);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
        const settingsMap: Record<string, string> = {};
        settingsRes.value.data.forEach((s: PlatformSetting) => {
          settingsMap[s.setting_key] = s.setting_value;
        });
        setSettings(settingsMap);
      }

      const transactionsData = transactionsRes.status === 'fulfilled' ? transactionsRes.value.data : [];
      const companiesData = companiesRes.status === 'fulfilled' ? companiesRes.value.data : [];

      const totalRevenue = transactionsData
        ?.filter(t => t.status === 'paid')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const pendingApprovals = companiesData?.filter(c => (c as any).status === 'pending').length || 0;
      const activeTransactions = transactionsData?.filter(t => t.status === 'pending').length || 0;

      const totalTransactions = transactionsData?.length || 0;
      const paidTransactions = transactionsData?.filter(t => t.status === 'paid').length || 0;
      const approvalRate = totalTransactions > 0 ? (paidTransactions / totalTransactions) * 100 : 0;

      const averageTicket = paidTransactions > 0 ? totalRevenue / paidTransactions : 0;

      const uniqueUserIds = new Set(companiesData?.map(c => c.user_id) || []);

      const totalCompanies = companiesData?.length || 0;
      const approvedCompanies = companiesData?.filter(c => c.status === 'approved').length || 0;
      const rejectedCompanies = companiesData?.filter(c => c.status === 'rejected').length || 0;
      const rejectionRate = totalCompanies > 0 ? (rejectedCompanies / totalCompanies) * 100 : 0;

      const approvalTimes: number[] = [];
      companiesData?.forEach(c => {
        if (c.approved_at && c.created_at) {
          const timeDiff = new Date(c.approved_at).getTime() - new Date(c.created_at).getTime();
          approvalTimes.push(timeDiff / (1000 * 60 * 60));
        }
      });
      const averageApprovalTime = approvalTimes.length > 0
        ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
        : 0;

      const conversionRate = totalCompanies > 0 ? (approvedCompanies / totalCompanies) * 100 : 0;

      setStats({
        totalUsers: uniqueUserIds.size,
        totalRevenue,
        pendingApprovals,
        activeTransactions,
        approvalRate,
        averageTicket,
        rejectionRate,
        averageApprovalTime,
        conversionRate,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const logActivity = async (action: string, resourceType: string, details?: any) => {
    if (!supabase) return;
    try {
      await supabase.from('activity_logs').insert({
        action,
        resource_type: resourceType,
        details
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  const approveCompany = async (companyId: string) => {
    if (!supabase || isProcessing) return;

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification('error', 'Usuário não autenticado');
        return;
      }

      const company = companies.find(c => c.id === companyId);
      if (!company) {
        showNotification('error', 'Empresa não encontrada');
        return;
      }

      const { error } = await supabase
        .from('company_profiles')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          rejection_reason: null
        })
        .eq('id', companyId);

      if (error) throw error;

      await logActivity('approve_company', 'company_profile', {
        company_id: companyId,
        company_name: company?.business_name
      });

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: company.representative_email,
            name: company.representative_name || company.business_name,
            businessName: company.business_name,
            status: 'approved',
          }),
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      showNotification('success', `Empresa "${company.business_name}" aprovada com sucesso!`);
      await loadData();
      setShowDetailsModal(false);
    } catch (error: any) {
      console.error('Error approving company:', error);
      showNotification('error', `Erro ao aprovar empresa: ${error.message || 'Tente novamente'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const rejectCompany = async (companyId: string) => {
    if (!supabase || !rejectionReason.trim() || isProcessing) {
      if (!rejectionReason.trim()) {
        showNotification('error', 'Por favor, informe o motivo da rejeição');
      }
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showNotification('error', 'Usuário não autenticado');
        return;
      }

      const company = companies.find(c => c.id === companyId);
      if (!company) {
        showNotification('error', 'Empresa não encontrada');
        return;
      }

      const { error } = await supabase
        .from('company_profiles')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', companyId);

      if (error) throw error;

      await logActivity('reject_company', 'company_profile', {
        company_id: companyId,
        company_name: company?.business_name,
        reason: rejectionReason
      });

      try {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email: company.representative_email,
            name: company.representative_name || company.business_name,
            businessName: company.business_name,
            status: 'rejected',
            rejectionReason: rejectionReason,
          }),
        });
      } catch (emailError) {
        console.error('Email notification error:', emailError);
      }

      showNotification('success', `Empresa "${company.business_name}" rejeitada`);
      await loadData();
      setShowRejectionModal(false);
      setShowDetailsModal(false);
      setRejectionReason('');
    } catch (error: any) {
      console.error('Error rejecting company:', error);
      showNotification('error', `Erro ao rejeitar empresa: ${error.message || 'Tente novamente'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({ setting_value: value })
        .eq('setting_key', key);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));

      await logActivity('update_setting', 'platform_settings', { setting_key: key });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating setting:', error);
    }
  };

  const clearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    logActivity('clear_cache', 'system', {});
    alert('Cache limpo com sucesso!');
  };

  const openRejectionModal = (company: CompanyProfile) => {
    setSelectedCompany(company);
    setShowRejectionModal(true);
  };

  const openDetailsModal = (company: CompanyProfile) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
  };

  const getRegistrationStatus = (userId: string) => {
    return userRegistrations.find(reg => reg.user_id === userId);
  };

  const getRegistrationStepLabel = (step: string, isComplete: boolean) => {
    if (isComplete) return 'Completo';

    const labels = {
      'created': 'Cadastro Incompleto',
      'company_info': 'Dados da Empresa',
      'documents': 'Documentos Pendentes',
      'completed': 'Completo'
    };
    return labels[step as keyof typeof labels] || 'Cadastro Incompleto';
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.document_number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || (company as any).status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const allUsersWithRegistration = userRegistrations.map(reg => {
    const company = companies.find(c => c.user_id === reg.user_id);
    return {
      registration: reg,
      company: company || null
    };
  });

  const filteredUsers = allUsersWithRegistration.filter(item => {
    const email = item.registration.email.toLowerCase();
    const companyName = item.company?.business_name?.toLowerCase() || '';
    const matchesSearch = email.includes(searchTerm.toLowerCase()) || companyName.includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'incomplete') return matchesSearch && !item.registration.is_complete;
    if (statusFilter === 'pending' && item.company) return matchesSearch && item.company.status === 'pending';

    return matchesSearch;
  });

  const pendingCompanies = companies.filter(c => (c as any).status === 'pending');

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      paid: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    const icons = {
      pending: Clock,
      approved: CheckCircle,
      rejected: XCircle,
      paid: CheckCircle,
      failed: XCircle,
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`}>
        <Icon className="w-3.5 h-3.5" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
          <p className="text-amber-400 text-lg">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'approvals', label: 'Aprovações', icon: AlertTriangle, badge: stats.pendingApprovals },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'transactions', label: 'Transações', icon: DollarSign },
    { id: 'fees', label: 'Taxas & Carteira', icon: Percent },
    { id: 'fraud', label: 'Anti-Fraude', icon: Shield },
    { id: 'compliance', label: 'Compliance/KYC', icon: Lock },
    { id: 'payouts', label: 'Repasses', icon: Target },
    { id: 'reconciliation', label: 'Conciliação', icon: Database },
    { id: 'psp', label: 'Pagar.me PSP', icon: CreditCard },
    { id: 'customization', label: 'Customização', icon: Palette },
    { id: 'system', label: 'Sistema', icon: Settings },
    { id: 'logs', label: 'Logs', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Shield className="w-4 h-4 text-black" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-amber-400">Admin GoldsPay</h2>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-amber-400 hover:bg-white/5 rounded-lg transition-all"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-[#0f0f0f]/80 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Desktop & Mobile */}
      <div className={`${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static w-64 bg-[#1a1a1a] border-r border-gray-800 flex-col top-0 bottom-0 overflow-y-auto z-50 transition-transform duration-300 lg:flex`}>
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-amber-400">Admin</h2>
              <p className="text-xs text-gray-400">GoldsPay</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-full flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#0f0f0f] border border-amber-500/30 hover:border-amber-500 rounded-lg text-amber-400 transition-all text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-500/50 text-amber-400'
                    : 'text-gray-400 hover:text-amber-400 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`rounded-xl p-4 shadow-2xl border-2 max-w-md ${
            notification.type === 'success'
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : notification.type === 'error'
              ? 'bg-red-500/20 border-red-500 text-red-400'
              : 'bg-blue-500/20 border-blue-500 text-blue-400'
          }`}>
            <div className="flex items-start gap-3">
              {notification.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : notification.type === 'error' ? (
                <XCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <button
                onClick={() => setNotification({ show: false, type: 'success', message: '' })}
                className="text-current hover:opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 w-full lg:ml-0">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 pt-20 lg:pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Shield className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Painel Administrativo</h1>
                <p className="text-xs sm:text-xs sm:text-sm text-gray-400">Controle total da plataforma {settings.platform_name || 'GoldsPay'}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs sm:text-sm">
                <Activity className="w-4 h-4 animate-pulse" />
                Ao Vivo
              </div>
              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-xs sm:text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Salvo com sucesso!</span>
                  <span className="sm:hidden">Salvo!</span>
                </div>
              )}
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] hover:from-[#1a1a1a] hover:to-[#0f0f0f] border border-amber-500/30 hover:border-amber-500 rounded-lg text-amber-400 transition-all hover:scale-105 text-xs sm:text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Atualizar</span>
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 backdrop-blur-sm hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <span className="text-xs text-amber-400">Total</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{stats.totalUsers}</div>
                <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Usuários Registrados</div>
              </div>

              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 backdrop-blur-sm hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <span className="text-xs text-amber-400">Total</span>
                </div>
                <div className="text-xl sm:text-3xl font-bold text-amber-400 mb-1">
                  {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Receita Total</div>
              </div>

              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 backdrop-blur-sm hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <span className="text-xs text-amber-400">Pendente</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{stats.pendingApprovals}</div>
                <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Aprovações Pendentes</div>
              </div>

              <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 backdrop-blur-sm hover:border-amber-500/50 transition-all">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  </div>
                  <span className="text-xs text-amber-400">Taxa</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{stats.approvalRate.toFixed(1)}%</div>
                <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Taxa de Aprovação</div>
              </div>
            </div>
          )}

        <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] backdrop-blur-sm rounded-xl border border-amber-500/20 overflow-hidden shadow-2xl">
          <div className="p-4 sm:p-6">
            {activeTab === 'dashboard' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Dashboard Administrativo</h2>
                    <p className="text-xs sm:text-xs sm:text-sm text-gray-400 mt-1">Visão geral de toda a plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{stats.totalUsers}</div>
                    <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Usuários Totais</div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-3xl font-bold text-amber-400 mb-1">
                      {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Receita Total</div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                      </div>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{stats.activeTransactions}</div>
                    <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Transações Ativas</div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <Target className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                      </div>
                    </div>
                    <div className="text-xl sm:text-3xl font-bold text-amber-400 mb-1">
                      {stats.averageTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                    <div className="text-xs sm:text-xs sm:text-sm text-gray-400">Ticket Médio</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20">
                    <h3 className="text-base sm:text-lg font-bold text-amber-400 mb-3 sm:mb-4">Estatísticas de Aprovação</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Taxa de Aprovação</span>
                        <span className="text-2xl font-bold text-green-400">{stats.approvalRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                          style={{ width: `${stats.approvalRate}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-gray-400">Taxa de Rejeição</span>
                        <span className="text-2xl font-bold text-red-400">{stats.rejectionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all duration-500"
                          style={{ width: `${stats.rejectionRate}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-gray-400">Taxa de Conversão</span>
                        <span className="text-2xl font-bold text-blue-400">{stats.conversionRate.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-3 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${stats.conversionRate}%` }}
                        />
                      </div>

                      <div className="pt-4 border-t border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">Tempo Médio de Aprovação</span>
                          <span className="text-lg font-bold text-amber-400">
                            {stats.averageApprovalTime > 0
                              ? `${stats.averageApprovalTime.toFixed(1)}h`
                              : 'N/A'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Pendentes</p>
                          <p className="text-xl font-bold text-amber-400">{stats.pendingApprovals}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Aprovados</p>
                          <p className="text-xl font-bold text-green-400">{companies.filter(c => (c as any).status === 'approved').length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 sm:p-6 border border-amber-500/20">
                    <h3 className="text-base sm:text-lg font-bold text-amber-400 mb-3 sm:mb-4">Atividades Recentes</h3>
                    <div className="space-y-3">
                      {activityLogs.slice(0, 5).map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-gray-800">
                          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 text-black" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{log.action.replace(/_/g, ' ').toUpperCase()}</p>
                            <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Transações</h2>
                    <p className="text-xs sm:text-xs sm:text-sm text-gray-400 mt-1">Gerencie todas as transações da plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
                        <CheckCircle className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pagas</p>
                        <p className="text-xl font-bold text-green-400">{transactions.filter(t => t.status === 'paid').length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
                        <Clock className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pendentes</p>
                        <p className="text-xl font-bold text-yellow-400">{transactions.filter(t => t.status === 'pending').length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                        <XCircle className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Falhadas</p>
                        <p className="text-xl font-bold text-red-400">{transactions.filter(t => t.status === 'failed').length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#0f0f0f]/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Valor</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Método</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {transactions.slice(0, 10).map((transaction) => (
                          <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono text-gray-400">{transaction.id.slice(0, 8)}...</td>
                            <td className="px-6 py-4 text-sm font-bold text-amber-400">
                              {parseFloat(transaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">{transaction.payment_method}</td>
                            <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                            <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">
                              {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Taxas & Carteira</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Configure as taxas de pagamento e gerencie a carteira da plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Zap className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">PIX</h3>
                        <p className="text-xs text-gray-400">Taxa instantânea</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Fixa (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.pix_fixed_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, pix_fixed_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Percentual (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.pix_percentage_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, pix_percentage_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-500">Exemplo: R$ 100,00</p>
                        <p className="text-sm text-amber-400 font-bold">
                          Taxa: R$ {(parseFloat(settings.pix_fixed_fee || '0') + (100 * parseFloat(settings.pix_percentage_fee || '0') / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <CreditCard className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Cartão de Crédito</h3>
                        <p className="text-xs text-gray-400">Parcelado e à vista</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Fixa (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.credit_card_fixed_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, credit_card_fixed_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Percentual (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.credit_card_percentage_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, credit_card_percentage_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-500">Exemplo: R$ 100,00</p>
                        <p className="text-sm text-amber-400 font-bold">
                          Taxa: R$ {(parseFloat(settings.credit_card_fixed_fee || '0') + (100 * parseFloat(settings.credit_card_percentage_fee || '0') / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <FileText className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Boleto</h3>
                        <p className="text-xs text-gray-400">Pagamento bancário</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Fixa (R$)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.boleto_fixed_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, boleto_fixed_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 mb-1 block">Taxa Percentual (%)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.boleto_percentage_fee || '0.00'}
                          onChange={(e) => setSettings(prev => ({ ...prev, boleto_percentage_fee: e.target.value }))}
                          className="w-full px-4 py-2 bg-[#0f0f0f] border border-gray-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="pt-3 border-t border-gray-800">
                        <p className="text-xs text-gray-500">Exemplo: R$ 100,00</p>
                        <p className="text-sm text-amber-400 font-bold">
                          Taxa: R$ {(parseFloat(settings.boleto_fixed_fee || '0') + (100 * parseFloat(settings.boleto_percentage_fee || '0') / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-amber-500/20">
                  <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Carteira da Plataforma
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#0f0f0f]/50 rounded-lg p-4 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Saldo Total</p>
                      <p className="text-2xl font-bold text-green-400">
                        {stats.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="bg-[#0f0f0f]/50 rounded-lg p-4 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Receita com Taxas</p>
                      <p className="text-2xl font-bold text-amber-400">
                        {(stats.totalRevenue * 0.05).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </p>
                    </div>
                    <div className="bg-[#0f0f0f]/50 rounded-lg p-4 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Transações</p>
                      <p className="text-2xl font-bold text-white">
                        {transactions.length}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    updateSetting('pix_fixed_fee', settings.pix_fixed_fee || '0.00');
                    updateSetting('pix_percentage_fee', settings.pix_percentage_fee || '0.00');
                    updateSetting('credit_card_fixed_fee', settings.credit_card_fixed_fee || '0.00');
                    updateSetting('credit_card_percentage_fee', settings.credit_card_percentage_fee || '0.00');
                    updateSetting('boleto_fixed_fee', settings.boleto_fixed_fee || '0.00');
                    updateSetting('boleto_percentage_fee', settings.boleto_percentage_fee || '0.00');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30"
                >
                  <Save className="w-5 h-5" />
                  Salvar Configurações de Taxas
                </button>
              </div>
            )}

            {activeTab === 'approvals' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Aprovações Pendentes</h2>
                    <p className="text-xs sm:text-xs sm:text-sm text-gray-400 mt-1">
                      {pendingCompanies.length} {pendingCompanies.length === 1 ? 'cadastro aguardando' : 'cadastros aguardando'} aprovação
                    </p>
                  </div>
                </div>

                {pendingCompanies.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                      <CheckCircle className="w-10 h-10 text-black" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Nenhuma aprovação pendente</h3>
                    <p className="text-gray-400">Todos os cadastros foram processados</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {pendingCompanies.map((company) => (
                      <div key={company.id} className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-6 border border-amber-500/20 hover:border-amber-500/50 transition-all">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <Users className="w-6 h-6 text-black" />
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-amber-400">{company.business_name}</h3>
                                <p className="text-xs sm:text-sm text-gray-400">{company.business_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                              <div className="bg-white/5 rounded-lg p-3 border border-gray-800">
                                <p className="text-xs text-gray-500 mb-1">Documento</p>
                                <p className="text-sm font-medium text-white">{company.document_number}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 border border-gray-800">
                                <p className="text-xs text-gray-500 mb-1">Representante</p>
                                <p className="text-sm font-medium text-white">{company.representative_name}</p>
                              </div>
                              <div className="bg-white/5 rounded-lg p-3 border border-gray-800">
                                <p className="text-xs text-gray-500 mb-1">E-mail</p>
                                <p className="text-sm font-medium text-white">{company.representative_email}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                          <button
                            onClick={() => openDetailsModal(company)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-amber-400 border border-amber-500/30 hover:border-amber-500 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                            Ver Detalhes
                          </button>
                          <button
                            onClick={() => approveCompany(company.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-green-500/30"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprovar
                          </button>
                          <button
                            onClick={() => openRejectionModal(company)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-red-500/30"
                          >
                            <XCircle className="w-4 h-4" />
                            Rejeitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Gerenciamento de Usuários</h2>
                    <p className="text-xs sm:text-xs sm:text-sm text-gray-400 mt-1">Visualize e gerencie todos os usuários da plataforma</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nome ou documento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="incomplete">Cadastro Incompleto</option>
                    <option value="pending">Pendente Aprovação</option>
                    <option value="approved">Aprovado</option>
                    <option value="rejected">Rejeitado</option>
                  </select>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#0f0f0f]/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Usuário</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Empresa</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Status Cadastro</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Status Aprovação</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-amber-400 uppercase tracking-wider">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {filteredUsers.map((item) => {
                          const regStatus = item.registration;
                          const company = item.company;

                          return (
                            <tr key={regStatus.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-white">{regStatus.email}</div>
                                  {company && <div className="text-xs text-gray-400">{company.representative_name}</div>}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">
                                {company ? company.business_name : <span className="text-amber-400">Não cadastrado</span>}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                                  regStatus.is_complete
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                }`}>
                                  {getRegistrationStepLabel(regStatus.registration_step, regStatus.is_complete)}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {company ? getStatusBadge(company.status) : <span className="text-gray-500 text-xs">-</span>}
                              </td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">
                                {new Date(regStatus.created_at).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  {company && (
                                    <button
                                      onClick={() => openDetailsModal(company)}
                                      className="p-2 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all border border-transparent hover:border-amber-500/30"
                                      title="Ver Detalhes"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  )}
                                  {!company && (
                                    <span className="text-xs text-gray-500">Aguardando dados</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'psp' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Gerenciamento de PSPs</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Configure múltiplos provedores de pagamento (Stripe e Pagar.me)</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30 flex-shrink-0">
                      <Shield className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-amber-400 mb-2">Múltiplos PSPs Ativos</h3>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Configure Stripe e Pagar.me simultaneamente. Você pode ativar ambos e escolher o padrão. Suas chaves API são armazenadas de forma segura e criptografada.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-purple-400">Stripe</h3>
                          <p className="text-xs text-gray-400">Global Payment Platform</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-purple-400 mb-2">
                          <Key className="w-4 h-4" />
                          Chave Secreta
                        </label>
                        <input
                          type="password"
                          placeholder="sk_test_xxxxxxxxxxxxx"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-purple-400 mb-2">
                          <Unlock className="w-4 h-4" />
                          Chave Pública
                        </label>
                        <input
                          type="text"
                          placeholder="pk_test_xxxxxxxxxxxxx"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-purple-400 mb-2">
                          <Lock className="w-4 h-4" />
                          Webhook Secret
                        </label>
                        <input
                          type="password"
                          placeholder="whsec_xxxxxxxxxxxxx"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-purple-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs"
                        />
                        <p className="text-xs text-gray-500 mt-1">Webhook URL: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-webhook</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                          <input type="checkbox" className="w-4 h-4 rounded border-purple-500/30 bg-[#0f0f0f]" />
                          Ativo
                        </label>
                        <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                          <input type="checkbox" className="w-4 h-4 rounded border-purple-500/30 bg-[#0f0f0f]" />
                          Padrão
                        </label>
                      </div>

                      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-purple-500/20">
                        <Save className="w-4 h-4" />
                        Salvar Stripe
                      </button>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-green-400">Pagar.me</h3>
                          <p className="text-xs text-gray-400">Brazilian Payment Gateway</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                          <Key className="w-4 h-4" />
                          Chave Secreta
                        </label>
                        <input
                          type="password"
                          value={settings.pagarme_secret_key || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, pagarme_secret_key: e.target.value }))}
                          placeholder="sk_test_xxxxxxxxxxxxx"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-green-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                          <Unlock className="w-4 h-4" />
                          Chave Pública
                        </label>
                        <input
                          type="text"
                          value={settings.pagarme_public_key || ''}
                          onChange={(e) => setSettings(prev => ({ ...prev, pagarme_public_key: e.target.value }))}
                          placeholder="pk_test_xxxxxxxxxxxxx"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-green-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                          <Percent className="w-4 h-4" />
                          Taxa (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={settings.transaction_fee_percentage || '2.99'}
                          onChange={(e) => setSettings(prev => ({ ...prev, transaction_fee_percentage: e.target.value }))}
                          placeholder="2.99"
                          className="w-full px-4 py-2 bg-[#0f0f0f]/50 border border-green-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Webhook URL: {import.meta.env.VITE_SUPABASE_URL}/functions/v1/pagarme-webhook</p>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-green-500/30 bg-[#0f0f0f]" />
                          Ativo
                        </label>
                        <label className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
                          <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-green-500/30 bg-[#0f0f0f]" />
                          Padrão
                        </label>
                      </div>

                      <button
                        onClick={() => {
                          updateSetting('pagarme_secret_key', settings.pagarme_secret_key || '');
                          updateSetting('pagarme_public_key', settings.pagarme_public_key || '');
                          updateSetting('transaction_fee_percentage', settings.transaction_fee_percentage || '2.99');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-green-500/20"
                      >
                        <Save className="w-4 h-4" />
                        Salvar Pagar.me
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-amber-400 mb-4">Métodos de Pagamento Suportados</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-[#0f0f0f]/50 rounded-lg border border-purple-500/20">
                      <span className="text-sm text-gray-300">Stripe</span>
                      <div className="flex gap-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-purple-500/20 rounded">Cartão</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#0f0f0f]/50 rounded-lg border border-green-500/20">
                      <span className="text-sm text-gray-300">Pagar.me</span>
                      <div className="flex gap-2 text-xs text-gray-400">
                        <span className="px-2 py-1 bg-green-500/20 rounded">Cartão</span>
                        <span className="px-2 py-1 bg-green-500/20 rounded">PIX</span>
                        <span className="px-2 py-1 bg-green-500/20 rounded">Boleto</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customization' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Customização da Plataforma</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Personalize a aparência e identidade visual da sua plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Type className="w-4 h-4" />
                      Nome da Plataforma
                    </label>
                    <input
                      type="text"
                      value={settings.platform_name || 'GoldsPay'}
                      onChange={(e) => setSettings(prev => ({ ...prev, platform_name: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <ImageIcon className="w-4 h-4" />
                      URL do Logo
                    </label>
                    <input
                      type="text"
                      value={settings.platform_logo_url || '/logo.png'}
                      onChange={(e) => setSettings(prev => ({ ...prev, platform_logo_url: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Palette className="w-4 h-4" />
                      Cor Primária
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <input
                        type="color"
                        value={settings.primary_color || '#f59e0b'}
                        onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="w-16 h-12 bg-[#0f0f0f] border border-amber-500/30 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.primary_color || '#f59e0b'}
                        onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Palette className="w-4 h-4" />
                      Cor Secundária
                    </label>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      <input
                        type="color"
                        value={settings.secondary_color || '#1a1a1a'}
                        onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="w-16 h-12 bg-[#0f0f0f] border border-amber-500/30 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.secondary_color || '#1a1a1a'}
                        onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        className="flex-1 px-4 py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Globe className="w-4 h-4" />
                      URL do Favicon
                    </label>
                    <input
                      type="text"
                      value={settings.favicon_url || '/logo.png'}
                      onChange={(e) => setSettings(prev => ({ ...prev, favicon_url: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Type className="w-4 h-4" />
                      Slogan da Plataforma
                    </label>
                    <input
                      type="text"
                      value={settings.platform_slogan || 'Pagamentos simplificados'}
                      onChange={(e) => setSettings(prev => ({ ...prev, platform_slogan: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <FileText className="w-4 h-4" />
                      Meta Descrição (SEO)
                    </label>
                    <textarea
                      value={settings.platform_description || 'Plataforma de pagamentos moderna e segura'}
                      onChange={(e) => setSettings(prev => ({ ...prev, platform_description: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      rows={3}
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Globe className="w-4 h-4" />
                      E-mail de Suporte
                    </label>
                    <input
                      type="email"
                      value={settings.support_email || 'suporte@goldspay.com'}
                      onChange={(e) => setSettings(prev => ({ ...prev, support_email: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <Globe className="w-4 h-4" />
                      Telefone de Suporte
                    </label>
                    <input
                      type="text"
                      value={settings.support_phone || '+55 11 0000-0000'}
                      onChange={(e) => setSettings(prev => ({ ...prev, support_phone: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    updateSetting('platform_name', settings.platform_name || 'GoldsPay');
                    updateSetting('platform_logo_url', settings.platform_logo_url || '/logo.png');
                    updateSetting('primary_color', settings.primary_color || '#f59e0b');
                    updateSetting('secondary_color', settings.secondary_color || '#1a1a1a');
                    updateSetting('favicon_url', settings.favicon_url || '/logo.png');
                    updateSetting('platform_slogan', settings.platform_slogan || 'Pagamentos simplificados');
                    updateSetting('platform_description', settings.platform_description || 'Plataforma de pagamentos moderna e segura');
                    updateSetting('support_email', settings.support_email || 'suporte@goldspay.com');
                    updateSetting('support_phone', settings.support_phone || '+55 11 0000-0000');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30"
                >
                  <Save className="w-5 h-5" />
                  Salvar Customizações
                </button>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Configurações do Sistema</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Gerencie configurações avançadas da plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/30">
                          <UserCheck className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Aprovação Automática</h3>
                          <p className="text-xs text-gray-400">Aprovar cadastros automaticamente</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enable_auto_approval === 'true'}
                          onChange={(e) => {
                            const newValue = e.target.checked ? 'true' : 'false';
                            setSettings(prev => ({ ...prev, enable_auto_approval: newValue }));
                            updateSetting('enable_auto_approval', newValue);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                          <AlertTriangle className="w-5 h-5 text-black" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-white">Modo Manutenção</h3>
                          <p className="text-xs text-gray-400">Desabilitar acesso ao sistema</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.maintenance_mode === 'true'}
                          onChange={(e) => {
                            const newValue = e.target.checked ? 'true' : 'false';
                            setSettings(prev => ({ ...prev, maintenance_mode: newValue }));
                            updateSetting('maintenance_mode', newValue);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
                      </label>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl p-6">
                    <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-3">
                      <DollarSign className="w-4 h-4" />
                      Valor Mínimo de Saque (R$)
                    </label>
                    <input
                      type="number"
                      value={settings.min_withdrawal_amount || '50'}
                      onChange={(e) => setSettings(prev => ({ ...prev, min_withdrawal_amount: e.target.value }))}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-amber-500/30 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                        <Trash2 className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">Limpar Cache</h3>
                        <p className="text-xs text-gray-400">Remove dados temporários</p>
                      </div>
                    </div>
                    <button
                      onClick={clearCache}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-red-500/30"
                    >
                      <Zap className="w-4 h-4" />
                      Limpar Cache do Sistema
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    updateSetting('min_withdrawal_amount', settings.min_withdrawal_amount || '50');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30"
                >
                  <Save className="w-5 h-5" />
                  Salvar Configurações do Sistema
                </button>
              </div>
            )}

            {activeTab === 'fraud' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Sistema Anti-Fraude</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Configure regras de detecção de fraude e monitore transações suspeitas</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30">
                    <Plus className="w-4 h-4" />
                    Nova Regra
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/30">
                        <Shield className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Transações Bloqueadas</p>
                        <p className="text-xl font-bold text-red-400">{transactions.filter(t => (t as any).fraud_status === 'blocked').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center shadow-lg shadow-yellow-500/30">
                        <AlertTriangle className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Em Revisão</p>
                        <p className="text-xl font-bold text-yellow-400">{transactions.filter(t => (t as any).fraud_status === 'review').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <CheckCircle className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Regras Ativas</p>
                        <p className="text-xl font-bold text-amber-400">{fraudRules.filter((r: any) => r.is_active).length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="text-lg font-semibold text-amber-400">Regras de Detecção</h3>
                  </div>
                  <div className="p-6">
                    {fraudRules.length === 0 ? (
                      <div className="text-center py-12">
                        <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400">Nenhuma regra configurada</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fraudRules.map((rule: any) => (
                          <div key={rule.id} className="bg-white/5 rounded-lg p-4 border border-gray-800 hover:border-amber-500/50 transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h4 className="text-white font-semibold">{rule.name || 'Regra'}</h4>
                                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">{rule.rule_type || 'N/A'}</span>
                                  {rule.is_active && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Ativa</span>}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 mb-2">{rule.description || 'Sem descrição'}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>Ação: <span className="text-amber-400">{rule.action || 'N/A'}</span></span>
                                  <span>Prioridade: <span className="text-amber-400">{rule.priority || 0}</span></span>
                                </div>
                              </div>
                              <button className="p-2 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all">
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'compliance' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Compliance e KYC</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Gerencie documentos e verificações KYC dos usuários</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-400" />
                      <div>
                        <p className="text-xs text-gray-500">Pendentes</p>
                        <p className="text-xl font-bold text-yellow-400">{complianceDocs.filter((d: any) => d.status === 'pending').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-xs text-gray-500">Aprovados</p>
                        <p className="text-xl font-bold text-green-400">{complianceDocs.filter((d: any) => d.status === 'approved').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <XCircle className="w-8 h-8 text-red-400" />
                      <div>
                        <p className="text-xs text-gray-500">Rejeitados</p>
                        <p className="text-xl font-bold text-red-400">{complianceDocs.filter((d: any) => d.status === 'rejected').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-xl font-bold text-amber-400">{complianceDocs.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#0f0f0f]/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Usuário</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Tipo</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Documento</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Data</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-amber-400 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {complianceDocs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                              <p className="text-gray-400">Nenhum documento encontrado</p>
                            </td>
                          </tr>
                        ) : (
                          complianceDocs.slice(0, 20).map((doc: any) => (
                            <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 text-sm text-white">{doc.id?.slice(0, 8) || 'N/A'}</td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{doc.document_type || 'N/A'}</td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{doc.file_url?.split('/').pop() || 'N/A'}</td>
                              <td className="px-6 py-4">{getStatusBadge(doc.status || 'pending')}</td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button className="p-2 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payouts' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Gestão de Repasses</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Gerencie lotes de repasse e splits de pagamento</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30">
                    <Plus className="w-4 h-4" />
                    Novo Lote
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <Target className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-xs text-gray-500">Total Processado</p>
                        <p className="text-xl font-bold text-amber-400">
                          {(payoutBatches.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-400" />
                      <div>
                        <p className="text-xs text-gray-500">Pendentes</p>
                        <p className="text-xl font-bold text-yellow-400">{payoutBatches.filter((p: any) => p.status === 'pending').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-xs text-gray-500">Concluídos</p>
                        <p className="text-xl font-bold text-green-400">{payoutBatches.filter((p: any) => p.status === 'completed').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <Users className="w-8 h-8 text-blue-400" />
                      <div>
                        <p className="text-xs text-gray-500">Destinatários</p>
                        <p className="text-xl font-bold text-blue-400">{payoutBatches.reduce((sum: number, p: any) => sum + (p.transaction_count || 0), 0) || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#0f0f0f]/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Lote</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Valor Total</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Destinatários</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Agendado</th>
                          <th className="px-6 py-4 text-right text-xs font-medium text-amber-400 uppercase">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {payoutBatches.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                              <p className="text-gray-400">Nenhum lote de repasse encontrado</p>
                            </td>
                          </tr>
                        ) : (
                          payoutBatches.map((batch: any) => (
                            <tr key={batch.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 text-sm font-mono text-white">{batch.id?.slice(0, 8) || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm font-bold text-amber-400">
                                {parseFloat(batch.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{batch.transaction_count || 0}</td>
                              <td className="px-6 py-4">{getStatusBadge(batch.status || 'pending')}</td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{new Date(batch.created_at).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button className="p-2 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-all">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reconciliation' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Conciliação Bancária</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Relatórios de conciliação e auditoria financeira</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-amber-500/30">
                    <Database className="w-4 h-4" />
                    Gerar Relatório
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-green-500/20">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                      <div>
                        <p className="text-xs text-gray-500">Conciliados</p>
                        <p className="text-xl font-bold text-green-400">{reconciliationReports.filter((r: any) => r.status === 'completed').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-8 h-8 text-red-400" />
                      <div>
                        <p className="text-xs text-gray-500">Discrepâncias</p>
                        <p className="text-xl font-bold text-red-400">{reconciliationReports.filter((r: any) => r.status === 'with_issues').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-yellow-500/20">
                    <div className="flex items-center gap-3">
                      <Clock className="w-8 h-8 text-yellow-400" />
                      <div>
                        <p className="text-xs text-gray-500">Pendentes</p>
                        <p className="text-xl font-bold text-yellow-400">{reconciliationReports.filter((r: any) => r.status === 'pending').length || 0}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-xl p-4 border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <Database className="w-8 h-8 text-amber-400" />
                      <div>
                        <p className="text-xs text-gray-500">Total Relatórios</p>
                        <p className="text-xl font-bold text-amber-400">{reconciliationReports.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] rounded-lg border border-amber-500/20 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-800 bg-[#0f0f0f]/50">
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Data</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Transações</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Gateway</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Banco</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Diferença</th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-amber-400 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {reconciliationReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                              <p className="text-gray-400">Nenhum relatório de conciliação encontrado</p>
                            </td>
                          </tr>
                        ) : (
                          reconciliationReports.map((report: any) => (
                            <tr key={report.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 text-sm text-white">{new Date(report.report_date).toLocaleDateString('pt-BR')}</td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">{report.total_transactions || 0}</td>
                              <td className="px-6 py-4 text-sm font-bold text-amber-400">
                                {parseFloat(report.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-6 py-4 text-xs sm:text-sm text-gray-400">
                                {parseFloat(report.total_amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                              <td className="px-6 py-4 text-sm font-bold" style={{ color: '#10b981' }}>
                                R$ 0,00
                              </td>
                              <td className="px-6 py-4">{getStatusBadge(report.status || 'pending')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Logs de Atividade</h2>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">Histórico de todas as ações administrativas</p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#0f0f0f] to-[#1a1a1a] border border-amber-500/20 rounded-xl overflow-hidden">
                  <div className="divide-y divide-gray-800">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                            <Activity className="w-5 h-5 text-black" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-amber-400">{log.action.replace(/_/g, ' ').toUpperCase()}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{log.resource_type}</span>
                            </div>
                            {log.details && (
                              <p className="text-xs text-gray-400 mb-2 font-mono bg-[#0f0f0f]/50 p-2 rounded border border-gray-800">
                                {JSON.stringify(log.details, null, 2)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showDetailsModal && selectedCompany && (
        <div className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border border-amber-500/30 max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f] border-b border-amber-500/30 p-4 sm:p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-amber-400">{selectedCompany.business_name}</h2>
                <p className="text-xs sm:text-xs sm:text-sm text-gray-400 mt-1">Detalhes completos do cadastro</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all border border-gray-800 hover:border-amber-500/30"
              >
                <XCircle className="w-6 h-6 text-gray-400 hover:text-amber-400" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="bg-white/5 rounded-xl p-4 sm:p-6 border border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-amber-400 mb-3 sm:mb-4">Informações da Empresa</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tipo de Negócio</p>
                    <p className="text-sm font-medium text-white">{selectedCompany.business_type === 'juridica' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Documento</p>
                    <p className="text-sm font-medium text-white">{selectedCompany.document_number}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 sm:p-6 border border-gray-800">
                <h3 className="text-base sm:text-lg font-semibold text-amber-400 mb-3 sm:mb-4">Representante Legal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nome</p>
                    <p className="text-sm font-medium text-white">{selectedCompany.representative_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">E-mail</p>
                    <p className="text-sm font-medium text-white">{selectedCompany.representative_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Telefone</p>
                    <p className="text-sm font-medium text-white">{selectedCompany.representative_phone}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-gray-800">
                <h3 className="text-lg font-semibold text-amber-400 mb-4">Status</h3>
                <div className="flex items-center gap-3">
                  {getStatusBadge(selectedCompany.status)}
                  {selectedCompany.status === 'rejected' && selectedCompany.rejection_reason && (
                    <div className="flex-1 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Motivo da Rejeição</p>
                      <p className="text-sm text-red-400">{selectedCompany.rejection_reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedCompany.status === 'pending' && (
                <div className="flex gap-3 pt-4 border-t border-gray-800">
                  <button
                    onClick={() => approveCompany(selectedCompany.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black rounded-lg transition-all font-medium shadow-lg shadow-green-500/30"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aprovar Cadastro
                  </button>
                  <button
                    onClick={() => openRejectionModal(selectedCompany)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-red-500/30"
                  >
                    <XCircle className="w-4 h-4" />
                    Rejeitar Cadastro
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showRejectionModal && selectedCompany && (
        <div className="fixed inset-0 bg-[#0f0f0f]/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl border border-red-500/30 max-w-md w-full shadow-2xl">
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Rejeitar Cadastro</h2>
                  <p className="text-xs sm:text-xs sm:text-sm text-gray-400 truncate">{selectedCompany.business_name}</p>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique o motivo da rejeição do cadastro..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-[#0f0f0f] border border-red-500/30 rounded-lg text-sm sm:text-base text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[100px] sm:min-h-[120px]"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white border border-gray-800 hover:border-gray-700 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => rejectCompany(selectedCompany.id)}
                  disabled={!rejectionReason.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all font-medium shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Rejeição
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

export default Admin;
