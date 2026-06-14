export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
  type: 'expense' | 'income';
}

export interface ParsedHabit {
  name: string;
  completed: boolean;
}

export interface ParsedData {
  title?: string;
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  diary: string;
  expenses: ParsedExpense[];
  habits: ParsedHabit[];
}

export function generateFallbackTitle(
  mood?: 'happy' | 'calm' | 'sad' | 'angry' | 'tired',
  text?: string
): string {
  if (mood) {
    const moodTitles = {
      happy: ['快乐碎碎念', '心情美滋滋', '今日晴空万里', '捕捉小确幸', '快乐小日子'],
      calm: ['平凡的小美好', '舒服的日常', '今日宜发呆', '安静的时光', '生活小记'],
      sad: ['给生活加点糖', '今日小委屈', '阴天的心情', '抱抱自己', '碎碎念时间'],
      angry: ['呼气吸气', '有点小烦躁', '不开心碎碎念', '今日吐槽', '给心情放个假'],
      tired: ['累并充实着', '充电中...', '好好休息的一天', '今天辛苦啦', '晚安碎碎念']
    };
    const titles = moodTitles[mood];
    const index = text ? text.length % titles.length : 0;
    return titles[index];
  }
  
  if (text) {
    const cleanText = text.replace(/[，。！、,;!\s]/g, '').trim();
    if (cleanText.length > 0) {
      return cleanText.substring(0, 8) + (cleanText.length > 8 ? '...' : '');
    }
  }
  
  return '今日手账小记';
}

// Default habits list to check against
const DEFAULT_HABITS = ['喝水', '运动', '阅读', '跑步', '早睡', '背单词', '冥想'];

// Expense categories and keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  '餐饮': ['饭', '面', '晚餐', '午餐', '早餐', '吃', '零食', '水果', '咖啡', '甜品', '火锅', '烧烤', '麦当劳', '肯德基', '奶茶', '饮料', '买菜'],
  '交通': ['打车', '公交', '地铁', '车票', '机票', '油费', '滴滴', '骑车', '出行', '路费', '火车', '高铁'],
  '购物': ['衣服', '鞋', '包', '淘宝', '京东', '拼多多', '买东西', '化妆品', '护肤品', '手机', '数码', '礼物', '网购'],
  '娱乐': ['电影', '游戏', '网吧', 'KTV', '话剧', '门票', '玩', '娱乐', '聚会', '酒吧', '桌游'],
  '日用': ['超市', '日用品', '房租', '水费', '电费', '网费', '话费', '生活费', '垃圾袋', '纸巾'],
  '医疗': ['药', '看病', '医院', '挂号', '买药', '健身', '体检', '口罩', '医生'],
};

function getCategoryForDescription(desc: string): string {
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => desc.includes(kw))) {
      return category;
    }
  }
  return '其他';
}

