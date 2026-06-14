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

  const handleWeChatAuth = async () => {
    if (!isSupabaseConfigured) {
      setMessage({ type: 'error', text: '雲端服務未配置憑證，無法啟用微信登錄。' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'wechat' as any, // Supabase support for WeChat
        options: {
          redirectTo: window.location.origin,
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || '微信授權引導失敗，請檢查微信配置。' });
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

        {/* WeChat OAuth Login Section */}
        {isSupabaseConfigured && (
          <div style={styles.oauthSection}>
            <div style={styles.oauthDivider}>
              <span style={styles.dividerText}>其他登錄方式</span>
            </div>
            <button
              onClick={handleWeChatAuth}
              disabled={loading}
              className="sketch-button"
              style={styles.wechatBtn}
            >
              {/* Custom SVG WeChat Icon */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginRight: 8 }}
              >
                <path
                  d="M8.5 13.5C8.22 13.5 8 13.28 8 13C8 12.72 8.22 12.5 8.5 12.5C8.78 12.5 9 12.72 9 13C9 13.28 8.78 13.5 8.5 13.5ZM13.5 13.5C13.22 13.5 13 13.28 13 13C13 12.72 13.22 12.5 13.5 12.5C13.78 12.5 14 12.72 14 13C14 13.28 13.78 13.5 13.5 13.5Z"
                  fill="#fff"
                />
                <path
                  d="M17.5 7.5C16.67 7.5 16 8.17 16 9C16 9.83 16.67 10.5 17.5 10.5C18.33 10.5 19 9.83 19 9C19 8.17 18.33 7.5 17.5 7.5ZM21.5 7.5C20.67 7.5 20 8.17 20 9C20 9.83 20.67 10.5 21.5 10.5C22.33 10.5 23 9.83 23 9C23 8.17 22.33 7.5 21.5 7.5Z"
                  fill="#fff"
                />
                <path
                  d="M16 11.23C16.94 11.23 17.8 11.53 18.5 12.04C18.66 11.23 18.75 10.38 18.75 9.5C18.75 5.36 14.83 2 10 2C5.17 2 1.25 5.36 1.25 9.5C1.25 12.03 2.91 14.28 5.48 15.65C5.64 15.74 5.75 15.93 5.72 16.12L5.27 18.84C5.22 19.14 5.51 19.37 5.79 19.23L9.22 17.43C9.38 17.35 9.56 17.36 9.71 17.44C10.52 17.86 11.45 18.09 12.43 18.09C12.23 17.44 12.13 16.74 12.13 16.02C12.13 13.38 13.86 11.23 16 11.23Z"
                  fill="#47B947"
                />
                <path
                  d="M22.75 16C22.75 12.96 19.93 10.5 16.45 10.5C12.97 10.5 10.15 12.96 10.15 16C10.15 19.04 12.97 21.5 16.45 21.5C17.22 21.5 17.96 21.37 18.64 21.12C18.76 21.08 18.9 21.09 19.01 21.15L21.46 22.44C21.68 22.56 21.92 22.39 21.88 22.14L21.53 20.08C21.51 19.94 21.58 19.8 21.7 19.72C22.34 18.74 22.75 17.47 22.75 16Z"
                  fill="#47B947"
                />
              </svg>
              微信帳號登錄
            </button>
          </div>
        )}

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
