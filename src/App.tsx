import { useState, useEffect, useRef } from 'react';
import './App.css';
import { JournalLayout } from './components/JournalLayout';
import { AIParsingBar } from './components/AIParsingBar';
import { MoodWidget } from './components/MoodWidget';
import { DiaryWidget } from './components/DiaryWidget';
import { HabitWidget } from './components/HabitWidget';
import { ExpenseWidget } from './components/ExpenseWidget';
import { SettingsModal } from './components/SettingsModal';
import { HistoryArchive } from './components/HistoryArchive';
import { StatsView } from './components/StatsView';
import type { ParsedData, ParsedExpense } from './utils/localParser';
import { generateFallbackTitle } from './utils/localParser';

// Type definitions
interface JournalRecord {
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  photoIndex: number;
  customPhotoUrl: string | null;
  expenses: ParsedExpense[];
  habits: Array<{ name: string; completed: boolean }>;
}

const DEFAULT_HABITS = ['喝水', '运动', '阅读', '跑步', '早睡', '背单词', '冥想'];

// Helper to get local date in YYYY-MM-DD format
const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function App() {
  const todayStr = getTodayDateString();

  // State initialization with localStorage
  const [records, setRecords] = useState<Record<string, JournalRecord>>(() => {
    try {
      const saved = localStorage.getItem('journal_records');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to parse journal_records, falling back to empty database:', e);
      return {};
    }
  });

  const [habitsList, setHabitsList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('journal_habits_list');
      return saved ? JSON.parse(saved) : DEFAULT_HABITS;
    } catch (e) {
      console.error('Failed to parse journal_habits_list, falling back to default:', e);
      return DEFAULT_HABITS;
    }
  });

  const [apiProvider, setApiProvider] = useState<'deepseek' | 'gemini'>(() => {
    return (localStorage.getItem('journal_api_provider') as 'deepseek' | 'gemini') || 'deepseek';
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem('journal_api_key') || 'sk-584115c5fe064561bd27ced671c1e3c0';
  });

  const [currentDate, setCurrentDate] = useState<string>(todayStr);
  const [activeTab, setActiveTab] = useState<'today' | 'history' | 'stats'>('today');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [historyDraft, setHistoryDraft] = useState<JournalRecord | null>(null);

  // Widget References for the Flying Particles Animation
  const moodWidgetRef = useRef<HTMLDivElement>(null);
  const habitWidgetRef = useRef<HTMLDivElement>(null);
  const expenseWidgetRef = useRef<HTMLDivElement>(null);
  const diaryWidgetRef = useRef<HTMLDivElement>(null);

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('journal_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('journal_habits_list', JSON.stringify(habitsList));
  }, [habitsList]);

  useEffect(() => {
    localStorage.setItem('journal_api_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('journal_api_provider', apiProvider);
  }, [apiProvider]);

  const isReadOnly = currentDate !== todayStr && !isEditingHistory;

  // Ensure current date has an initialized record, safely merging all fields
  const currentRecordRaw = records[currentDate];
  const currentRecord: JournalRecord = isEditingHistory && historyDraft
    ? historyDraft
    : {
        date: currentDate,
        title: currentRecordRaw?.title ?? '',
        content: currentRecordRaw?.content ?? '',
        mood: currentRecordRaw?.mood,
        photoIndex: currentRecordRaw?.photoIndex ?? 0,
        customPhotoUrl: currentRecordRaw?.customPhotoUrl ?? null,
        expenses: currentRecordRaw?.expenses ?? [],
        habits: currentRecordRaw?.habits ?? habitsList.map((h) => ({ name: h, completed: false })),
      };

  // Helper to save current day's record changes
  const saveCurrentRecord = (updatedFields: Partial<JournalRecord>) => {
    if (isEditingHistory && historyDraft) {
      setHistoryDraft({
        ...historyDraft,
        ...updatedFields,
      });
    } else {
      setRecords((prev) => {
        const existing = prev[currentDate] || {
          date: currentDate,
          title: '',
          content: '',
          mood: undefined,
          photoIndex: 0,
          customPhotoUrl: null,
          expenses: [],
          habits: habitsList.map((h) => ({ name: h, completed: false })),
        };

        return {
          ...prev,
          [currentDate]: {
            ...existing,
            ...updatedFields,
          },
        };
      });
    }
  };

  // Toggle habit check-off status
  const handleToggleHabit = (habitName: string) => {
    const updatedHabits = currentRecord.habits.map((h) =>
      h.name === habitName ? { ...h, completed: !h.completed } : h
    );
    saveCurrentRecord({ habits: updatedHabits });
  };

  // Add manually entered expense/income
  const handleAddExpense = (newExp: ParsedExpense) => {
    saveCurrentRecord({ expenses: [...currentRecord.expenses, newExp] });
  };

  // Remove manually entered expense/income
  const handleRemoveExpense = (index: number) => {
    const updated = currentRecord.expenses.filter((_, idx) => idx !== index);
    saveCurrentRecord({ expenses: updated });
  };

  // AI Parser Save Action
  const handleSaveParsedData = (data: ParsedData) => {
    // Parse incoming habits and merge them into today's list
    const updatedHabits = currentRecord.habits.map((h) => {
      const parsedMatch = data.habits.find((ph) => ph.name === h.name);
      if (parsedMatch) {
        return { ...h, completed: parsedMatch.completed };
      }
      return h;
    });

    // For expenses/incomes, append them
    const updatedExpenses = [...currentRecord.expenses, ...data.expenses];

    // For mood, overwrite if exists
    const updatedMood = data.mood || currentRecord.mood;

    // For diary, append text to existing or use it as is
    let updatedContent = currentRecord.content;
    if (data.diary) {
      if (updatedContent) {
        updatedContent += `\n${data.diary}`;
      } else {
        updatedContent = data.diary;
      }
    }

    // For title, use parsed title if current title is empty
    let updatedTitle = currentRecord.title;
    if (data.title && (!updatedTitle || updatedTitle.trim() === '')) {
      updatedTitle = data.title;
    }

    saveCurrentRecord({
      title: updatedTitle,
      mood: updatedMood,
      content: updatedContent,
      habits: updatedHabits,
      expenses: updatedExpenses,
    });
  };

  // Settings Actions: Add Habit
  const handleAddHabitGlobally = (habit: string) => {
    setHabitsList((prev) => [...prev, habit]);
    // Also append to today's active record habits
    const updatedHabits = [...currentRecord.habits, { name: habit, completed: false }];
    saveCurrentRecord({ habits: updatedHabits });
  };

  // Settings Actions: Remove Habit
  const handleRemoveHabitGlobally = (habit: string) => {
    setHabitsList((prev) => prev.filter((h) => h !== habit));
    // Also filter from today's active record habits
    const updatedHabits = currentRecord.habits.filter((h) => h.name !== habit);
    saveCurrentRecord({ habits: updatedHabits });
  };

  const handleSaveHistoryEdits = () => {
    if (historyDraft) {
      setRecords((prev) => ({
        ...prev,
        [currentDate]: historyDraft,
      }));
      setIsEditingHistory(false);
      setHistoryDraft(null);
      setActiveTab('history'); // Return to calendar list
    }
  };

  const handleDiscardHistoryEdits = () => {
    setIsEditingHistory(false);
    setHistoryDraft(null);
    setActiveTab('history'); // Return to calendar list
  };

  // Return list of past mood dates for the widget history row
  const getPastMoodHistory = () => {
    return Object.keys(records)
      .sort()
      .map((date) => ({
        date,
        mood: records[date]?.mood,
      }));
  };

  return (
    <JournalLayout
      activeTab={activeTab}
      onTabChange={(tab) => {
        // Discard history edits if user switches tabs away manually
        if (isEditingHistory) {
          setIsEditingHistory(false);
          setHistoryDraft(null);
        }
        setActiveTab(tab);
      }}
      onOpenSettings={() => setIsSettingsOpen(true)}
      selectedDate={currentDate}
      isViewHistory={currentDate !== todayStr}
      onBackToToday={() => {
        setIsEditingHistory(false);
        setHistoryDraft(null);
        setCurrentDate(todayStr);
      }}
    >
      {activeTab === 'today' && (
        <div style={styles.todayTabContainer}>
          {isEditingHistory && (
            <div className="sketchy-box" style={styles.editHistoryBanner}>
              <span style={styles.editHistoryText}>✍️ 正在编辑历史手账 ({currentDate})</span>
              <div style={styles.editHistoryActions}>
                <button 
                  onClick={handleDiscardHistoryEdits} 
                  className="sketch-button"
                  style={styles.discardBtn}
                >
                  放弃
                </button>
                <button 
                  onClick={handleSaveHistoryEdits} 
                  className="sketch-button sketch-button-primary"
                  style={styles.saveHistoryBtn}
                >
                  保存
                </button>
              </div>
            </div>
          )}
          {isReadOnly && (
            <div className="sketchy-box" style={styles.viewHistoryBanner}>
              <span style={styles.viewHistoryText}>📖 正在阅读历史手账 ({currentDate})</span>
              <div style={styles.editHistoryActions}>
                <button 
                  onClick={() => {
                    const recordToEdit = records[currentDate] || {
                      date: currentDate,
                      title: '',
                      content: '',
                      mood: undefined,
                      photoIndex: 0,
                      customPhotoUrl: null,
                      expenses: [],
                      habits: habitsList.map((h) => ({ name: h, completed: false })),
                    };
                    setHistoryDraft(JSON.parse(JSON.stringify(recordToEdit)));
                    setIsEditingHistory(true);
                  }} 
                  className="sketch-button sketch-button-primary"
                  style={styles.viewHistoryEditBtn}
                >
                  编辑此页
                </button>
              </div>
            </div>
          )}
          {/* AI Parser Input */}
          {!isReadOnly && (
            <AIParsingBar
              apiProvider={apiProvider}
              apiKey={apiKey}
              habitsList={habitsList}
              onSaveToJournal={handleSaveParsedData}
              moodWidgetRef={moodWidgetRef}
              habitWidgetRef={habitWidgetRef}
              expenseWidgetRef={expenseWidgetRef}
              diaryWidgetRef={diaryWidgetRef}
            />
          )}

          {/* Stacks of Widgets */}
          <div style={styles.widgetStack}>
            <MoodWidget
              mood={currentRecord.mood}
              onChangeMood={(mood) => saveCurrentRecord({ mood })}
              pastMoods={getPastMoodHistory()}
              widgetRef={moodWidgetRef}
              readOnly={isReadOnly}
            />
            <DiaryWidget
              title={currentRecord.title}
              content={currentRecord.content}
              photoIndex={currentRecord.photoIndex}
              customPhotoUrl={currentRecord.customPhotoUrl}
              onChangeTitle={(title) => saveCurrentRecord({ title })}
              onChangeContent={(content) => saveCurrentRecord({ content })}
              onGenerateTitle={() => {
                if (!currentRecord.title || currentRecord.title.trim() === '') {
                  const fallback = generateFallbackTitle(currentRecord.mood, currentRecord.content);
                  saveCurrentRecord({ title: fallback });
                }
              }}
              onChangePhoto={(photoIndex, customPhotoUrl) =>
                saveCurrentRecord({ photoIndex, customPhotoUrl })
              }
              widgetRef={diaryWidgetRef}
              readOnly={isReadOnly}
            />
            <HabitWidget
              habits={currentRecord.habits}
              onToggleHabit={handleToggleHabit}
              widgetRef={habitWidgetRef}
              readOnly={isReadOnly}
            />
            <ExpenseWidget
              expenses={currentRecord.expenses}
              onAddExpense={handleAddExpense}
              onRemoveExpense={handleRemoveExpense}
              widgetRef={expenseWidgetRef}
              readOnly={isReadOnly}
            />
            {isEditingHistory && (
              <div className="sketchy-box" style={styles.bottomEditBanner}>
                <div className="washi-tape washi-tape-yellow" style={styles.bottomTape}>
                  EDIT FINISHED
                </div>
                <p style={styles.bottomEditTitle}>✍️ 历史手账编辑已完成？</p>
                <p style={styles.bottomEditSub}>您可以保存当前修改，或放弃本次所有编辑。</p>
                <div style={styles.bottomActionsRow}>
                  <button 
                    onClick={handleDiscardHistoryEdits} 
                    className="sketch-button"
                    style={styles.bottomDiscardBtn}
                  >
                    放弃编辑
                  </button>
                  <button 
                    onClick={handleSaveHistoryEdits} 
                    className="sketch-button sketch-button-primary"
                    style={styles.bottomSaveBtn}
                  >
                    保存修改
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <HistoryArchive
          records={records}
          onSelectDate={(date) => {
            setCurrentDate(date);
          }}
          onViewDate={(date) => {
            setCurrentDate(date);
            setIsEditingHistory(false);
            setHistoryDraft(null);
            setActiveTab('today');
          }}
          onEditDate={(date) => {
            setCurrentDate(date);
            if (date !== todayStr) {
              const recordToEdit = records[date] || {
                date: date,
                title: '',
                content: '',
                mood: undefined,
                photoIndex: 0,
                customPhotoUrl: null,
                expenses: [],
                habits: habitsList.map((h) => ({ name: h, completed: false })),
              };
              setHistoryDraft(JSON.parse(JSON.stringify(recordToEdit)));
              setIsEditingHistory(true);
            } else {
              setIsEditingHistory(false);
              setHistoryDraft(null);
            }
            setActiveTab('today');
          }}
          currentDate={currentDate}
        />
      )}

      {activeTab === 'stats' && <StatsView records={records} />}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiProvider={apiProvider}
        onSaveApiProvider={setApiProvider}
        apiKey={apiKey}
        onSaveApiKey={setApiKey}
        habits={habitsList}
        onAddHabit={handleAddHabitGlobally}
        onRemoveHabit={handleRemoveHabitGlobally}
      />
    </JournalLayout>
  );
}

const styles = {
  todayTabContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    animation: 'fadeIn 0.4s ease',
    flex: 'none', // Prevent Flexbox from shrinking the container vertically when height is limited
  },
  widgetStack: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    marginTop: '12px',
  },
  editHistoryBanner: {
    position: 'sticky' as const,
    top: '-12px',
    zIndex: 20,
    backgroundColor: '#fef3c7',
    border: '2px solid var(--color-border)',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow: 'var(--sketch-shadow)',
    animation: 'fadeIn 0.3s ease',
  },
  editHistoryText: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#b45309',
  },
  editHistoryActions: {
    display: 'flex',
    gap: '8px',
  },
  discardBtn: {
    fontSize: '11px',
    padding: '4px 10px',
  },
  saveHistoryBtn: {
    fontSize: '11px',
    padding: '4px 10px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  },
  bottomEditBanner: {
    position: 'relative' as const,
    backgroundColor: '#fef3c7',
    padding: '24px 16px 16px 16px',
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    border: '2.5px solid var(--color-border)',
    borderRadius: '16px',
    boxShadow: 'var(--sketch-shadow)',
    animation: 'fadeIn 0.4s ease',
  },
  bottomTape: {
    position: 'absolute' as const,
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%) rotate(1deg)',
    zIndex: 5,
    width: '120px',
  },
  bottomEditTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#b45309',
    marginBottom: '4px',
  },
  bottomEditSub: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    marginBottom: '12px',
  },
  bottomActionsRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
    justifyContent: 'center',
  },
  bottomDiscardBtn: {
    flex: 1,
    maxWidth: '120px',
    fontSize: '12px',
    padding: '8px 12px',
  },
  bottomSaveBtn: {
    flex: 1,
    maxWidth: '120px',
    fontSize: '12px',
    padding: '8px 12px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  },
  viewHistoryBanner: {
    position: 'sticky' as const,
    top: '-12px',
    zIndex: 20,
    backgroundColor: '#ecfdf5',
    border: '2px solid var(--color-border)',
    borderRadius: '12px',
    padding: '10px 14px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    boxShadow: 'var(--sketch-shadow)',
    animation: 'fadeIn 0.3s ease',
  },
  viewHistoryText: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#065f46',
  },
  viewHistoryEditBtn: {
    fontSize: '11px',
    padding: '4px 10px',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
  },
};

export default App;
