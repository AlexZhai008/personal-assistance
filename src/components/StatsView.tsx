import React from 'react';
import { BarChart3, TrendingUp, Heart, ShoppingBag } from 'lucide-react';

interface JournalRecord {
  date: string;
  title: string;
  content: string;
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  photoIndex: number;
  customPhotoUrl: string | null;
  expenses: Array<{ amount: number; category: string; description: string; type: 'expense' | 'income' }>;
  habits: Array<{ name: string; completed: boolean }>;
}

interface StatsViewProps {
  records: Record<string, JournalRecord>;
}

const MOOD_TYPES = [
  { id: 'happy', name: '开心', emoji: '😊', color: 'var(--color-joy)' },
  { id: 'calm', name: '平静', emoji: '😌', color: 'var(--color-calm)' },
  { id: 'sad', name: '沮丧', emoji: '😢', color: 'var(--color-sad)' },
  { id: 'angry', name: '生气', emoji: '😡', color: 'var(--color-angry)' },
  { id: 'tired', name: '疲惫', emoji: '🥱', color: 'var(--color-tired)' },
];

export const StatsView: React.FC<StatsViewProps> = ({ records }) => {
  const recordsList = Object.values(records);
  const totalDays = recordsList.length;

  // 1. Mood Statistics
  const moodCounts: Record<string, number> = { happy: 0, calm: 0, sad: 0, angry: 0, tired: 0 };
  let loggedMoodDays = 0;
  
  recordsList.forEach(r => {
    if (r.mood) {
      moodCounts[r.mood]++;
      loggedMoodDays++;
    }
  });

  // 2. Financial Statistics
  let totalExpense = 0;
  let totalIncome = 0;
  const categoryExpenses: Record<string, number> = {
    '餐饮': 0, '交通': 0, '购物': 0, '娱乐': 0, '日用': 0, '医疗': 0, '其他': 0
  };

  recordsList.forEach(r => {
    r.expenses.forEach(e => {
      if (e.type === 'expense') {
        totalExpense += e.amount;
        if (categoryExpenses[e.category] !== undefined) {
          categoryExpenses[e.category] += e.amount;
        } else {
          categoryExpenses['其他'] += e.amount;
        }
      } else {
        totalIncome += e.amount;
      }
    });
  });

  // Sort expense categories by amount descending
  const sortedCategories = Object.entries(categoryExpenses)
    .filter(([_, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="sketchy-box paper-dotted" style={styles.container}>
      <div className="washi-tape washi-tape-peach" style={styles.tape}>
        数据统计 STATS
      </div>

      <div style={styles.content}>
        {totalDays === 0 ? (
          <div style={styles.empty}>
            <BarChart3 size={40} style={{ color: '#ccc', marginBottom: 12 }} />
            <p>暂时没有手账记录来生成统计看板哦~</p>
            <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-text-muted)' }}>
              快去主页智能解析输入你的第一句日志吧！
            </p>
          </div>
        ) : (
          <div style={styles.statsGrid}>
            {/* Left Box: Mood Stats */}
            <div className="sketchy-box" style={styles.statsCard}>
              <div style={styles.cardHeader}>
                <Heart size={16} style={{ color: 'var(--color-joy)' }} />
                <h4 style={styles.cardTitle}>心情印章分布 (累计 {loggedMoodDays} 天)</h4>
              </div>

              <div style={styles.chartList}>
                {MOOD_TYPES.map(m => {
                  const count = moodCounts[m.id] || 0;
                  const pct = loggedMoodDays > 0 ? Math.round((count / loggedMoodDays) * 100) : 0;
                  return (
                    <div key={m.id} style={styles.chartRow}>
                      <div style={styles.chartRowLabel}>
                        <span style={{ fontSize: '16px', marginRight: 4 }}>{m.emoji}</span>
                        <span>{m.name}</span>
                      </div>
                      <div style={styles.chartRowBarBg}>
                        <div
                          className="washi-tape"
                          style={{
                            ...styles.chartRowBarFill,
                            backgroundColor: m.color,
                            width: pct > 0 ? `${pct}%` : '0%',
                            height: '100%',
                            position: 'relative',
                            borderRadius: '4px',
                            boxShadow: 'none',
                            transform: 'none',
                            opacity: 0.85,
                          }}
                        />
                      </div>
                      <span style={styles.chartRowVal}>{count}次 ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Box: Money Stats */}
            <div className="sketchy-box" style={styles.statsCard}>
              <div style={styles.cardHeader}>
                <ShoppingBag size={16} style={{ color: 'var(--color-secondary)' }} />
                <h4 style={styles.cardTitle}>分类支出排行 (累计 ￥{totalExpense.toFixed(1)})</h4>
              </div>

              <div style={styles.chartList}>
                {sortedCategories.map(([cat, amt]) => {
                  const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                  const emojiMap: Record<string, string> = {
                    '餐饮': '🍔', '交通': '🚗', '购物': '🛍️', '娱乐': '🎉', '日用': '🧺', '医疗': '💊', '其他': '📦'
                  };
                  return (
                    <div key={cat} style={styles.chartRow}>
                      <div style={styles.chartRowLabel}>
                        <span style={{ marginRight: 4 }}>{emojiMap[cat] || '🏷️'}</span>
                        <span>{cat}</span>
                      </div>
                      <div style={styles.chartRowBarBg}>
                        <div
                          className="washi-tape washi-tape-peach"
                          style={{
                            ...styles.chartRowBarFill,
                            width: `${pct}%`,
                            height: '100%',
                            position: 'relative',
                            borderRadius: '4px',
                            boxShadow: 'none',
                            transform: 'none',
                            opacity: 0.8,
                          }}
                        />
                      </div>
                      <span style={styles.chartRowVal}>￥{amt.toFixed(1)} ({pct}%)</span>
                    </div>
                  );
                })}
                {sortedCategories.length === 0 && (
                  <div style={styles.emptyChart}>本月暂无支出记录~</div>
                )}
              </div>

              {/* Income vs Expenses Balance */}
              <div style={styles.balanceSection}>
                <div style={styles.balanceHeader}>
                  <TrendingUp size={14} style={{ color: 'var(--color-primary)', marginRight: 4 }} />
                  <span>本月收支平衡分析 :</span>
                </div>
                <div style={styles.balanceDetails}>
                  <div style={styles.balanceRow}>
                    <span>累计入账:</span>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>+￥{totalIncome.toFixed(1)}</span>
                  </div>
                  <div style={styles.balanceRow}>
                    <span>累计支出:</span>
                    <span style={{ color: '#de7b70', fontWeight: 'bold' }}>-￥{totalExpense.toFixed(1)}</span>
                  </div>
                  <hr style={styles.balanceDivider} />
                  <div style={styles.balanceRow}>
                    <span>净存蓄额:</span>
                    <span style={{
                      fontWeight: 'bold',
                      color: totalIncome - totalExpense >= 0 ? 'var(--color-primary)' : '#de7b70'
                    }}>
                      {totalIncome - totalExpense >= 0 ? '+' : ''}￥{(totalIncome - totalExpense).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    padding: '36px 16px 16px 16px',
    backgroundColor: 'var(--color-paper)',
    minHeight: '400px',
    flex: 'none', // Prevent Flexbox from shrinking the container vertically when height is limited
  },
  tape: {
    top: '-8px',
    left: '20px',
    transform: 'rotate(1deg)',
    zIndex: 5,
  },
  content: {
    width: '100%',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '48px 0',
    color: 'var(--color-text-muted)',
  },
  statsGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '1px 1px 3px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderBottom: '1px dashed var(--color-border)',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
  },
  chartList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  chartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chartRowLabel: {
    width: '60px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
  },
  chartRowBarBg: {
    flex: 1,
    height: '12px',
    backgroundColor: '#f5f0e6',
    borderRadius: '6px',
    overflow: 'hidden',
    border: '1px solid rgba(0,0,0,0.06)',
  },
  chartRowBarFill: {
    borderRadius: '4px',
    borderLeft: 'none',
    borderRight: 'none',
  },
  chartRowVal: {
    width: '80px',
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textAlign: 'right' as const,
  },
  emptyChart: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '12px 0',
    textAlign: 'center' as const,
  },
  balanceSection: {
    marginTop: '20px',
    borderTop: '1px dashed var(--color-border)',
    paddingTop: '12px',
  },
  balanceHeader: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  balanceDetails: {
    backgroundColor: '#fdfbf7',
    border: '1px solid rgba(0,0,0,0.06)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  balanceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    margin: '4px 0',
  },
  balanceDivider: {
    border: 'none',
    borderTop: '1px dashed #e0e0e0',
    margin: '6px 0',
  },
};
