import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Webhook, Plus, Trash2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  retry_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

interface WebhookLog {
  id: string;
  event_type: string;
  response_status: number;
  attempt_number: number;
  created_at: string;
}

interface WebhooksProps {
  userId: string;
}

function Webhooks({ userId }: WebhooksProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [selectedWebhook, setSelectedWebhook] = useState<string | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([
    'transaction.paid',
    'transaction.failed',
    'transaction.refunded'
  ]);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  const availableEvents = [
    { value: 'transaction.paid', label: 'Transação Paga' },
    { value: 'transaction.failed', label: 'Transação Falhou' },
    { value: 'transaction.refunded', label: 'Transação Estornada' },
    { value: 'transaction.pending', label: 'Transação Pendente' },
    { value: 'dispute.created', label: 'Disputa Criada' },
    { value: 'dispute.resolved', label: 'Disputa Resolvida' },
    { value: 'chargeback.created', label: 'Chargeback Criado' },
    { value: 'chargeback.won', label: 'Chargeback Ganho' },
    { value: 'chargeback.lost', label: 'Chargeback Perdido' },
  ];

  useEffect(() => {
    loadWebhooks();
  }, []);

  useEffect(() => {
    if (selectedWebhook) {
      loadWebhookLogs(selectedWebhook);
    }
  }, [selectedWebhook]);

  const loadWebhooks = async () => {
    if (!supabase) return;

    const { data } = await supabase
      .from('webhooks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setWebhooks(data);
    }
  };

  const loadWebhookLogs = async (webhookId: string) => {
    if (!supabase) return;

    const { data } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      setWebhookLogs(data);
    }
  };

  const generateSecret = () => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
  };

  const createWebhook = async () => {
    if (!supabase || !newWebhookUrl.trim()) return;

    const secret = 'whsec_' + generateSecret();

    const { error } = await supabase
      .from('webhooks')
      .insert([{
        user_id: userId,
        url: newWebhookUrl,
        events: selectedEvents,
        secret: secret,
        is_active: true,
        retry_count: 3
      }]);

    if (!error) {
      setNewWebhookUrl('');
      setShowCreateModal(false);
      loadWebhooks();
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    if (!supabase) return;

    await supabase
      .from('webhooks')
      .delete()
      .eq('id', webhookId);

    loadWebhooks();
  };

  const toggleWebhookStatus = async (webhookId: string, currentStatus: boolean) => {
    if (!supabase) return;

    await supabase
      .from('webhooks')
      .update({ is_active: !currentStatus })
      .eq('id', webhookId);

    loadWebhooks();
  };

  const toggleEvent = (event: string) => {
    if (selectedEvents.includes(event)) {
      setSelectedEvents(selectedEvents.filter(e => e !== event));
    } else {
      setSelectedEvents([...selectedEvents, event]);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white mb-2">Webhooks</h1>
          <p className="text-gray-400">Configure notificações em tempo real para sua aplicação</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Novo Webhook
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-lg w-full border border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Criar Novo Webhook</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    URL do Endpoint
                  </label>
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    placeholder="https://seu-site.com/webhooks"
                    className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-3">
                    Eventos para Notificar
                  </label>
                  <div className="space-y-2">
                    {availableEvents.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer transition-all"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event.value)}
                          onChange={() => toggleEvent(event.value)}
                          className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-white">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-500">
                      <p className="font-medium mb-1">Como funcionam os webhooks?</p>
                      <p>Enviaremos uma requisição POST para a URL configurada sempre que um dos eventos selecionados ocorrer. Certifique-se de que seu endpoint está acessível publicamente.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 border-2 border-gray-700 text-gray-300 font-semibold rounded-lg hover:bg-gray-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createWebhook}
                    disabled={!newWebhookUrl.trim() || selectedEvents.length === 0}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                  >
                    Criar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <div className="flex items-center gap-2 mb-6">
            <Webhook className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-white">Webhooks Configurados</h2>
          </div>

          <div className="space-y-3">
            {webhooks.length === 0 ? (
              <div className="text-center py-12">
                <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Nenhum webhook configurado</p>
                <p className="text-sm text-gray-500 mt-1">Crie seu primeiro webhook para receber notificações</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  onClick={() => setSelectedWebhook(webhook.id)}
                  className={`bg-[#0f0f0f] rounded-lg p-4 border cursor-pointer transition-all ${
                    selectedWebhook === webhook.id
                      ? 'border-amber-500'
                      : 'border-gray-800 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {webhook.is_active ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <code className="text-sm text-white font-mono break-all">{webhook.url}</code>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{webhook.events.length} eventos</span>
                        <span>•</span>
                        <span>{webhook.retry_count} tentativas</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteWebhook(webhook.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {webhook.last_triggered_at && (
                    <div className="text-xs text-gray-500">
                      Último disparo: {formatDate(webhook.last_triggered_at)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-6">Logs de Webhooks</h2>

          {!selectedWebhook ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Selecione um webhook para ver os logs</p>
            </div>
          ) : webhookLogs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhum log ainda</p>
              <p className="text-sm text-gray-500 mt-1">Os logs aparecerão aqui quando o webhook for disparado</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {webhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#0f0f0f] rounded-lg p-3 border border-gray-800"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{log.event_type}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        log.response_status >= 200 && log.response_status < 300
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-red-500/20 text-red-500'
                      }`}
                    >
                      {log.response_status || 'Sem resposta'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Tentativa {log.attempt_number}</span>
                    <span>•</span>
                    <span>{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Webhooks;
