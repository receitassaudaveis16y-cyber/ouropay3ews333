import { supabase } from './supabase';

interface AuthError {
  message: string;
  code?: string;
}

interface AuthResponse {
  success: boolean;
  data?: any;
  error?: AuthError;
}

const getErrorMessage = (error: any): string => {
  if (!error) return 'Erro desconhecido';

  const errorMessage = error.message || error.error_description || error.msg || '';

  if (errorMessage.toLowerCase().includes('invalid login credentials')) {
    return 'Email ou senha incorretos';
  }
  if (errorMessage.toLowerCase().includes('user already registered') || errorMessage.toLowerCase().includes('already registered')) {
    return 'Este email já está cadastrado. Tente fazer login';
  }
  if (errorMessage.toLowerCase().includes('password should be at least')) {
    return 'A senha deve ter no mínimo 6 caracteres';
  }
  if (errorMessage.toLowerCase().includes('invalid email')) {
    return 'Email inválido';
  }
  if (errorMessage.toLowerCase().includes('network request failed') || errorMessage.toLowerCase().includes('fetch failed')) {
    return 'Erro de conexão. Verifique sua internet';
  }
  if (errorMessage.toLowerCase().includes('too many requests') || errorMessage.toLowerCase().includes('rate limit')) {
    return 'Muitas tentativas. Aguarde um momento';
  }
  if (errorMessage.toLowerCase().includes('credentials not found') || errorMessage.toLowerCase().includes('service unavailable')) {
    return 'Por favor, configure as credenciais do banco de dados';
  }

  return errorMessage || 'Erro ao processar solicitação';
};

export const authService = {
  async signUp(email: string, password: string): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: { message: 'Email inválido' },
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: { message: 'A senha deve ter no mínimo 6 caracteres' },
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            email: email.trim().toLowerCase(),
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error), code: error.status?.toString() },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: { message: 'Erro ao criar conta' },
        };
      }

      return {
        success: true,
        data: data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },

  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: { message: 'Email inválido' },
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: { message: 'Senha deve ter no mínimo 6 caracteres' },
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error), code: error.status?.toString() },
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: { message: 'Erro ao fazer login' },
        };
      }

      return {
        success: true,
        data: data.user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },

  async signOut(): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error) },
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },

  async getUser(): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error) },
        };
      }

      return {
        success: true,
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },

  async resetPassword(email: string): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    if (!email || !email.includes('@')) {
      return {
        success: false,
        error: { message: 'Email inválido' },
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error) },
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },

  async updatePassword(newPassword: string): Promise<AuthResponse> {
    if (!supabase) {
      return {
        success: false,
        error: { message: 'Por favor, configure as credenciais do banco de dados' },
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: { message: 'A senha deve ter no mínimo 6 caracteres' },
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return {
          success: false,
          error: { message: getErrorMessage(error) },
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: { message: getErrorMessage(error) },
      };
    }
  },
};