export function parseSentenceLocally(text: string, customHabits?: string[]): ParsedData {
  const habitsToTest = customHabits && customHabits.length > 0 ? customHabits : DEFAULT_HABITS;
  const result: ParsedData = {
    title: '',
    diary: text,
    expenses: [],
    habits: []
  };

  // 1. Parse Mood
  const moodPatterns = {
    happy: /开心|高兴|快乐|爽|棒|好|喜悦|欢喜|愉快|兴奋|得劲|happy|joy/i,
    calm: /平静|安宁|舒适|放松|一般|还好|还可以|普通|平淡|calm|peace|okay/i,
    sad: /难过|伤心|沮丧|郁闷|伤感|哭|痛|悲伤|委屈|难受|sad|blue/i,
    angry: /生气|愤怒|烦|烦躁|暴躁|抓狂|气死|恼火|气愤|angry|annoyed/i,
    tired: /累|疲惫|疲倦|困|无力|撑不住|崩溃|疲劳|tired|sleepy/i,
  };

  for (const [mood, regex] of Object.entries(moodPatterns)) {
    if (regex.test(text)) {
      result.mood = mood as 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
      break;
    }
  }

  // 2. Parse Expenses & Income
  // Regex pattern for: "买奶茶花了15元" or "买奶茶15元"
  // Group 1: description, Group 2: amount
  const buyPattern = /(?:买|吃|喝|打|租|坐|看)\s*([^\d，。！、,;!\s]{1,10}?)\s*(?:花了|用去|支出)?\s*(\d+(?:\.\d+)?)\s*(?:元|块|角|毛|分|刀|钱|块钱)?/g;
  
  // Regex pattern for: "花了15元买奶茶" or "花了15元在奶茶上"
  // Group 1: amount, Group 2: description
  const spendPattern = /(?:花了|用去|支出|付了|花费|消费)\s*(\d+(?:\.\d+)?)\s*(?:元|块|角|毛|分|刀|钱|块钱)?\s*(?:买|吃|喝|打|在)?\s*([^\d，。！、,;!\s]{1,10})/g;
  
  // Regex pattern for income: "挣了500元" or "发工资1000元" or "收到200元红包"
  // Group 1: description/source, Group 2: amount
  const incomePattern1 = /(?:挣了|赚了|发工资|收到|入账|收入)\s*(\d+(?:\.\d+)?)\s*(?:元|块|角|毛|分|刀|钱|块钱)?(?:\s*(?:的|作为)?\s*([^\d，。！、,;!\s]{1,10}))?/g;
  const incomePattern2 = /([^\d，。！、,;!\s]{1,10}?)\s*(?:赚了|挣了|收入|入账|收到)\s*(\d+(?:\.\d+)?)\s*(?:元|块|角|毛|分|刀|钱|块钱)?/g;

  let match;
  const matchedRanges: [number, number][] = [];

  // Helper to check if a range overlaps with already matched parts (to avoid double parsing)
  const isOverlapping = (start: number, end: number) => {
    return matchedRanges.some(([s, e]) => (start >= s && start < e) || (end > s && end <= e));
  };

  // Check Incomes first
  incomePattern1.lastIndex = 0;
  while ((match = incomePattern1.exec(text)) !== null) {
    const start = match.index;
    const end = incomePattern1.lastIndex;
    if (isOverlapping(start, end)) continue;
    
    const amount = parseFloat(match[1]);
    const desc = match[2] || '收入';
    if (!isNaN(amount)) {
      result.expenses.push({
        amount,
        category: '收入',
        description: desc,
        type: 'income'
      });
      matchedRanges.push([start, end]);
    }
  }

  incomePattern2.lastIndex = 0;
  while ((match = incomePattern2.exec(text)) !== null) {
    const start = match.index;
    const end = incomePattern2.lastIndex;
    if (isOverlapping(start, end)) continue;

    const desc = match[1];
    const amount = parseFloat(match[2]);
    if (!isNaN(amount)) {
      result.expenses.push({
        amount,
        category: '收入',
        description: desc,
        type: 'income'
      });
      matchedRanges.push([start, end]);
    }
  }

  // Check Buy Patterns (Expenses)
  buyPattern.lastIndex = 0;
  while ((match = buyPattern.exec(text)) !== null) {
    const start = match.index;
    const end = buyPattern.lastIndex;
    if (isOverlapping(start, end)) continue;

    const desc = match[1];
    const amount = parseFloat(match[2]);
    if (!isNaN(amount)) {
      result.expenses.push({
        amount,
        category: getCategoryForDescription(desc),
        description: desc,
        type: 'expense'
      });
      matchedRanges.push([start, end]);
    }
  }

  // Check Spend Patterns (Expenses)
  spendPattern.lastIndex = 0;
  while ((match = spendPattern.exec(text)) !== null) {
    const start = match.index;
    const end = spendPattern.lastIndex;
    if (isOverlapping(start, end)) continue;

    const amount = parseFloat(match[1]);
    const desc = match[2];
    if (!isNaN(amount)) {
      result.expenses.push({
        amount,
        category: getCategoryForDescription(desc),
        description: desc,
        type: 'expense'
      });
      matchedRanges.push([start, end]);
    }
  }

  // Generic fallback if "花了 50" exists without a descriptive item
  const genericSpendPattern = /(?:花了|支出|付了|用去)\s*(\d+(?:\.\d+)?)\s*(?:元|块|角|毛|分|刀|钱|块钱)/g;
  genericSpendPattern.lastIndex = 0;
  while ((match = genericSpendPattern.exec(text)) !== null) {
    const start = match.index;
    const end = genericSpendPattern.lastIndex;
    if (isOverlapping(start, end)) continue;

    const amount = parseFloat(match[1]);
    if (!isNaN(amount)) {
      result.expenses.push({
        amount,
        category: '其他',
        description: '未分类支出',
        type: 'expense'
      });
      matchedRanges.push([start, end]);
    }
  }

  // 3. Parse Habits
  // For each habit, check if it's mentioned.
  habitsToTest.forEach(habit => {
    const escapedHabit = habit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`([^\\s，。！、,;!]{0,3})(${escapedHabit})`, 'gi');
    let match;
    let found = false;
    let completed = false;

    while ((match = regex.exec(text)) !== null) {
      found = true;
      const prefix = match[1];
      const hasNegative = /没|不|无|非|未|别/g.test(prefix);
      if (!hasNegative) {
        completed = true;
      }
    }

    if (found) {
      result.habits.push({
        name: habit,
        completed: completed
      });
    }
  });

  result.title = generateFallbackTitle(result.mood, text);
  return result;
}
