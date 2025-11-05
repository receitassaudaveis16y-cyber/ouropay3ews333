import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Key, Copy, Eye, EyeOff, Plus, Trash2, CheckCircle2, AlertCircle, Code } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_display: string;
  environment: 'test' | 'production';
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface IntegrationsProps {
  userId: string;
}

function Integrations({ userId }: IntegrationsProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnvironment, setNewKeyEnvironment] = useState<'test' | 'production'>('test');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<{ [key: string]: boolean }>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    if (!supabase) return;

    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setApiKeys(data);
    }
  };

  const generateApiKey = (environment: 'test' | 'production') => {
    const prefix = environment === 'test' ? 'sk_test' : 'sk_live';
    const randomPart = Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('');
    return `${prefix}_${randomPart}`;
  };

  const createApiKey = async () => {
    if (!supabase || !newKeyName.trim()) return;

    const fullKey = generateApiKey(newKeyEnvironment);
    const keyDisplay = fullKey.slice(-4);
    const keyPrefix = fullKey.split('_')[0] + '_' + fullKey.split('_')[1];

    const { error } = await supabase
      .from('api_keys')
      .insert([{
        user_id: userId,
        name: newKeyName,
        key_prefix: keyPrefix,
        key_hash: fullKey,
        key_display: keyDisplay,
        environment: newKeyEnvironment,
        is_active: true
      }]);

    if (!error) {
      setGeneratedKey(fullKey);
      setNewKeyName('');
      loadApiKeys();
    }
  };

  const deleteApiKey = async (keyId: string) => {
    if (!supabase) return;

    await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId);

    loadApiKeys();
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
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
          <h1 className="text-2xl font-semibold text-white mb-2">Integrações</h1>
          <p className="text-gray-400">Gerencie suas chaves de API e integrações</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Nova Chave API
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a1a] rounded-2xl max-w-md w-full border border-gray-800">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                {generatedKey ? 'Chave API Criada' : 'Criar Nova Chave API'}
              </h2>

              {generatedKey ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-500">
                        Salve esta chave agora! Por segurança, ela não será exibida novamente.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Sua Chave API
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={generatedKey}
                        readOnly
                        className="flex-1 px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] text-white font-mono text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedKey, 'generated')}
                        className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {copiedKey === 'generated' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setGeneratedKey(null);
                    }}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all"
                  >
                    Entendi
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Nome da Chave
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="Ex: API Loja Online"
                      className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-[#0f0f0f] focus:outline-none focus:ring-2 focus:ring-amber-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Ambiente
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setNewKeyEnvironment('test')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          newKeyEnvironment === 'test'
                            ? 'border-amber-500 bg-amber-500/20'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <span className="font-medium text-white">Teste</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewKeyEnvironment('production')}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          newKeyEnvironment === 'production'
                            ? 'border-amber-500 bg-amber-500/20'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <span className="font-medium text-white">Produção</span>
                      </button>
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
                      onClick={createApiKey}
                      disabled={!newKeyName.trim()}
                      className="flex-1 py-3 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:via-yellow-500 hover:to-amber-500 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
                    >
                      Criar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <Key className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Chaves API</h2>
        </div>

        <div className="space-y-3">
          {apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nenhuma chave API criada ainda</p>
              <p className="text-sm text-gray-500 mt-1">Crie sua primeira chave para começar a integrar</p>
            </div>
          ) : (
            apiKeys.map((key) => (
              <div
                key={key.id}
                className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800 hover:border-gray-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{key.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          key.environment === 'production'
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-blue-500/20 text-blue-500'
                        }`}
                      >
                        {key.environment === 'production' ? 'Produção' : 'Teste'}
                      </span>
                      {!key.is_active && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-500">
                          Inativa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <code className="text-sm text-gray-400 font-mono">
                        {key.key_prefix}_••••••••{key.key_display}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Criada em {formatDate(key.created_at)}</span>
                      {key.last_used_at && (
                        <span>Último uso: {formatDate(key.last_used_at)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-2 mb-6">
          <Code className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Exemplo de Uso</h2>
        </div>

        <div className="bg-[#0f0f0f] rounded-lg p-4 border border-gray-800">
          <pre className="text-sm text-gray-300 overflow-x-auto">
            <code>{`// Instalar o SDK
npm install @goldspay/sdk

// Inicializar o cliente
import GoldsPay from '@goldspay/sdk';

const goldspay = new GoldsPay({
  apiKey: 'sua_chave_api_aqui'
});

// Criar um pagamento
const payment = await goldspay.payments.create({
  amount: 100.00,
  currency: 'BRL',
  paymentMethod: 'pix',
  customer: {
    name: 'João Silva',
    email: 'joao@example.com'
  }
});

console.log('Pagamento criado:', payment.id);`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Integrations;
