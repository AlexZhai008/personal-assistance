import React from 'react';
import { Smile, HelpCircle } from 'lucide-react';

interface MoodWidgetProps {
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  onChangeMood: (mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired') => void;
  pastMoods: Array<{ date: string; mood?: string }>;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

const MOOD_TYPES = [
  { id: 'happy' as const, emoji: '😊', name: '开心', color: 'var(--color-joy)', desc: '美好的一天！' },
  { id: 'calm' as const, emoji: '😌', name: '平静', color: 'var(--color-calm)', desc: '岁月静好。' },
  { id: 'sad' as const, emoji: '😢', name: '沮丧', color: 'var(--color-sad)', desc: '抱抱自己。' },
  { id: 'angry' as const, emoji: '😡', name: '生气', color: 'var(--color-angry)', desc: '需要冷静下。' },
  { id: 'tired' as const, emoji: '🥱', name: '疲惫', color: 'var(--color-tired)', desc: '充电中...' },
];

export const MoodWidget: React.FC<MoodWidgetProps> = ({
  mood,
  onChangeMood,
  pastMoods,
  widgetRef,
  readOnly = false,
}) => {
  const currentMoodObj = MOOD_TYPES.find(m => m.id === mood);

  // Take the last 7 items in reverse order or just the past 7 days
  const last7Days = [...pastMoods].slice(-7);
  // Ensure we have 7 items for the visual ledger row
  while (last7Days.length < 7) {
    last7Days.unshift({ date: '', mood: undefined });
  }

  return (
    <div ref={widgetRef} className="sketchy-box paper-dotted" style={styles.container}>
      {/* Washi tape decoration */}
      <div className="washi-tape washi-tape-peach" style={styles.tape}>
        今日心情 MOOD
      </div>

      <div style={styles.content}>
        {mood ? (
          /* Active Mood Stamp Card */
          <div style={styles.stampCard}>
            <div style={styles.emojiContainer}>
              <div 
                style={{
                  ...styles.watercolorBlob,
                  backgroundColor: currentMoodObj?.color,
                }}
              />
              <span style={styles.activeEmoji}>{currentMoodObj?.emoji}</span>
            </div>
            <div style={styles.moodTextContainer}>
              <h4 style={styles.moodName}>{currentMoodObj?.name}</h4>
              <p style={styles.moodDesc}>{currentMoodObj?.desc}</p>
            </div>
            {!readOnly && (
              <button 
                onClick={() => onChangeMood(undefined)} 
                style={styles.resetBtn}
                title="重新选择"
              >
                修改
              </button>
            )}
          </div>
        ) : (
          /* Unselected Mood Buttons */
          <div style={styles.selectorContainer}>
            {readOnly ? (
              <p style={{ ...styles.prompt, fontStyle: 'italic', marginTop: '10px' }}>这天未记录心情印章~</p>
            ) : (
              <>
                <p style={styles.prompt}>今天感觉怎么样？</p>
                <div style={styles.btnGrid}>
                  {MOOD_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => onChangeMood(type.id)}
                      className="sketch-button"
                      style={styles.moodButton}
                      title={type.desc}
                    >
                      <span style={styles.selectorEmoji}>{type.emoji}</span>
                      <span style={styles.selectorName}>{type.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Mini 7-day mood tracker history */}
        <div style={styles.historySection}>
          <div style={styles.historyTitle}>
            <Smile size={12} style={{ marginRight: 4 }} />
            <span>最近 7 天心情印章 :</span>
          </div>
          <div style={styles.historyRow}>
            {last7Days.map((item, idx) => {
              const dayMood = MOOD_TYPES.find(m => m.id === item.mood);
              const dayLabel = item.date ? item.date.slice(-5) : ''; // e.g. "06-12"
              
              return (
                <div key={idx} style={styles.historyItem}>
                  <div
                    style={{
                      ...styles.historyDot,
                      backgroundColor: dayMood ? dayMood.color : '#f0e6d2',
                      border: dayMood ? '1.5px solid var(--color-border)' : '1.5px dashed #ccc',
                    }}
                    title={dayMood ? `${item.date}: ${dayMood.name}` : '未记录'}
                  >
                    {dayMood ? (
                      <span style={styles.historyEmoji}>{dayMood.emoji}</span>
                    ) : (
                      <HelpCircle size={10} style={{ color: '#ccc' }} />
                    )}
                  </div>
                  <span style={styles.historyLabel}>{dayLabel || '--'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    padding: '28px 16px 16px 16px',
    backgroundColor: 'var(--color-paper)',
    minHeight: '210px',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  tape: {
    top: '-8px',
    right: '20px',
    transform: 'rotate(2deg)',
    zIndex: 5,
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    gap: '12px',
  },
  stampCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: '#fff',
    border: '1px solid rgba(92, 74, 60, 0.12)',
    boxShadow: 'inset 0 0 10px rgba(92, 74, 60, 0.03)',
    position: 'relative' as const,
    marginTop: '6px',
  },
  emojiContainer: {
    position: 'relative' as const,
    width: '56px',
    height: '56px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watercolorBlob: {
    position: 'absolute' as const,
    width: '48px',
    height: '48px',
    borderRadius: '45% 55% 50% 50% / 50% 45% 55% 50%',
    opacity: 0.75,
    transform: 'rotate(15deg)',
    animation: 'pulse 3s infinite alternate',
  },
  activeEmoji: {
    fontSize: '32px',
    zIndex: 2,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodName: {
    fontSize: '18px',
    fontFamily: 'var(--font-hand)',
    fontWeight: 'bold',
  },
  moodDesc: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    marginTop: '2px',
  },
  resetBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '1px dashed var(--color-border)',
    cursor: 'pointer',
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    padding: '2px',
  },
  selectorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px',
  },
  prompt: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
  },
  btnGrid: {
    display: 'flex',
    width: '100%',
    justifyContent: 'space-between',
    gap: '4px',
  },
  moodButton: {
    flex: 1,
    padding: '8px 2px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#fff',
    borderRadius: '10px',
  },
  selectorEmoji: {
    fontSize: '22px',
  },
  selectorName: {
    fontSize: '11px',
    fontWeight: '600',
  },
  historySection: {
    borderTop: '1px dashed var(--color-paper-lines)',
    paddingTop: '10px',
  },
  historyTitle: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
    marginBottom: '6px',
  },
  historyRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '4px',
  },
  historyItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '2px',
    flex: 1,
  },
  historyDot: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '1px 1px 2px rgba(0,0,0,0.05)',
  },
  historyEmoji: {
    fontSize: '13px',
  },
  historyLabel: {
    fontSize: '9px',
    color: 'var(--color-text-muted)',
    transform: 'scale(0.9)',
  },
};
