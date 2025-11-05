import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AlertTriangle, FileText, Upload, CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react';

interface Dispute {
  id: string;
  transaction_id: string;
  type: 'chargeback' | 'dispute' | 'inquiry';
  reason: string;
  amount: string;
  status: 'open' | 'under_review' | 'won' | 'lost' | 'closed';
  due_date: string | null;
  evidence_url: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface DisputeEvidence {
  id: string;
  dispute_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  notes: string | null;
  uploaded_at: string;
}

interface DisputesProps {
  userId: string;
}

function Disputes({ userId }: DisputesProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showCreateDisputeModal, setShowCreateDisputeModal] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [disputeEvidences, setDisputeEvidences] = useState<{ [key: string]: DisputeEvidence[] }>({});
  const [newDisputeData, setNewDisputeData] = useState({
    transaction_id: '',
    type: 'dispute' as 'chargeback' | 'dispute' | 'inquiry',
    reason: '',
    amount: ''
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    loadDisputes();
  }, []);

  useEffect(() => {
    disputes.forEach(dispute => {
      if (!disputeEvidences[dispute.id]) {
        loadDisputeEvidences(dispute.id);
      }
    });
  }, [disputes]);

  const loadDisputes = async () => {
    if (!supabase) return;

    const { data } = await supabase
      .from('disputes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setDisputes(data);
    }
  };

  const loadDisputeEvidences = async (disputeId: string) => {
    if (!supabase) return;

    const { data } = await supabase
      .from('dispute_evidences')
      .select('*')
      .eq('dispute_id', disputeId)
      .order('uploaded_at', { ascending: false });

    if (data) {
      setDisputeEvidences(prev => ({ ...prev, [disputeId]: data }));
    }
  };

  const filteredDisputes = selectedStatus === 'all'
    ? disputes
    : disputes.filter(d => d.status === selectedStatus);

  const submitEvidence = async () => {
    if (!supabase || !selectedDispute || evidenceFiles.length === 0) return;

    setIsSubmitting(true);

    try {
      for (const file of evidenceFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedDispute.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dispute-evidences')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert(`Erro ao fazer upload de ${file.name}`);
          continue;
        }

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        const { data: { publicUrl } } = supabase.storage
          .from('dispute-evidences')
          .getPublicUrl(fileName);

        const { error: evidenceError } = await supabase
          .from('dispute_evidences')
          .insert({
            dispute_id: selectedDispute.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            notes: evidenceNotes || null
          });

        if (evidenceError) {
          console.error('Evidence insert error:', evidenceError);
        }
      }

      await supabase
        .from('disputes')
        .update({ status: 'under_review' })
        .eq('id', selectedDispute.id);

      setShowEvidenceModal(false);
      setSelectedDispute(null);
      setEvidenceFiles([]);
      setEvidenceNotes('');
      setUploadProgress({});
      loadDisputes();
      loadDisputeEvidences(selectedDispute.id);

      alert('Evidências enviadas com sucesso!');
    } catch (error) {
      console.error('Submit evidence error:', error);
      alert('Erro ao enviar evidências');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvidence = async (evidenceId: string, fileUrl: string, disputeId: string) => {
    if (!supabase) return;
    if (!confirm('Tem certeza que deseja excluir esta evidência?')) return;

    try {
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('dispute-evidences')
          .remove([fileName]);
      }

      await supabase
        .from('dispute_evidences')
        .delete()
        .eq('id', evidenceId);

      loadDisputeEvidences(disputeId);
      alert('Evidência excluída com sucesso');
    } catch (error) {
      console.error('Delete evidence error:', error);
      alert('Erro ao excluir evidência');
    }
  };

