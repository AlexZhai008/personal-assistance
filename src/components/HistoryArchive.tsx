import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, BookOpen, AlertCircle } from 'lucide-react';

interface JournalRecord {
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  photoIndex: number;
  customPhotoUrl: string | null;
  expenses: Array<{ amount: number; category: string; description: string; type: 'expense' | 'income' }>;
  habits: Array<{ name: string; completed: boolean }>;
}

interface HistoryArchiveProps {
  records: Record<string, JournalRecord>;
  onSelectDate: (date: string) => void;
  onEditDate: (date: string) => void;
  onViewDate: (date: string) => void;
  currentDate: string;
}

const MOOD_COLORS: Record<string, string> = {
  happy: 'var(--color-joy)',
  calm: 'var(--color-calm)',
  sad: 'var(--color-sad)',
  angry: 'var(--color-angry)',
  tired: 'var(--color-tired)',
};

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  sad: '😢',
  angry: '😡',
  tired: '🥱',
};

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({
  records,
  onSelectDate,
  onEditDate,
  onViewDate,
  currentDate,
}) => {
  const [viewDate, setViewDate] = useState(new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth(); // 0-indexed

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  // Generate calendar days
  const calendarCells: Array<{ day: number | null; dateString: string }> = [];
  
  // Empty slots for padding before the 1st of the month
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push({ day: null, dateString: '' });
  }

  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${monthStr}-${dayStr}`;
    calendarCells.push({ day, dateString });
  }

  // Selected date record details for quick preview below
  const selectedRecord = records[currentDate];

  return (
    <div className="sketchy-box paper-dotted" style={styles.container}>
      <div className="washi-tape washi-tape-peach" style={styles.tape}>
        历史归档 HISTORY
      </div>

      <div style={styles.content}>
        {/* Calendar Card */}
        <div style={styles.calendarCard}>
          <div style={styles.calendarHeader}>
            <button onClick={handlePrevMonth} style={styles.arrowBtn}>
              <ChevronLeft size={20} />
            </button>
            <h3 style={styles.monthTitle}>
              <CalendarIcon size={18} style={{ marginRight: 6, color: 'var(--color-primary)' }} />
              {year}年 {month + 1}月
            </h3>
            <button onClick={handleNextMonth} style={styles.arrowBtn}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Weekdays Row */}
          <div style={styles.weekdaysGrid}>
            {WEEKDAYS.map((d) => (
              <span key={d} style={styles.weekdayCell}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={styles.daysGrid}>
            {calendarCells.map((cell, idx) => {
              if (cell.day === null) {
                return <div key={`empty-${idx}`} style={styles.emptyCell} />;
              }

              const record = records[cell.dateString];
              const isSelected = cell.dateString === currentDate;
              const hasRecord = !!record;
              const cellMoodColor = record?.mood ? MOOD_COLORS[record.mood] : 'transparent';
              const cellMoodEmoji = record?.mood ? MOOD_EMOJIS[record.mood] : '';

              return (
                <button
                  key={cell.dateString}
                  onClick={() => onSelectDate(cell.dateString)}
                  style={{
                    ...styles.dayCell,
                    backgroundColor: isSelected ? 'var(--color-accent)' : cellMoodColor || '#fff',
                    border: isSelected
                      ? '2.5px solid var(--color-border)'
                      : hasRecord
                      ? '1.5px solid var(--color-border)'
                      : '1px dashed #ccc',
                    fontWeight: isSelected || hasRecord ? 'bold' : 'normal',
                  }}
                  title={hasRecord ? `${cell.dateString} (${record.title || '无标题'})` : cell.dateString}
                >
                  <span style={styles.dayNum}>{cell.day}</span>
                  {cellMoodEmoji && <span style={styles.dayEmoji}>{cellMoodEmoji}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Record Preview */}
        <div className="sketchy-box" style={styles.previewCard}>
          <div style={styles.previewHeader}>
            <BookOpen size={16} style={{ color: 'var(--color-secondary)' }} />
            <span style={styles.previewTitle}>已选日期手账预览 ({currentDate})</span>
          </div>

          {selectedRecord ? (
            <div style={styles.previewBody}>
              <h4 style={styles.recordTitle}>{selectedRecord.title || '无标题手账'}</h4>
              <div style={styles.recordStats}>
                {selectedRecord.mood && (
                  <span style={{ ...styles.badge, backgroundColor: MOOD_COLORS[selectedRecord.mood] }}>
                    心情: {MOOD_EMOJIS[selectedRecord.mood]}
                  </span>
                )}
                <span style={{ ...styles.badge, backgroundColor: '#f0e6d2' }}>
                  打卡: {selectedRecord.habits.filter((h) => h.completed).length}项
                </span>
                <span style={{ ...styles.badge, backgroundColor: '#f0e6d2' }}>
                  账目: {selectedRecord.expenses.length}笔
                </span>
              </div>
              <p style={styles.recordContent}>
                {selectedRecord.content ? (
                  selectedRecord.content.length > 80
                    ? `${selectedRecord.content.substring(0, 80)}...`
                    : selectedRecord.content
                ) : (
                  <span style={{ fontStyle: 'italic', color: '#888' }}>这天写了账目/习惯，但未写日记正文~</span>
                )}
              </p>
              <div style={styles.actionRow}>
                <span style={styles.editTip}>💡 点击下方按钮可查看或编辑此页手账记录</span>
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <button
                    onClick={() => onViewDate(currentDate)}
                    className="sketch-button"
                    style={{ ...styles.loadBtn, flex: 1 }}
                  >
                    查看手账
                  </button>
                  <button
                    onClick={() => onEditDate(currentDate)}
                    className="sketch-button sketch-button-primary"
                    style={{ ...styles.loadBtn, flex: 1 }}
                  >
                    编辑此页
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={styles.emptyPreview}>
              <AlertCircle size={24} style={{ color: '#ccc', marginBottom: '8px' }} />
              <span>所选日期 ({currentDate}) 尚无手账记录。</span>
              <span style={{ fontSize: '11px', marginTop: '4px', marginBottom: '10px' }}>
                您可以点击日历上的其他有印章的日期进行预览，或者点击下方按钮新建一页。
              </span>
              <button
                onClick={() => onEditDate(currentDate)}
                className="sketch-button sketch-button-primary"
                style={{ ...styles.loadBtn, width: '100%' }}
              >
                新建这天手账
              </button>
            </div>
          )}
        </div>
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
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
    flex: 'none', // Prevent Flexbox from shrinking the container vertically when height is limited
  },
  tape: {
    top: '-8px',
    left: '20px',
    transform: 'rotate(-2deg)',
    zIndex: 5,
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    padding: '0 6px', // Inset children to prevent their borders/shadows from clashing or overflowing the outer container
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  },
  calendarCard: {
    flex: 1,
    backgroundColor: '#fff',
    border: '2px solid var(--color-border)',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '1px 1px 3px rgba(0,0,0,0.05)',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  arrowBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  monthTitle: {
    fontFamily: 'var(--font-hand)',
    fontSize: '22px',
    display: 'flex',
    alignItems: 'center',
  },
  weekdaysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center' as const,
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
    marginBottom: '8px',
    borderBottom: '1.5px solid var(--color-border)',
    paddingBottom: '4px',
  },
  weekdayCell: {
    padding: '4px 0',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '6px',
  },
  emptyCell: {
    aspectRatio: '1',
  },
  dayCell: {
    aspectRatio: '1',
    border: '1px dashed #ccc',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px',
    cursor: 'pointer',
    position: 'relative' as const,
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
  },
  dayNum: {
    fontSize: '11px',
    alignSelf: 'flex-start',
  },
  dayEmoji: {
    fontSize: '14px',
    position: 'absolute' as const,
    bottom: '2px',
    right: '2px',
  },
  previewCard: {
    minHeight: '260px',
    backgroundColor: '#fffcf7',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box' as const,
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderBottom: '1px dashed var(--color-border)',
    paddingBottom: '8px',
    marginBottom: '12px',
  },
  previewTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
  },
  previewBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    flex: 1,
  },
  recordTitle: {
    fontFamily: 'var(--font-hand)',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  recordStats: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  badge: {
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    fontWeight: 'bold',
  },
  recordContent: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#555',
  },
  actionRow: {
    marginTop: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  editTip: {
    fontSize: '10px',
    color: 'var(--color-text-muted)',
    fontStyle: 'italic',
  },
  loadBtn: {
    fontSize: '12px',
    textAlign: 'center' as const,
  },
  emptyPreview: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    color: 'var(--color-text-muted)',
    fontSize: '12px',
    padding: '24px 0',
    flex: 1,
  },
};
