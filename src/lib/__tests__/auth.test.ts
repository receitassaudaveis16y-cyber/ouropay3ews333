import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth';
import * as supabaseModule from '../supabase';

vi.mock('../supabase');

const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
};

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabaseModule as any).supabase = mockSupabase;
  });

  describe('signUp', () => {
    it('should return error for invalid email', async () => {
      const result = await authService.signUp('invalid', 'password123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email inválido');
    });

    it('should return error for password too short', async () => {
      const result = await authService.signUp('test@example.com', 'short');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('no mínimo 6 caracteres');
    });

    it('should successfully sign up with valid credentials', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signUp('test@example.com', 'password123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle already registered error', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'User already registered' },
      });

      const result = await authService.signUp('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('já está cadastrado');
    });
  });

  describe('signIn', () => {
    it('should return error for invalid email', async () => {
      const result = await authService.signIn('invalid', 'password123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email inválido');
    });

    it('should return error for password too short', async () => {
      const result = await authService.signIn('test@example.com', 'short');
      expect(result.success).toBe(false);
    });

    it('should successfully sign in with valid credentials', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.signIn('test@example.com', 'password123');
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should handle invalid credentials error', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await authService.signIn('test@example.com', 'wrong-pass');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email ou senha incorretos');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      const result = await authService.signOut();
      expect(result.success).toBe(true);
    });

    it('should handle sign out error', async () => {
      mockSupabase.auth.signOut.mockResolvedValueOnce({
        error: { message: 'Failed to sign out' },
      });

      const result = await authService.signOut();
      expect(result.success).toBe(false);
    });
  });

  describe('getUser', () => {
    it('should retrieve current user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const result = await authService.getUser();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUser);
    });

    it('should return error when no user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const result = await authService.getUser();
      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });
  });

  describe('resetPassword', () => {
    it('should return error for invalid email', async () => {
      const result = await authService.resetPassword('invalid');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Email inválido');
    });

    it('should successfully send reset email', async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const result = await authService.resetPassword('test@example.com');
      expect(result.success).toBe(true);
    });
  });

  describe('updatePassword', () => {
    it('should return error for password too short', async () => {
      const result = await authService.updatePassword('short');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('no mínimo 6 caracteres');
    });

    it('should successfully update password', async () => {
      mockSupabase.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: '123' } },
        error: null,
      });

      const result = await authService.updatePassword('newpassword123');
      expect(result.success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Network request failed' },
      });

      const result = await authService.signIn('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Erro de conexão');
    });

    it('should handle rate limiting', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Too many requests' },
      });

      const result = await authService.signIn('test@example.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Muitas tentativas');
    });
  });
});
