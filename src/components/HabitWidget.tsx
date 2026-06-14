import React from 'react';
import { Award, Check } from 'lucide-react';
import type { ParsedHabit } from '../utils/localParser';

interface HabitWidgetProps {
  habits: ParsedHabit[];
  onToggleHabit: (name: string) => void;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

export const HabitWidget: React.FC<HabitWidgetProps> = ({
  habits,
  onToggleHabit,
  widgetRef,
  readOnly = false,
}) => {
  const completedCount = habits.filter(h => h.completed).length;
  const totalCount = habits.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div ref={widgetRef} className="sketchy-box paper-grid" style={styles.container}>
      {/* Washi tape decoration */}
      <div className="washi-tape washi-tape-yellow" style={styles.tape}>
        今日打卡 HABITS
      </div>

      <div style={styles.content}>
        {/* Progress Header */}
        <div style={styles.header}>
          <div style={styles.progressInfo}>
            <Award size={16} style={{ color: 'var(--color-primary)' }} />
            <span style={styles.progressTitle}>习惯进度: {completedCount}/{totalCount}</span>
          </div>
          <div style={styles.progressBarBg}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        {/* Habit Checklist */}
        <div style={styles.list}>
          {habits.map((habit) => (
            <div
              key={habit.name}
              onClick={() => {
                if (!readOnly) {
                  onToggleHabit(habit.name);
                }
              }}
              style={{
                ...styles.habitRow,
                backgroundColor: habit.completed ? 'rgba(143, 168, 155, 0.05)' : 'transparent',
                cursor: readOnly ? 'default' : 'pointer',
              }}
            >
              {/* Sketchy checkbox */}
              <div style={styles.checkboxContainer}>
                <div style={styles.checkboxOutline}>
                  {habit.completed && <Check size={14} style={styles.checkIcon} />}
                </div>

                {/* Watercolor "Completed" Stamp */}
                <div
                  className={`stamp ${habit.completed ? 'active' : ''}`}
                  style={styles.stampOverlay}
                >
                  已打卡
                </div>
              </div>

              {/* Habit Name */}
              <span
                style={{
                  ...styles.habitName,
                  textDecoration: habit.completed ? 'line-through' : 'none',
                  color: habit.completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                }}
              >
                {habit.name}
              </span>
            </div>
          ))}

          {habits.length === 0 && (
            <div style={styles.empty}>
              你还没有添加习惯打卡项哦，点击右上角「设置」去添加吧~
            </div>
          )}
        </div>

        {/* Big visual completion stamp */}
        {totalCount > 0 && completedCount === totalCount && (
          <div style={styles.allDoneContainer}>
            <div style={styles.allDoneStamp}>今日满贯!</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    padding: '28px 16px 16px 16px',
    backgroundColor: 'var(--color-paper)',
    minHeight: '220px',
  },
  tape: {
    top: '-8px',
    left: '20px',
    transform: 'rotate(-1deg)',
    zIndex: 5,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    height: '100%',
    position: 'relative' as const,
  },
  header: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginTop: '6px',
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  progressTitle: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    border: '1.5px solid var(--color-border)',
    borderRadius: '4px',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'var(--color-primary)',
    borderRadius: '2px',
    transition: 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    maxHeight: '160px',
    overflowY: 'auto' as const,
    paddingRight: '2px',
  },
  habitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '6px 8px',
    border: '1px dashed transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'background-color 0.2s ease',
  },
  checkboxContainer: {
    position: 'relative' as const,
    width: '18px',
    height: '18px',
  },
  checkboxOutline: {
    width: '18px',
    height: '18px',
    border: '2px solid var(--color-border)',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkIcon: {
    color: 'var(--color-primary)',
    strokeWidth: 3,
  },
  stampOverlay: {
    position: 'absolute' as const,
    top: '-3px',
    left: '-8px',
    pointerEvents: 'none' as const,
  },
  habitName: {
    fontSize: '14px',
    fontWeight: '600',
    userSelect: 'none' as const,
  },
  empty: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
    padding: '10px 4px',
    textAlign: 'center' as const,
  },
  allDoneContainer: {
    position: 'absolute' as const,
    right: '10px',
    bottom: '5px',
    pointerEvents: 'none' as const,
  },
  allDoneStamp: {
    fontFamily: 'var(--font-hand)',
    fontSize: '18px',
    color: '#de7b70',
    border: '2px dashed #de7b70',
    padding: '2px 6px',
    borderRadius: '4px',
    transform: 'rotate(-8deg)',
    animation: 'bounce 0.8s ease infinite alternate',
    fontWeight: 'bold',
  },
};
