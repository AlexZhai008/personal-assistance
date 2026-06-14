import React from 'react';
import { Settings, Calendar, BookOpen, BarChart3, ArrowLeft, Wifi, Battery, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { isSupabaseConfigured } from '../utils/supabaseClient';

interface JournalLayoutProps {
  activeTab: 'today' | 'history' | 'stats';
  onTabChange: (tab: 'today' | 'history' | 'stats') => void;
  onOpenSettings: () => void;
  selectedDate: string;
  isViewHistory: boolean;
  onBackToToday: () => void;
  children: React.ReactNode;
  user: any;
  syncStatus: 'synced' | 'pending' | 'syncing' | 'offline';
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const JournalLayout: React.FC<JournalLayoutProps> = ({
    activeTab,
    onTabChange,
    onOpenSettings,
    selectedDate,
    isViewHistory,
    onBackToToday,
    children,
    user,
    syncStatus,
    onOpenAuth,
    onLogout,
  }) => {
    // Format selectedDate to Chinese readable format (e.g. 6月13日)
    const formatDateString = (dateStr: string) => {
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parseInt(parts[1])}月${parseInt(parts[2])}日`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };
  
    // Hardcode a cozy mock time for our journal
    const mockTime = "22:45";

    const handleCloudClick = () => {
      if (user) {
        if (window.confirm(`確認要退出當前雲端帳號 (${user.email}) 嗎？退出後將暫停自動同步。`)) {
          onLogout();
        }
      } else {
        onOpenAuth();
      }
    };

    // Helper to get status dot color
    const getStatusDotStyle = () => {
      switch (syncStatus) {
        case 'synced':
          return { backgroundColor: '#52c41a' }; // Green
        case 'syncing':
          return { backgroundColor: '#1890ff' }; // Blue
        case 'pending':
          return { backgroundColor: '#faad14' }; // Yellow
        case 'offline':
          return { backgroundColor: '#f5222d' }; // Red
        default:
          return { backgroundColor: '#bfbfbf' };
      }
    };

    const getCloudTitle = () => {
      if (!isSupabaseConfigured) return '雲端服務未配置（本地模式）';
      if (!user) return '未登錄帳號（本地存儲，點擊登錄/同步）';
      
      const statusText = {
        synced: '數據已實時同步至雲端',
        syncing: '正在同步數據...',
        pending: '有未同步的本地數據，等待聯網同步',
        offline: '雲端同步連接失敗，已暫存本地',
      }[syncStatus];

      return `已登錄: ${user.email} (${statusText}，點擊退出帳號)`;
    };
  
    return (
      <div className="phone-frame" style={styles.phoneFrame}>
        {/* Mock Mobile Status Bar */}
        <div className="phone-status-bar">
          <span>{mockTime}</span>
          <div className="phone-status-icons">
            <Wifi size={12} style={{ opacity: 0.8 }} />
            <span style={{ fontSize: '10px', opacity: 0.8 }}>LTE</span>
            <Battery size={14} style={{ opacity: 0.8, marginLeft: 2 }} />
          </div>
        </div>
  
        {/* Main Pocket Book Container */}
        <div style={styles.notepadContainer}>
          {/* Wire binder spiral rings on the left margin */}
          <div className="spiral-binding" style={styles.spiralMargin}>
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="spiral-ring" style={styles.spiralRingAdjusted} />
            ))}
          </div>
  
          {/* Notebook Header */}
          <header style={styles.header}>
            <div style={styles.headerTitleGroup}>
              <h1 style={styles.mainTitle}>时光手账</h1>
              <span style={styles.dateLabel}>
                {formatDateString(selectedDate)}
              </span>
            </div>
  
            <div style={styles.headerActions}>
              {isViewHistory && (
                <button 
                  onClick={onBackToToday} 
                  className="sketch-button" 
                  style={styles.backTodayBtn}
                  title="返回今天"
                >
                  <ArrowLeft size={12} />
                </button>
              )}

              {/* Cloud Sync Button */}
              {isSupabaseConfigured && (
                <button 
                  onClick={handleCloudClick} 
                  style={styles.cloudBtn} 
                  title={getCloudTitle()}
                >
                  {syncStatus === 'syncing' ? (
                    <RefreshCw size={18} className="spin" style={{ color: '#1890ff' }} />
                  ) : !user ? (
                    <CloudOff size={18} style={{ color: 'var(--color-text-muted)' }} />
                  ) : (
                    <Cloud size={18} style={{ color: 'var(--color-primary)' }} />
                  )}
                  {user && <span style={{ ...styles.statusDot, ...getStatusDotStyle() }} />}
                </button>
              )}

              <button onClick={onOpenSettings} style={styles.settingsBtn} title="设置">
                <Settings size={18} />
              </button>
            </div>
          </header>

        {isViewHistory && (
          <div style={styles.historyNotice}>
            正在查看历史手账纪录 ({selectedDate})
          </div>
        )}

        {/* Scrollable Journal Page Body */}
        <div className="phone-content-wrapper" style={styles.scrollContent}>
          {children}
        </div>
      </div>

      {/* Bottom Tab Bar styled like tape labels */}
      <div className="phone-tab-bar">
        <button
          onClick={() => onTabChange('today')}
          className={`phone-tab-btn ${activeTab === 'today' ? 'phone-tab-btn-active' : ''}`}
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'today' ? 'var(--color-primary)' : '#fdfbf7',
            color: activeTab === 'today' ? '#fff' : 'var(--color-text)',
          }}
        >
          <BookOpen size={14} color={activeTab === 'today' ? '#fff' : 'var(--color-primary)'} />
          <span>今日手账</span>
        </button>

        <button
          onClick={() => onTabChange('history')}
          className={`phone-tab-btn ${activeTab === 'history' ? 'phone-tab-btn-active' : ''}`}
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'history' ? 'var(--color-secondary)' : '#fdfbf7',
            color: activeTab === 'history' ? '#fff' : 'var(--color-text)',
          }}
        >
          <Calendar size={14} color={activeTab === 'history' ? '#fff' : 'var(--color-secondary)'} />
          <span>历史归档</span>
        </button>

        <button
          onClick={() => onTabChange('stats')}
          className={`phone-tab-btn ${activeTab === 'stats' ? 'phone-tab-btn-active' : ''}`}
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'stats' ? 'var(--color-accent)' : '#fdfbf7',
            color: activeTab === 'stats' ? '#fff' : 'var(--color-text)',
          }}
        >
          <BarChart3 size={14} color={activeTab === 'stats' ? '#fff' : '#c9a054'} />
          <span>数据统计</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  phoneFrame: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  notepadContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: 'var(--color-paper)',
    position: 'relative' as const,
    borderBottom: 'none',
    overflow: 'hidden',
  },
  spiralMargin: {
    left: '2px',
    top: '30px',
    bottom: '30px',
    width: '16px',
    justifyContent: 'space-around',
    height: '85%',
  },
  spiralRingAdjusted: {
    width: '14px',
    height: '6px',
    margin: '12px 0',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px 10px 24px', // Extra left padding to clear spiral rings
    borderBottom: '1px dashed var(--color-paper-lines)',
    backgroundColor: '#fffcf9',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  mainTitle: {
    fontFamily: 'var(--font-hand)',
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'var(--color-border)',
  },
  dateLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-hand)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  backTodayBtn: {
    padding: '4px 6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
  },
  settingsBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
  },
  cloudBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: '4px',
    position: 'relative' as const,
  },
  statusDot: {
    position: 'absolute' as const,
    bottom: '2px',
    right: '2px',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    border: '1px solid #fff',
  },
  historyNotice: {
    backgroundColor: 'var(--color-accent)',
    color: '#4a3e3d',
    fontSize: '11px',
    fontWeight: 'bold',
    textAlign: 'center' as const,
    padding: '4px 0',
    borderBottom: '1px dashed var(--color-border)',
  },
  scrollContent: {
    padding: '12px 12px 16px 24px', // Extra left padding to clear spiral rings
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  },
  tabBtn: {
    boxShadow: '1px 1px 0px var(--color-border)',
    borderWidth: '1.5px',
  },
};