  const createDispute = async () => {
    if (!supabase) return;
    if (!newDisputeData.transaction_id || !newDisputeData.reason || !newDisputeData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('disputes')
        .insert({
          user_id: userId,
          transaction_id: newDisputeData.transaction_id,
          type: newDisputeData.type,
          reason: newDisputeData.reason,
          amount: newDisputeData.amount,
          status: 'open'
        });

      if (error) throw error;

      setShowCreateDisputeModal(false);
      setNewDisputeData({
        transaction_id: '',
        type: 'dispute',
        reason: '',
        amount: ''
      });
      loadDisputes();
      alert('Disputa criada com sucesso!');
    } catch (error) {
      console.error('Create dispute error:', error);
      alert('Erro ao criar disputa');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${file.name} excede o tamanho máximo de 10MB`);
        return false;
      }
      return true;
    });
    setEvidenceFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'under_review':
        return 'bg-blue-500/20 text-blue-500';
      case 'won':
        return 'bg-green-500/20 text-green-500';
      case 'lost':
        return 'bg-red-500/20 text-red-500';
      case 'closed':
        return 'bg-gray-500/20 text-gray-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: 'Aberta',
      under_review: 'Em Análise',
      won: 'Ganhou',
      lost: 'Perdeu',
      closed: 'Fechada'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      chargeback: 'Chargeback',
      dispute: 'Disputa',
      inquiry: 'Consulta'
    };
    return labels[type] || type;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const stats = {
    total: disputes.length,
    open: disputes.filter(d => d.status === 'open').length,
    under_review: disputes.filter(d => d.status === 'under_review').length,
    won: disputes.filter(d => d.status === 'won').length,
    lost: disputes.filter(d => d.status === 'lost').length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Disputas e Chargebacks</h1>
          <p className="text-gray-400">Gerencie disputas de transações e chargebacks</p>
        </div>
        <button
          onClick={() => setShowCreateDisputeModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 transition-all"
        >
          <AlertTriangle className="w-4 h-4" />
          Nova Disputa
        </button>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Total</div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Abertas</div>
          <div className="text-2xl font-bold text-yellow-500">{stats.open}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Em Análise</div>
          <div className="text-2xl font-bold text-blue-500">{stats.under_review}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Ganhas</div>
          <div className="text-2xl font-bold text-green-500">{stats.won}</div>
        </div>
        <div className="bg-[#1a1a1a] rounded-xl p-4 border border-gray-800">
          <div className="text-sm text-gray-400 mb-1">Perdidas</div>
          <div className="text-2xl font-bold text-red-500">{stats.lost}</div>
        </div>
      </div>

      {showEvidenceModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Enviar Evidências</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Arquivos de Evidência (máx. 10MB cada)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      id="evidence"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                    />
                    <label
                      htmlFor="evidence"
                      className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-amber-500 transition-colors cursor-pointer bg-[#0f0f0f] hover:bg-gray-900"
                    >
                      <div className="text-center">
                        <Upload className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <span className="text-sm text-gray-400">Clique para adicionar arquivos</span>
                        <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG, DOC (máx. 10MB)</p>
                      </div>
                    </label>
                  </div>
                </div>

                {evidenceFiles.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-400">Arquivos selecionados:</label>
                    {evidenceFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-[#0f0f0f] rounded-lg p-3 border border-gray-800">
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="w-4 h-4 text-amber-500" />
                          <span className="text-sm text-white truncate">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        {uploadProgress[file.name] !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-amber-500 h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress[file.name]}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{uploadProgress[file.name]}%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-400 transition-colors"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Notas Adicionais
                  </label>
                  <textarea
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    rows={4}
                    placeholder="Adicione informações relevantes sobre a evidência..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowEvidenceModal(false);
                      setSelectedDispute(null);
                      setEvidenceFiles([]);
                      setEvidenceNotes('');
                      setUploadProgress({});
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 border-2 border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={submitEvidence}
                    disabled={evidenceFiles.length === 0 || isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Enviando...' : `Enviar ${evidenceFiles.length > 0 ? `(${evidenceFiles.length})` : ''}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateDisputeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-lg w-full border border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Criar Nova Disputa</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    ID da Transação
                  </label>
                  <input
                    type="text"
                    value={newDisputeData.transaction_id}
                    onChange={(e) => setNewDisputeData({ ...newDisputeData, transaction_id: e.target.value })}
                    placeholder="ID da transação"
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Tipo
                  </label>
                  <select
                    value={newDisputeData.type}
                    onChange={(e) => setNewDisputeData({ ...newDisputeData, type: e.target.value as 'chargeback' | 'dispute' | 'inquiry' })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  >
                    <option value="dispute">Disputa</option>
                    <option value="inquiry">Consulta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Motivo
                  </label>
                  <textarea
                    value={newDisputeData.reason}
                    onChange={(e) => setNewDisputeData({ ...newDisputeData, reason: e.target.value })}
                    rows={3}
                    placeholder="Descreva o motivo da disputa..."
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newDisputeData.amount}
                    onChange={(e) => setNewDisputeData({ ...newDisputeData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowCreateDisputeModal(false);
                      setNewDisputeData({
                        transaction_id: '',
                        type: 'dispute',
                        reason: '',
                        amount: ''
                      });
                    }}
                    disabled={isSubmitting}
                    className="flex-1 py-3 border-2 border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createDispute}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Criando...' : 'Criar Disputa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-white">Lista de Disputas</h2>
          </div>
          <div className="flex gap-2">
            {['all', 'open', 'under_review', 'won', 'lost'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedStatus === status
                    ? 'bg-amber-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status === 'all' ? 'Todas' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">
                {selectedStatus === 'all' ? 'Nenhuma disputa registrada' : `Nenhuma disputa ${getStatusLabel(selectedStatus).toLowerCase()}`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Quando houver disputas, elas aparecerão aqui
              </p>
            </div>
          ) : (
            filteredDisputes.map((dispute) => {
              const daysUntilDue = getDaysUntilDue(dispute.due_date);
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 3;

              return (
                <div
                  key={dispute.id}
                  className={`bg-[#0f0f0f] rounded-lg p-4 border transition-all ${
                    isUrgent ? 'border-red-500' : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(dispute.status)}`}>
                          {getStatusLabel(dispute.status)}
                        </span>
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-300">
                          {getTypeLabel(dispute.type)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 mb-1">
                        <span className="font-medium text-white">Motivo:</span> {dispute.reason}
                      </div>
                      <div className="text-sm text-gray-400">
                        <span className="font-medium text-white">Valor:</span>{' '}
                        {parseFloat(dispute.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </div>
                    </div>
                    {dispute.status === 'open' && (
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute);
                          setShowEvidenceModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-all text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        Enviar Evidência
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Aberta em {formatDate(dispute.created_at)}</span>
                    </div>
                    {dispute.due_date && (
                      <div className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 font-medium' : ''}`}>
                        <Clock className="w-3 h-3" />
                        <span>
                          {daysUntilDue !== null && daysUntilDue > 0
                            ? `Responder em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'}`
                            : 'Prazo vencido'}
                        </span>
                      </div>
                    )}
                    {dispute.evidence_url && (
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Evidência enviada</span>
                      </div>
                    )}
                  </div>

                  {dispute.resolution_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-400 mb-1">Notas de Resolução:</div>
                      <div className="text-sm text-white">{dispute.resolution_notes}</div>
                    </div>
                  )}

                  {disputeEvidences[dispute.id] && disputeEvidences[dispute.id].length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <div className="text-xs text-gray-400 mb-2">Evidências Enviadas ({disputeEvidences[dispute.id].length}):</div>
                      <div className="space-y-2">
                        {disputeEvidences[dispute.id].map((evidence) => (
                          <div key={evidence.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-2 border border-gray-800">
                            <div className="flex items-center gap-2 flex-1">
                              <FileText className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-white truncate">{evidence.file_name}</span>
                              <span className="text-xs text-gray-500">({(evidence.file_size / 1024).toFixed(1)} KB)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={evidence.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
                              >
                                Ver
                              </a>
                              <button
                                onClick={() => deleteEvidence(evidence.id, evidence.file_url, dispute.id)}
                                className="text-xs text-red-500 hover:text-red-400 transition-colors"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default Disputes;
