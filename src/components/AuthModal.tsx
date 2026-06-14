import React, { useState } from 'react';
import { X, Mail, Lock, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: '雲端服務未配置憑證，請聯繫管理員設置環境變量。' });
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setMessage({ type: 'error', text: '請填寫完整的郵箱和密碼！' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      if (isLoginMode) {
        // Log In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password,
        });
        if (error) throw error;
        
        if (data?.user) {
          setMessage({ type: 'success', text: '登錄成功！' });
          setTimeout(() => {
            onLoginSuccess(data.user);
            onClose();
          }, 800);
        }
      } else {
        // Sign Up / Register
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: password,
        });
        if (error) throw error;

        if (data?.user) {
          setMessage({ 
            type: 'success', 
            text: '註冊成功！若設置了郵箱驗證，請前往郵箱查收確認郵件；或可直接嘗試登錄。' 
          });
          setIsLoginMode(true);
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || '認證操作失敗，請稍後重試。' });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div style={styles.overlay}>
      <div className="sketchy-box" style={styles.container}>
        {/* Washi Tape Header */}
        <div className="washi-tape washi-tape-green" style={styles.tape}>
          {isLoginMode ? '登錄 SIGN IN' : '註冊 SIGN UP'}
        </div>

        {/* Close Button */}
        <button onClick={onClose} style={styles.closeBtn} disabled={loading}>
          <X size={20} />
        </button>

        {/* Title */}
        <h2 style={styles.title}>{isLoginMode ? '手賬雲同步登錄' : '創建雲端手賬帳號'}</h2>

        {/* Credentials check banner */}
        {!isSupabaseConfigured && (
          <div style={styles.configWarning}>
            <AlertTriangle size={16} style={{ marginRight: 6 }} />
            <span>雲端未配置。已自動運行於本地安全沙盒。</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} style={styles.form}>
          {/* Email Input */}
          <div style={styles.inputContainer}>
            <Mail size={16} style={styles.inputIcon} />
            <input
              type="email"
              placeholder="您的電子郵箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || !isSupabaseConfigured}
              style={styles.input}
              required
            />
          </div>

          {/* Password Input */}
          <div style={styles.inputContainer}>
            <Lock size={16} style={styles.inputIcon} />
            <input
              type="password"
              placeholder="請輸入密碼 (6位以上)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || !isSupabaseConfigured}
              style={styles.input}
              required
            />
          </div>

          {/* Message Toast inside modal */}
          {message && (
            <div style={{
              ...styles.messageBox,
              backgroundColor: message.type === 'error' ? '#fef2f2' : '#f0fdf4',
              borderColor: message.type === 'error' ? '#fecaca' : '#bbf7d0',
              color: message.type === 'error' ? '#b91c1c' : '#15803d',
            }}>
              {message.text}
            </div>
          )}

          {/* Action Buttons */}
          <button
            type="submit"
            className="sketch-button sketch-button-primary"
            disabled={loading || !isSupabaseConfigured}
            style={styles.submitBtn}
          >
            {isLoginMode ? (
              <>
                <LogIn size={16} style={{ marginRight: 6 }} />
                立即登錄
              </>
            ) : (
              <>
                <UserPlus size={16} style={{ marginRight: 6 }} />
                創建帳號
              </>
            )}
          </button>
        </form>



        {/* Mode Toggle Link */}
        {isSupabaseConfigured && (
          <div style={styles.toggleMode}>
            {isLoginMode ? (
              <span>
                還沒有帳號？{' '}
                <button onClick={() => setIsLoginMode(false)} style={styles.linkBtn}>
                  立即註冊
                </button>
              </span>
            ) : (
              <span>
                已有帳號？{' '}
                <button onClick={() => setIsLoginMode(true)} style={styles.linkBtn}>
                  返回登錄
                </button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(92, 74, 60, 0.4)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '20px',
  },
  container: {
    backgroundColor: 'var(--color-paper)',
    width: '100%',
    maxWidth: '400px',
    padding: '36px 24px 24px 24px',
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  tape: {
    top: '-12px',
    left: '50%',
    transform: 'translateX(-50%) rotate(-1deg)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: '12px',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    opacity: 0.7,
  },
  title: {
    fontFamily: 'var(--font-hand)',
    fontSize: '24px',
    textAlign: 'center' as const,
    marginBottom: '16px',
  },
  configWarning: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    border: '1.5px solid #fef3c7',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#b45309',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  inputContainer: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '12px',
    color: 'var(--color-text-muted)',
    pointerEvents: 'none' as const,
  },
  input: {
    width: '100%',
    padding: '10px 10px 10px 36px',
    fontSize: '14px',
    border: '2px solid var(--color-border)',
    borderRadius: '8px',
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.4)',
    color: 'var(--color-text)',
    transition: 'border-color 0.2s',
  },
  messageBox: {
    border: '1.5px solid',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    lineHeight: '1.5',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
    marginTop: '6px',
  },
  oauthSection: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  oauthDivider: {
    position: 'relative' as const,
    textAlign: 'center' as const,
    margin: '10px 0',
    borderBottom: '1px dashed var(--color-border)',
    opacity: 0.5,
  },
  dividerText: {
    position: 'absolute' as const,
    left: '50%',
    top: '-9px',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-paper)',
    padding: '0 8px',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
  },
  wechatBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#50B650',
    borderColor: '#47a347',
    color: '#fff',
    fontSize: '13px',
    padding: '8px',
    width: '100%',
    cursor: 'pointer',
    fontWeight: 'bold',
    borderRadius: '8px',
    boxShadow: '2px 2px 0px rgba(71, 163, 71, 0.2)',
  },
  toggleMode: {
    marginTop: '16px',
    textAlign: 'center' as const,
    fontSize: '12px',
    color: 'var(--color-text-muted)',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontWeight: 'bold',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
};
