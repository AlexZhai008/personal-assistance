import React, { useRef } from 'react';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';

interface DiaryWidgetProps {
  title: string;
  content: string;
  photoIndex: number; // 0 for plant, 1 for coffee, 2 for cat, 3 for stars, -1 for custom upload
  customPhotoUrl: string | null;
  onChangeTitle: (title: string) => void;
  onChangeContent: (content: string) => void;
  onGenerateTitle?: () => void;
  onChangePhoto: (idx: number, url: string | null) => void;
  widgetRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

const ILLUSTRATIONS = [
  {
    name: '窗前小植',
    emoji: '🌿',
    bg: 'linear-gradient(to bottom, #e2ece9, #c2d5cd)',
    caption: '“今天也是生机盎然的一天”',
  },
  {
    name: '温暖热茶',
    emoji: '☕',
    bg: 'linear-gradient(to bottom, #f7efe2, #ebd5be)',
    caption: '“一杯热茶，抚平日常的浮躁”',
  },
  {
    name: '午睡猫咪',
    emoji: '🐱',
    bg: 'linear-gradient(to bottom, #fbf2eb, #ebd2be)',
    caption: '“像猫咪一样，享受这一刻发呆”',
  },
  {
    name: '夜空繁星',
    emoji: '✨',
    bg: 'linear-gradient(to bottom, #2b3a4a, #131b26)',
    caption: '“星光闪烁，今晚会有好梦”',
  },
];

export const DiaryWidget: React.FC<DiaryWidgetProps> = ({
  title,
  content,
  photoIndex,
  customPhotoUrl,
  onChangeTitle,
  onChangeContent,
  onGenerateTitle,
  onChangePhoto,
  widgetRef,
  readOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNextPhoto = () => {
    // If it's custom, go back to 0. Otherwise go to next.
    if (photoIndex === -1) {
      onChangePhoto(0, null);
    } else {
      const next = (photoIndex + 1) % ILLUSTRATIONS.length;
      onChangePhoto(next, null);
    }
  };

  const handlePrevPhoto = () => {
    if (photoIndex === -1) {
      onChangePhoto(ILLUSTRATIONS.length - 1, null);
    } else {
      const prev = (photoIndex - 1 + ILLUSTRATIONS.length) % ILLUSTRATIONS.length;
      onChangePhoto(prev, null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400; // max dimension to fit polaroid aspect nicely
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const base64Url = canvas.toDataURL('image/jpeg', 0.7); // compress JPEG
            onChangePhoto(-1, base64Url);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const currentIllustration = photoIndex >= 0 ? ILLUSTRATIONS[photoIndex] : null;

  return (
    <div ref={widgetRef} className="sketchy-box" style={styles.container}>
      {/* Washi tape decoration */}
      <div className="washi-tape washi-tape-peach" style={styles.tape}>
        今日日记 DIARY
      </div>

      <div style={styles.contentGrid}>
        {/* Left Side: Polaroid Photo Scrapbook */}
        <div style={styles.scrapbookCol}>
          <div className="polaroid" style={styles.polaroidContainer}>
            {photoIndex === -1 && customPhotoUrl ? (
              /* Custom uploaded photo */
              <img
                src={customPhotoUrl}
                alt="Custom Journal Log"
                className="polaroid-img"
                style={styles.polaroidImg}
              />
            ) : (
              /* Standard watercolor illustration */
              <div
                style={{
                  ...styles.illustrationPlaceholder,
                  background: currentIllustration?.bg || '#eaeaea',
                }}
              >
                <span style={styles.illustrationEmoji}>
                  {currentIllustration?.emoji || '📓'}
                </span>
              </div>
            )}
            <div className="polaroid-caption" style={styles.captionText}>
              {photoIndex === -1 ? '“今天特别的一幕”' : currentIllustration?.caption}
            </div>
          </div>

          {/* Photo Toggles */}
          {!readOnly && (
            <div style={styles.photoControls}>
              <button onClick={handlePrevPhoto} style={styles.cycleBtn} title="上一个贴纸">
                <ChevronLeft size={16} />
              </button>
              
              <button onClick={triggerUpload} style={styles.uploadBtn} className="sketch-button">
                <Camera size={14} style={{ marginRight: 4 }} />
                贴上照片
              </button>

              <button onClick={handleNextPhoto} style={styles.cycleBtn} title="下一个贴纸">
                <ChevronRight size={16} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoUpload}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        {/* Right Side: Notebook Diary Editor */}
        <div style={styles.editorCol}>
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            placeholder={readOnly ? "今日无标题" : "无标题手账..."}
            readOnly={readOnly}
            className="sketch-input"
            style={styles.titleInput}
          />

          {/* Lined Paper Textarea */}
          <div style={styles.linedPaperWrapper}>
            <textarea
              value={content}
              onChange={(e) => onChangeContent(e.target.value)}
              onBlur={onGenerateTitle}
              placeholder={readOnly ? "这天没有写日记正文哦~" : "今天发生了什么好玩的事吗？快来记录一下吧..."}
              readOnly={readOnly}
              className="paper-lined"
              style={styles.textarea}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'relative' as const,
    padding: '36px 20px 20px 20px',
    backgroundColor: 'var(--color-paper)',
    minHeight: '320px',
  },
  tape: {
    top: '-8px',
    left: '20px',
    transform: 'rotate(-2deg)',
    zIndex: 5,
  },
  contentGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
  },
  scrapbookCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
  },
  polaroidContainer: {
    width: '100%',
    maxWidth: '160px',
  },
  polaroidImg: {
    width: '100%',
    aspectRatio: '1',
    objectFit: 'cover' as const,
    borderRadius: '2px',
  },
  illustrationPlaceholder: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '2px',
    border: '1px solid rgba(0,0,0,0.06)',
    boxShadow: 'inset 0 0 15px rgba(0,0,0,0.05)',
  },
  illustrationEmoji: {
    fontSize: '48px',
    filter: 'drop-shadow(2px 2px 2px rgba(0,0,0,0.1))',
  },
  captionText: {
    fontSize: '14px',
    marginTop: '10px',
    color: 'var(--color-text-muted)',
    lineHeight: '1.3',
  },
  photoControls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: '160px',
  },
  cycleBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--color-text-muted)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  uploadBtn: {
    fontSize: '11px',
    padding: '4px 8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  editorCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  titleInput: {
    fontSize: '18px',
    fontWeight: 'bold',
    fontFamily: 'var(--font-hand)',
    borderBottomStyle: 'dashed' as const,
    borderBottomWidth: '2px',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
    padding: '4px 0',
  },
  linedPaperWrapper: {
    flex: 1,
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px dashed var(--color-paper-lines)',
  },
  textarea: {
    width: '100%',
    height: '220px',
    border: 'none',
    outline: 'none',
    resize: 'none' as const,
    padding: '4px 8px',
    fontSize: '14px',
    color: 'var(--color-text)',
    backgroundColor: 'var(--color-paper)',
  },
};
