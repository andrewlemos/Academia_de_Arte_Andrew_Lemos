import React, { useState } from 'react';
import { 
  auth, 
  googleProvider,
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  linkWithCredential, 
  GoogleAuthProvider,
  updateProfile
} from '../utils/firebase';
import { Sparkles, Mail, Lock, User, LogIn, ChevronRight, X, AlertCircle } from 'lucide-react';
import { getDirectDriveUrl } from '../utils/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (firebaseUser: any, name: string, avatarUrl: string) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Account linking state
  const [pendingCred, setPendingCred] = useState<any>(null);
  const [linkPassword, setLinkPassword] = useState('');
  const [linkingEmail, setLinkingEmail] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          throw new Error('Por favor, informe seu nome completo.');
        }
        // Register user
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Update user profile name
        await updateProfile(credential.user, { displayName: name });
        onSuccess(credential.user, name, '');
      } else {
        // Sign in user
        let credential;
        try {
          credential = await signInWithEmailAndPassword(auth, email, password);
        } catch (signInErr: any) {
          // If the test user Mariana does not exist yet, register her automatically!
          if (email.toLowerCase().trim() === 'mariana@academia.com' && password === 'mariana123') {
            console.log('Criando conta de teste para Mariana...');
            credential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(credential.user, { displayName: 'Mariana' });
          } else {
            throw signInErr;
          }
        }
        onSuccess(credential.user, credential.user.displayName || '', credential.user.photoURL || '');
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'E-mail inválido.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onSuccess(result.user, result.user.displayName || '', result.user.photoURL || '');
      onClose();
    } catch (err: any) {
      console.error('Google auth error:', err);
      if (err.code === 'auth/account-exists-with-different-credential') {
        // This is where Account Linking is triggered!
        const emailFromError = err.customData?.email || '';
        const credential = GoogleAuthProvider.credentialFromError(err);
        
        setLinkingEmail(emailFromError);
        setPendingCred(credential);
        setError('Este e-mail já está cadastrado com senha. Insira sua senha abaixo para vincular sua conta do Google.');
      } else {
        setError(err.message || 'Erro ao autenticar com o Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Sign in with the existing email and password
      const userCred = await signInWithEmailAndPassword(auth, linkingEmail, linkPassword);
      // 2. Link the pending Google credential
      if (pendingCred) {
        await linkWithCredential(userCred.user, pendingCred);
      }
      onSuccess(userCred.user, userCred.user.displayName || '', userCred.user.photoURL || '');
      // Clear linking state
      setPendingCred(null);
      setLinkingEmail('');
      setLinkPassword('');
      onClose();
    } catch (err: any) {
      console.error('Linking error:', err);
      let msg = err.message;
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Senha incorreta. Por favor, tente novamente.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-brand-ink/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="auth-modal-overlay">
      <div className="bg-brand-paper w-full max-w-md rounded-3xl border border-brand-wood/20 shadow-2xl overflow-hidden flex flex-col relative" id="auth-modal-content">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-brand-clay hover:text-brand-wood p-1.5 rounded-full hover:bg-brand-wood/5 transition-all"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 flex-1">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-md border border-brand-clay/10 mx-auto mb-3">
              <img 
                src={getDirectDriveUrl("https://drive.google.com/file/d/1BEZWW-yg4axZKVhIo_Y9GlRgeGQ3xeqi/view?usp=sharing")} 
                alt="Logo Andrew Lemos" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <h3 className="font-serif font-bold text-xl text-brand-ink">
              {pendingCred ? 'Vincular Conta Google' : isSignUp ? 'Criar Conta de Aluno' : 'Entrar na Academia'}
            </h3>
            <p className="text-xs text-brand-clay mt-1">
              {pendingCred 
                ? `Vincule seu Google ao e-mail ${linkingEmail}` 
                : isSignUp 
                  ? 'Cadastre-se para acessar os cursos e apostilas' 
                  : 'Acesse seu portal e retome seus aprendizados'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 mb-4 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Linking Password Form */}
          {pendingCred ? (
            <form onSubmit={handleLinkAccount} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-brand-clay block">Senha da conta existente</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-clay/60" />
                  <input 
                    type="password"
                    required
                    value={linkPassword}
                    onChange={(e) => setLinkPassword(e.target.value)}
                    placeholder="Digite sua senha cadastrada"
                    className="w-full bg-white border border-brand-wood/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-ink placeholder-brand-clay/40 focus:outline-none focus:border-brand-wood focus:ring-1 focus:ring-brand-wood transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand-wood hover:bg-brand-clay text-white py-2.5 rounded-full font-sans font-semibold text-xs tracking-wide transition-all shadow-md shadow-brand-wood/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Confirmando...' : 'Confirmar e Vincular Contas'}
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingCred(null);
                  setLinkingEmail('');
                  setError(null);
                }}
                className="w-full text-center text-[11px] font-sans font-bold uppercase tracking-wider text-brand-clay hover:text-brand-wood py-1"
              >
                Cancelar Vinculação
              </button>
            </form>
          ) : (
            /* Standard Login / Signup Forms */
            <div className="space-y-4">
              <form onSubmit={handleEmailAuth} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-brand-clay block">Nome Completo</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-clay/60" />
                      <input 
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Como deseja ser chamado"
                        className="w-full bg-white border border-brand-wood/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-ink placeholder-brand-clay/40 focus:outline-none focus:border-brand-wood focus:ring-1 focus:ring-brand-wood transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-brand-clay block">Endereço de E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-clay/60" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="aluno@exemplo.com"
                      className="w-full bg-white border border-brand-wood/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-ink placeholder-brand-clay/40 focus:outline-none focus:border-brand-wood focus:ring-1 focus:ring-brand-wood transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-bold uppercase tracking-wider text-brand-clay block">Senha de Acesso</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-clay/60" />
                    <input 
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Pelo menos 6 caracteres"
                      className="w-full bg-white border border-brand-wood/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-brand-ink placeholder-brand-clay/40 focus:outline-none focus:border-brand-wood focus:ring-1 focus:ring-brand-wood transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand-wood hover:bg-brand-clay text-white py-2.5 rounded-full font-sans font-semibold text-xs tracking-wide transition-all shadow-md shadow-brand-wood/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? 'Processando...' : isSignUp ? 'Criar Conta de Aluno' : 'Entrar na Conta'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-5 text-center">
                <span className="absolute inset-x-0 top-1/2 border-t border-brand-wood/10 -translate-y-1/2"></span>
                <span className="relative bg-brand-paper px-3 text-[10px] font-sans font-bold uppercase tracking-widest text-brand-clay/60">ou</span>
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white hover:bg-neutral-50 text-brand-ink border border-neutral-200 py-2.5 rounded-full font-sans font-medium text-xs transition-all shadow-sm flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com o Google
              </button>

              {/* Toggle Signup/Login */}
              <div className="text-center mt-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-xs font-sans font-semibold text-brand-clay hover:text-brand-wood transition-all underline"
                >
                  {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Cadastre-se'}
                </button>
              </div>

              {/* Test Account Hint Info */}
              {!isSignUp && (
                <div className="bg-brand-wood/5 rounded-2xl p-3.5 border border-brand-wood/10 text-center mt-4">
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-brand-clay mb-1">Perfil de Teste (Aluna Mariana)</p>
                  <p className="text-xs text-brand-ink font-mono select-all">
                    mariana@academia.com <span className="text-brand-clay/60">/</span> mariana123
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
