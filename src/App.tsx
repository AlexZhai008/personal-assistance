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

// Supabase authentication, cloud DB sync, and IndexedDB caching imports
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import { get, set, del } from 'idb-keyval';
import { AuthModal } from './components/AuthModal';

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
  synced?: boolean; // true if uploaded to Supabase, false/undefined if offline
  localUpdatedAt?: number; // millisecond timestamp
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

  // Cloud Synchronization and Auth States
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'offline'>('synced');

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

  // --- Supabase Cloud Sync Manager & Auth Handlers ---

  // Listen for User Login / Session State changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchCloudRecords(session.user.id);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const loggedUser = session?.user ?? null;
      setUser(loggedUser);
      if (event === 'SIGNED_IN' && loggedUser) {
        handleLoginSuccess(loggedUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSyncStatus('synced');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Listen to network status changes to trigger automatic sync uploads
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        syncPendingRecords(records, user.id);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [records, user, habitsList]);

  // Synchronize all pending (synced: false) records to the cloud database
  const syncPendingRecords = async (currentRecords = records, currentUserId = user?.id) => {
    if (!isSupabaseConfigured || !currentUserId || !navigator.onLine) {
      if (!navigator.onLine) setSyncStatus('offline');
      return;
    }

    const pendingDates = Object.keys(currentRecords).filter(
      (date) => currentRecords[date].synced === false
    );

    if (pendingDates.length === 0) {
      setSyncStatus('synced');
      return;
    }

    setSyncStatus('syncing');

    for (const date of pendingDates) {
      const rec = currentRecords[date];
      try {
        let customPhotoUrl = rec.customPhotoUrl;
        const dbKey = `offline_photo_${currentUserId}_${date}`;
        const cachedBlob = await get(dbKey);

        // Upload local offline cached photo Blob if it exists in IndexedDB
        if (cachedBlob) {
          const fileExt = 'jpg';
          const filePath = `images/${currentUserId}/${date}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('journal_photos')
            .upload(filePath, cachedBlob, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('journal_photos')
            .getPublicUrl(filePath);

          customPhotoUrl = publicUrl;
          await del(dbKey); // Clear successful upload from local IndexedDB
        }

        // Auto clean up old custom photo files from storage if the user deleted/switched to standard illustrations
        if (rec.photoIndex >= 0) {
          const filePath = `images/${currentUserId}/${date}.jpg`;
          await supabase.storage.from('journal_photos').remove([filePath]).catch(e => console.error(e));
        }

        // Upsert the entry into journals table
        const { error: upsertError } = await supabase
          .from('journals')
          .upsert({
            user_id: currentUserId,
            date: date,
            title: rec.title,
            content: rec.content,
            mood: rec.mood,
            photo_index: rec.photoIndex,
            custom_photo_url: customPhotoUrl,
            expenses: rec.expenses,
            habits: rec.habits,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,date' });

        if (upsertError) throw upsertError;

        // Mark this local record as successfully synced
        setRecords((prev) => {
          if (!prev[date]) return prev;
          return {
            ...prev,
            [date]: {
              ...prev[date],
              customPhotoUrl,
              synced: true
            }
          };
        });
      } catch (err) {
        console.error(`Failed to upload/sync record for ${date}:`, err);
        setSyncStatus('offline');
        return; // Pause the queue on error
      }
    }

    // Sync settings (habits list config)
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: currentUserId,
          habits_list: habitsList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Failed to sync user habits list settings:', e);
    }

    setSyncStatus('synced');
  };

  // Pull all cloud records and merge them with local records based on updatedAt timestamps
  const fetchCloudRecords = async (userId: string) => {
    if (!isSupabaseConfigured) return;
    setSyncStatus('syncing');
    try {
      const { data: journalRows, error: journalError } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId);

      if (journalError) throw journalError;

      const { data: settingsRow, error: settingsError } = await supabase
        .from('user_settings')
        .select('habits_list')
        .eq('user_id', userId)
        .maybeSingle();

      if (settingsError) throw settingsError;
      if (settingsRow?.habits_list) {
        setHabitsList(settingsRow.habits_list);
        localStorage.setItem('journal_habits_list', JSON.stringify(settingsRow.habits_list));
      }

      const cloudRecords: Record<string, JournalRecord> = {};
      journalRows?.forEach((row: any) => {
        cloudRecords[row.date] = {
          date: row.date,
          title: row.title ?? '',
          content: row.content ?? '',
          mood: row.mood,
          photoIndex: row.photo_index ?? 0,
          customPhotoUrl: row.custom_photo_url ?? null,
          expenses: row.expenses ?? [],
          habits: row.habits ?? [],
          synced: true,
          localUpdatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
        };
      });

      setRecords((prevLocal) => {
        const merged = { ...prevLocal };
        
        Object.entries(cloudRecords).forEach(([date, cloudRec]) => {
          const localRec = merged[date];
          if (!localRec) {
            merged[date] = cloudRec;
          } else {
            const localTime = localRec.localUpdatedAt || 0;
            const cloudTime = cloudRec.localUpdatedAt || 0;
            
            if (localRec.synced === false) {
              // Check if the local record is actually empty/unmodified
              const isLocalEmpty = 
                (!localRec.title || localRec.title.trim() === '') &&
                (!localRec.content || localRec.content.trim() === '') &&
                (!localRec.mood) &&
                (!localRec.customPhotoUrl) &&
                (!localRec.expenses || localRec.expenses.length === 0) &&
                (!localRec.habits || localRec.habits.every(h => !h.completed));

              if (isLocalEmpty) {
                // If local is completely empty, accept cloud version completely
                merged[date] = cloudRec;
              } else if (localTime < cloudTime) {
                // Cloud is newer, accept cloud
                merged[date] = cloudRec;
              } else {
                // Local is newer and not empty, but we can still fill in missing fields from cloud
                const mergedRec = { ...localRec };
                
                // If local has no mood but cloud has mood, merge it!
                if (!mergedRec.mood && cloudRec.mood) {
                  mergedRec.mood = cloudRec.mood;
                }
                
                // If local has no photo but cloud has one, merge it!
                if (!mergedRec.customPhotoUrl && cloudRec.customPhotoUrl) {
                  mergedRec.customPhotoUrl = cloudRec.customPhotoUrl;
                  mergedRec.photoIndex = cloudRec.photoIndex;
                }
                
                // If local has no content but cloud does, merge it!
                if ((!mergedRec.content || mergedRec.content.trim() === '') && cloudRec.content) {
                  mergedRec.content = cloudRec.content;
                }
                if ((!mergedRec.title || mergedRec.title.trim() === '') && cloudRec.title) {
                  mergedRec.title = cloudRec.title;
                }
                
                // Merge habits: if completed in either, set to completed
                if (cloudRec.habits && cloudRec.habits.length > 0) {
                  mergedRec.habits = mergedRec.habits.map(h => {
                    const cloudHabit = cloudRec.habits.find(ch => ch.name === h.name);
                    return {
                      ...h,
                      completed: h.completed || !!cloudHabit?.completed
                    };
                  });
                }
                
                // Merge expenses: union of unique expenses
                if (cloudRec.expenses && cloudRec.expenses.length > 0) {
                  const localExpStrings = new Set(mergedRec.expenses.map(e => `${e.amount}-${e.description}-${e.type}`));
                  cloudRec.expenses.forEach(e => {
                    const key = `${e.amount}-${e.description}-${e.type}`;
                    if (!localExpStrings.has(key)) {
                      mergedRec.expenses.push(e);
                    }
                  });
                }
                
                merged[date] = mergedRec;
              }
            } else {
              // Both synced, keep the newer one based on timestamp
              if (cloudTime > localTime) {
                merged[date] = cloudRec;
              }
            }
          }
        });

        // Trigger upload queue for any local-only records
        setTimeout(() => syncPendingRecords(merged, userId), 100);

        return merged;
      });

      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to sync/fetch cloud records:', err);
      setSyncStatus('offline');
    }
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    setUser(loggedInUser);
    
    // Mark all unsynced or local-only records for upload
    setRecords((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((date) => {
        if (updated[date].synced === undefined || updated[date].synced === null) {
          updated[date] = {
            ...updated[date],
            synced: false,
            localUpdatedAt: updated[date].localUpdatedAt || Date.now()
          };
        }
      });
      setTimeout(() => syncPendingRecords(updated, loggedInUser.id), 500);
      return updated;
    });

    fetchCloudRecords(loggedInUser.id);
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSyncStatus('synced');
    } catch (e) {
      console.error('Failed to log out:', e);
    }
  };

  // --- End Sync Manager Section ---

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
        synced: currentRecordRaw?.synced
      };

  // Helper to save current day's record changes
  const saveCurrentRecord = (updatedFields: Partial<JournalRecord>, customPhotoBlob?: Blob) => {
    const dateToUpdate = currentDate;

    if (isEditingHistory && historyDraft) {
      setHistoryDraft({
        ...historyDraft,
        ...updatedFields,
        synced: false,
        localUpdatedAt: Date.now()
      });
      if (customPhotoBlob) {
        const dbKey = `offline_photo_${user?.id || 'anonymous'}_${dateToUpdate}`;
        set(dbKey, customPhotoBlob).catch(e => console.error(e));
      }
    } else {
      setRecords((prev) => {
        const existing = prev[dateToUpdate] || {
          date: dateToUpdate,
          title: '',
          content: '',
          mood: undefined,
          photoIndex: 0,
          customPhotoUrl: null,
          expenses: [],
          habits: habitsList.map((h) => ({ name: h, completed: false })),
        };

        const updatedRecord = {
          ...existing,
          ...updatedFields,
          synced: false,
          localUpdatedAt: Date.now()
        };

        if (customPhotoBlob) {
          const dbKey = `offline_photo_${user?.id || 'anonymous'}_${dateToUpdate}`;
          set(dbKey, customPhotoBlob).catch(e => console.error(e));
        }

        const newRecords = {
          ...prev,
          [dateToUpdate]: updatedRecord,
        };

        // Trigger sync
        if (user && isSupabaseConfigured && navigator.onLine) {
          setTimeout(() => syncPendingRecords(newRecords, user.id), 100);
        } else if (user) {
          setSyncStatus('pending');
        }

        return newRecords;
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
      setRecords((prev) => {
        const updatedRecord = {
          ...historyDraft,
          synced: false,
          localUpdatedAt: Date.now()
        };
        const newRecords = {
          ...prev,
          [currentDate]: updatedRecord,
        };
        if (user && isSupabaseConfigured && navigator.onLine) {
          setTimeout(() => syncPendingRecords(newRecords, user.id), 100);
        } else if (user) {
          setSyncStatus('pending');
        }
        return newRecords;
      });
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
      user={user}
      syncStatus={syncStatus}
      onOpenAuth={() => setAuthModalOpen(true)}
      onLogout={handleLogout}
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
              onChangePhoto={(photoIndex, customPhotoUrl, blob) =>
                saveCurrentRecord({ photoIndex, customPhotoUrl }, blob)
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

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
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
