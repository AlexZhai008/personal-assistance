import React, { useState } from 'react';
import { X, Plus, Trash2, Key, CheckSquare } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiProvider: 'deepseek' | 'gemini';
  onSaveApiProvider: (provider: 'deepseek' | 'gemini') => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  habits: string[];
  onAddHabit: (habit: string) => void;
  onRemoveHabit: (habit: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiProvider,
  onSaveApiProvider,
  apiKey,
  onSaveApiKey,
  habits,
  onAddHabit,
  onRemoveHabit,
}) => {
  const [providerInput, setProviderInput] = useState(apiProvider);
  const [keyInput, setKeyInput] = useState(apiKey);
  const [newHabit, setNewHabit] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen) return null;

  const handleSaveAPI = () => {
    onSaveApiProvider(providerInput);
    onSaveApiKey(keyInput.trim());
    showToast('AI 解析设置已保存！');
  };

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const habit = newHabit.trim();
    if (!habit) return;
    if (habits.includes(habit)) {
      showToast('习惯已存在哦！');
      return;
    }
    onAddHabit(habit);
    setNewHabit('');
    showToast(`已添加习惯：${habit}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 2000);
  };

  return (
    <div style={styles.overlay}>
      <div className="sketchy-box" style={styles.container}>
        {/* Washi Tape Header */}
        <div className="washi-tape washi-tape-peach" style={styles.tape}>
          设置 SETTINGS
        </div>

        {/* Close Button */}
        <button onClick={onClose} style={styles.closeBtn}>
          <X size={20} />
        </button>

        {/* Modal Title */}
        <h2 style={styles.title}>手账本设置</h2>

        {/* Scrollable Content */}
        <div style={styles.content}>
          {/* Section 1: AI Engine Settings */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <Key size={18} style={styles.icon} />
              AI 智能解析设置 (DeepSeek / Gemini)
            </h3>
            <p style={styles.desc}>
              已为您默认配置内置的 DeepSeek API Key (deepseek-v4-flash) 运行。您也可以在此更换为您自己的 API 服务和 Key。
            </p>
            <div style={{ ...styles.inputGroup, flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', width: '90px' }}>服务商:</span>
                <select
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value as 'deepseek' | 'gemini')}
                  style={{
                    fontSize: '13px',
                    padding: '6px 8px',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '6px',
                    backgroundColor: '#fff',
                    flex: 1
                  }}
                >
                  <option value="deepseek">DeepSeek (默认)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', width: '90px' }}>API Key:</span>
                <input
                  type="password"
                  placeholder="请输入 API Key"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="sketch-input"
                  style={{ ...styles.keyInput, flex: 1 }}
                />
              </div>

              <button
                onClick={handleSaveAPI}
                className="sketch-button sketch-button-primary"
                style={{ alignSelf: 'flex-end', fontSize: '13px', marginTop: '4px' }}
              >
                保存 AI 设置
              </button>
            </div>
            {apiKey === 'sk-584115c5fe064561bd27ced671c1e3c0' && providerInput === 'deepseek' && (
              <div style={styles.activeKeyIndicator}>
                <span style={styles.greenDot}>●</span> 已启用内置 DeepSeek API Key (已就绪)
              </div>
            )}
          </div>

          <hr style={styles.divider} />

          {/* Section 2: Habit Manager */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <CheckSquare size={18} style={styles.icon} />
              习惯打卡管理
            </h3>
            <p style={styles.desc}>
              定义你想要每天坚持的习惯，AI在识别到你的话语后会自动打卡。
            </p>

            {/* Add Habit Form */}
            <form onSubmit={handleAddHabit} style={styles.inputGroup}>
              <input
                type="text"
                placeholder="例如：看书、喝水、敷面膜"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                className="sketch-input"
                maxLength={10}
                style={styles.habitInput}
              />
              <button
                type="submit"
                className="sketch-button"
                style={styles.addBtn}
              >
                <Plus size={16} /> 添加
              </button>
            </form>

            {/* Habit List */}
            <div style={styles.habitList}>
              {habits.map((habit) => (
                <div key={habit} style={styles.habitItem}>
                  <span>{habit}</span>
                  <button
                    onClick={() => {
                      onRemoveHabit(habit);
                      showToast(`已删除习惯：${habit}`);
                    }}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {habits.length === 0 && (
                <div style={styles.emptyHabits}>暂时没有配置习惯，快去添加一个吧~</div>
              )}
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="sketchy-box" style={styles.toast}>
            {toastMessage}
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
    zIndex: 1000,
    padding: '20px',
  },
  container: {
    backgroundColor: 'var(--color-paper)',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '85vh',
    padding: '30px 24px 24px 24px',
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
    fontSize: '28px',
    textAlign: 'center' as const,
    marginBottom: '20px',
  },
  content: {
    overflowY: 'auto' as const,
    flex: 1,
    paddingRight: '4px',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  icon: {
    marginRight: '6px',
    color: 'var(--color-primary)',
  },
  desc: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.5',
    marginBottom: '12px',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  keyInput: {
    flex: 1,
    fontFamily: 'monospace',
  },
  habitInput: {
    flex: 1,
  },
  saveBtn: {
    fontSize: '13px',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
  },
  activeKeyIndicator: {
    fontSize: '12px',
    color: '#55a630',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  greenDot: {
    animation: 'pulse 1.5s infinite',
  },
  divider: {
    border: 'none',
    borderTop: '1px dashed var(--color-border)',
    margin: '20px 0',
    opacity: 0.5,
  },
  habitList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '10px',
  },
  habitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#f3ece2',
    border: '1px solid var(--color-border)',
    borderRadius: '12px',
    padding: '4px 10px',
    fontSize: '13px',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'red',
    opacity: 0.6,
    display: 'flex',
    alignItems: 'center',
  },
  emptyHabits: {
    fontSize: '13px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '10px 0',
  },
  toast: {
    position: 'absolute' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'var(--color-accent)',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 'bold',
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
};
