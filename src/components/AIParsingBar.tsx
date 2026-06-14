import React, { useState, useRef } from 'react';
import { Sparkles, Check, RefreshCw, AlertCircle, Trash2, Plus } from 'lucide-react';
import type { ParsedData, ParsedExpense } from '../utils/localParser';
import { parseSentenceLocally } from '../utils/localParser';
import { parseSentenceWithGemini } from '../utils/geminiParser';
import { parseSentenceWithDeepSeek } from '../utils/deepseekParser';

interface AIParsingBarProps {
  apiProvider: 'deepseek' | 'gemini';
  apiKey: string;
  habitsList: string[];
  onSaveToJournal: (data: ParsedData) => void;
  moodWidgetRef: React.RefObject<HTMLDivElement | null>;
  habitWidgetRef: React.RefObject<HTMLDivElement | null>;
  expenseWidgetRef: React.RefObject<HTMLDivElement | null>;
  diaryWidgetRef: React.RefObject<HTMLDivElement | null>;
}

export const AIParsingBar: React.FC<AIParsingBarProps> = ({
  apiProvider,
  apiKey,
  habitsList,
  onSaveToJournal,
  moodWidgetRef,
  habitWidgetRef,
  expenseWidgetRef,
  diaryWidgetRef,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState<ParsedData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    const sentence = input.trim();
    if (!sentence) return;

    setLoading(true);
    setErrorMsg('');
    setReviewData(null);

    try {
      let result: ParsedData;
      if (apiKey) {
        if (apiProvider === 'deepseek') {
          result = await parseSentenceWithDeepSeek(sentence, apiKey, habitsList);
        } else {
          result = await parseSentenceWithGemini(sentence, apiKey, habitsList);
        }
      } else {
        // Fallback to local regex-based parser
        await new Promise((resolve) => setTimeout(resolve, 800));
        result = parseSentenceLocally(sentence, habitsList);
      }
      setReviewData(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`AI 智能解析失败，已为您自动切换到本地解析机制。错误原因: ${err.message || '未知'}`);
      // Fallback immediately to local
      const localResult = parseSentenceLocally(sentence, habitsList);
      setReviewData(localResult);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!reviewData) return;

    // Trigger visual particles flying
    triggerFlyAnimations();

    // Save actual data
    onSaveToJournal(reviewData);
    
    // Clear state
    setInput('');
    setReviewData(null);
  };

  // Flying particles animation towards target widgets
  const triggerFlyAnimations = () => {
    if (!reviewData || !containerRef.current) return;

    const createParticle = (targetElement: HTMLElement | null, color: string, text: string) => {
      if (!targetElement || !containerRef.current) return;
      const startRect = containerRef.current.getBoundingClientRect();
      const endRect = targetElement.getBoundingClientRect();

      const particle = document.createElement('div');
      particle.className = 'sketchy-box flying-particle';
      particle.style.position = 'fixed';
      particle.style.left = `${startRect.left + startRect.width / 2 - 40}px`;
      particle.style.top = `${startRect.top + startRect.height / 2 - 15}px`;
      particle.style.backgroundColor = color;
      particle.style.padding = '4px 10px';
      particle.style.fontSize = '12px';
      particle.style.fontWeight = 'bold';
      particle.style.border = '2px solid var(--color-border)';
      particle.style.borderRadius = '12px';
      particle.style.zIndex = '9999';

      const tx = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
      const ty = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

      particle.style.setProperty('--tx', `${tx}px`);
      particle.style.setProperty('--ty', `${ty}px`);
      particle.innerText = text;

      document.body.appendChild(particle);
      setTimeout(() => {
        particle.remove();
      }, 800);
    };

    if (reviewData.mood) {
      const moodLabels: Record<string, string> = {
        happy: '😊 心情', calm: '😌 平静', sad: '😢 难过', angry: '😡 生气', tired: '🥱 疲惫'
      };
      createParticle(moodWidgetRef.current, 'var(--color-joy)', moodLabels[reviewData.mood] || '✨ 心情');
    }

    const habits = reviewData.habits || [];
    if (habits.length > 0) {
      const completedCount = habits.filter(h => h.completed).length;
      if (completedCount > 0) {
        createParticle(habitWidgetRef.current, 'var(--color-primary)', `✓ 打卡 x${completedCount}`);
      }
    }

    const expenses = reviewData.expenses || [];
    if (expenses.length > 0) {
      const totalExpense = expenses
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0);
      const totalIncome = expenses
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + e.amount, 0);

      if (totalExpense > 0) {
        createParticle(expenseWidgetRef.current, 'var(--color-secondary)', `￥ 支出 -${totalExpense}`);
      }
      if (totalIncome > 0) {
        createParticle(expenseWidgetRef.current, 'var(--color-accent)', `￥ 收入 +${totalIncome}`);
      }
    }

    createParticle(diaryWidgetRef.current, '#fdfbf7', '📝 日记写入');
  };

  // Helper edit functions for the Review panel
  const updateMood = (mood: 'happy' | 'calm' | 'sad' | 'angry' | 'tired' | undefined) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, mood });
  };

  const updateTitle = (title: string) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, title });
  };

  const updateDiary = (text: string) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, diary: text });
  };

  const toggleHabitStatus = (index: number) => {
    if (!reviewData) return;
    const habits = [...(reviewData.habits || [])];
    if (habits[index]) {
      habits[index] = { ...habits[index], completed: !habits[index].completed };
      setReviewData({ ...reviewData, habits });
    }
  };

  const deleteExpense = (index: number) => {
    if (!reviewData) return;
    const expenses = (reviewData.expenses || []).filter((_, i) => i !== index);
    setReviewData({ ...reviewData, expenses });
  };

  const addExpenseRow = () => {
    if (!reviewData) return;
    const newExp: ParsedExpense = {
      amount: 10,
      category: '其他',
      description: '新增支出',
      type: 'expense'
    };
    const expenses = [...(reviewData.expenses || []), newExp];
    setReviewData({ ...reviewData, expenses });
  };

  const updateExpense = (index: number, key: keyof ParsedExpense, value: any) => {
    if (!reviewData) return;
    const expenses = [...(reviewData.expenses || [])];
    if (expenses[index]) {
      expenses[index] = { ...expenses[index], [key]: value } as ParsedExpense;
      setReviewData({ ...reviewData, expenses });
    }
  };

  const handleCancel = () => {
    setReviewData(null);
  };

  return (
    <div ref={containerRef} style={styles.outerContainer}>
      {/* Tape decoration */}
      <div className="washi-tape washi-tape-yellow" style={styles.tape}>
        智能分析 AI PARSER
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleParse} className="sketchy-box" style={styles.formContainer}>
        <div style={styles.inputWrapper}>
          <input
            type="text"
            placeholder="写下你的一句话日志（例如：今天喝了3杯水，买奶茶花了15元，心情非常好！）"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={styles.input}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="sketch-button sketch-button-primary"
            style={styles.parseBtn}
          >
            {loading ? (
              <RefreshCw className="spin" size={16} />
            ) : (
              <Sparkles size={16} />
            )}
            <span style={styles.btnText}>分析</span>
          </button>
        </div>
        {!loading && !reviewData && (
          <div style={styles.localInfo}>
            {apiKey === 'sk-584115c5fe064561bd27ced671c1e3c0' ? (
              <span>✨ 已启用内置 DeepSeek 智能解析 (deepseek-v4-flash)，可直接输入！</span>
            ) : apiKey ? (
              <span>✨ 已启用 {apiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'} AI 智能解析。</span>
            ) : (
              <span>💡 当前为本地规则解析。可在设置中绑定 API Key 启用更强解析。</span>
            )}
          </div>
        )}
      </form>

      {/* Review & Edit Drawer */}
      {reviewData && (
        <div className="sketchy-box" style={styles.reviewContainer}>
          <div style={styles.reviewHeader}>
            <span style={styles.reviewTitle}>📝 AI 识别结果预览</span>
            <span style={styles.reviewSubtitle}>请检查并调整以下数据，然后保存写入今日手账：</span>
          </div>

          {errorMsg && (
            <div style={styles.warningAlert}>
              <AlertCircle size={14} style={{ marginRight: 6 }} />
              {errorMsg}
            </div>
          )}

          <div style={styles.reviewGrid}>
            {/* Column 1: Mood & Diary */}
            <div style={styles.reviewCol}>
              {/* Mood selector */}
              <div style={styles.reviewSection}>
                <div style={styles.sectionLabel}>今日心情:</div>
                <div style={styles.moodSelectorGrid}>
                  {(['happy', 'calm', 'sad', 'angry', 'tired'] as const).map((m) => {
                    const active = reviewData.mood === m;
                    const emojiMap = { happy: '😊', calm: '😌', sad: '😢', angry: '😡', tired: '🥱' };
                    const nameMap = { happy: '开心', calm: '平静', sad: '沮丧', angry: '生气', tired: '疲惫' };
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updateMood(m === reviewData.mood ? undefined : m)}
                        className="sketch-button"
                        style={{
                          ...styles.moodBtn,
                          backgroundColor: active ? `var(--color-${m})` : 'transparent',
                          borderColor: active ? 'var(--color-border)' : '#ccc',
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{emojiMap[m]}</span>
                        <span style={{ fontSize: 11 }}>{nameMap[m]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Input */}
              <div style={styles.reviewSection}>
                <div style={styles.sectionLabel}>生成标题:</div>
                <input
                  type="text"
                  value={reviewData.title || ''}
                  onChange={(e) => updateTitle(e.target.value)}
                  placeholder="给今天起个简短的文艺标题吧..."
                  className="sketch-input"
                  style={{ width: '100%', fontSize: '13px', padding: '6px 8px' }}
                />
              </div>

              {/* Diary Text Area */}
              <div style={styles.reviewSection}>
                <div style={styles.sectionLabel}>日记润色:</div>
                <textarea
                  value={reviewData.diary}
                  onChange={(e) => updateDiary(e.target.value)}
                  className="sketch-input"
                  style={styles.diaryTextarea}
                />
              </div>
            </div>

            {/* Column 2: Habits & Ledger */}
            <div style={styles.reviewCol}>
              {/* Habits Section */}
              <div style={styles.reviewSection}>
                <div style={styles.sectionLabel}>习惯打卡:</div>
                <div style={styles.habitsReviewList}>
                  {(reviewData.habits || []).map((habit, idx) => (
                    <label key={habit.name} style={styles.habitLabel}>
                      <input
                        type="checkbox"
                        checked={habit.completed}
                        onChange={() => toggleHabitStatus(idx)}
                        style={styles.checkbox}
                      />
                      <span style={{ textDecoration: habit.completed ? 'none' : 'line-through', opacity: habit.completed ? 1 : 0.6 }}>
                        {habit.name}
                      </span>
                    </label>
                  ))}
                  {(reviewData.habits || []).length === 0 && (
                    <div style={styles.noItems}>未识别出习惯。可以在日记里写到习惯字眼哦。</div>
                  )}
                </div>
              </div>

              {/* Ledger Section */}
              <div style={styles.reviewSection}>
                <div style={styles.ledgerHeader}>
                  <div style={styles.sectionLabel}>记账明细:</div>
                  <button type="button" onClick={addExpenseRow} style={styles.addExpenseBtn}>
                    <Plus size={14} /> 添加一笔
                  </button>
                </div>

                <div style={styles.expenseList}>
                  {(reviewData.expenses || []).map((exp, idx) => (
                    <div key={idx} style={styles.expenseRow}>
                      <input
                        type="text"
                        value={exp.description}
                        onChange={(e) => updateExpense(idx, 'description', e.target.value)}
                        placeholder="商品"
                        className="sketch-input"
                        style={styles.expDesc}
                      />
                      <input
                        type="number"
                        value={exp.amount === 0 ? '' : exp.amount}
                        onChange={(e) => updateExpense(idx, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="金额"
                        className="sketch-input"
                        style={styles.expAmount}
                      />
                      <select
                        value={exp.type}
                        onChange={(e) => {
                          const type = e.target.value as 'expense' | 'income';
                          updateExpense(idx, 'type', type);
                          if (type === 'income') {
                            updateExpense(idx, 'category', '收入');
                          } else if (exp.category === '收入') {
                            updateExpense(idx, 'category', '其他');
                          }
                        }}
                        style={styles.expSelect}
                      >
                        <option value="expense">支出</option>
                        <option value="income">收入</option>
                      </select>

                      {exp.type === 'expense' && (
                        <select
                          value={exp.category}
                          onChange={(e) => updateExpense(idx, 'category', e.target.value)}
                          style={styles.expSelect}
                        >
                          <option value="餐饮">餐饮</option>
                          <option value="交通">交通</option>
                          <option value="购物">购物</option>
                          <option value="娱乐">娱乐</option>
                          <option value="日用">日用</option>
                          <option value="医疗">医疗</option>
                          <option value="其他">其他</option>
                        </select>
                      )}

                      <button type="button" onClick={() => deleteExpense(idx)} style={styles.deleteExpenseBtn}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {(reviewData.expenses || []).length === 0 && (
                    <div style={styles.noItems}>未识别出账目支出。支持格式如：买咖啡15元，赚了50块。</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.reviewActions}>
            <button
              onClick={handleCancel}
              className="sketch-button"
              style={styles.cancelBtn}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="sketch-button sketch-button-primary"
              style={styles.saveBtn}
            >
              <Check size={16} style={{ marginRight: 4 }} />
              写入手账
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  outerContainer: {
    position: 'relative' as const,
    width: '100%',
    marginBottom: '24px',
    paddingTop: '12px',
  },
  tape: {
    top: '-4px',
    left: '20px',
    transform: 'rotate(-2deg)',
    zIndex: 5,
  },
  formContainer: {
    backgroundColor: '#fffcf7',
    padding: '24px 16px 14px 16px',
    border: '2px solid var(--color-border)',
    borderRadius: '16px 8px 16px 8px/8px 16px 8px 16px',
    boxShadow: 'var(--sketch-shadow)',
  },
  inputWrapper: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    borderBottom: '2px dashed var(--color-border)',
    outline: 'none',
    fontSize: '15px',
    padding: '8px 4px',
    color: 'var(--color-text)',
  },
  parseBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap' as const,
  },
  btnText: {
    display: 'inline',
    fontSize: '14px',
  },
  localInfo: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginTop: '8px',
    paddingLeft: '4px',
  },
  reviewContainer: {
    marginTop: '16px',
    backgroundColor: '#fffcf7',
    padding: '16px',
    animation: 'fadeIn 0.3s ease',
  },
  reviewHeader: {
    marginBottom: '14px',
    borderBottom: '1px dashed var(--color-border)',
    paddingBottom: '8px',
  },
  reviewTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'block',
  },
  reviewSubtitle: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    display: 'block',
    marginTop: '2px',
  },
  warningAlert: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    padding: '8px',
    fontSize: '12px',
    color: '#b91c1c',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  reviewGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  reviewCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  reviewSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
  },
  moodSelectorGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  moodBtn: {
    flex: 1,
    minWidth: '55px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '6px 4px',
    gap: '2px',
    borderRadius: '8px',
  },
  diaryTextarea: {
    width: '100%',
    minHeight: '80px',
    maxHeight: '140px',
    borderRadius: '8px',
    padding: '8px',
    fontSize: '13px',
    lineHeight: '1.6',
    border: '2px dashed var(--color-border)',
    background: 'rgba(255,255,255,0.4)',
    resize: 'vertical' as const,
  },
  habitsReviewList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    padding: '6px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255,255,255,0.4)',
    border: '1px dashed var(--color-border)',
    minHeight: '44px',
  },
  habitLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    backgroundColor: '#fff',
    padding: '4px 8px',
    borderRadius: '8px',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  checkbox: {
    cursor: 'pointer',
  },
  ledgerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addExpenseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-primary)',
    fontWeight: 'bold',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  expenseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    maxHeight: '130px',
    overflowY: 'auto' as const,
    paddingRight: '4px',
  },
  expenseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  expDesc: {
    width: '80px',
    fontSize: '13px',
    padding: '2px 4px',
  },
  expAmount: {
    width: '60px',
    fontSize: '13px',
    padding: '2px 4px',
  },
  expSelect: {
    fontSize: '12px',
    padding: '2px',
    border: '1px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: '#fff',
  },
  deleteExpenseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#ef4444',
    padding: '2px',
  },
  noItems: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '6px 4px',
  },
  reviewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '16px',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '12px',
  },
  cancelBtn: {
    fontSize: '13px',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
  },
};
