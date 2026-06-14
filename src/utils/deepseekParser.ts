import type { ParsedData, ParsedExpense, ParsedHabit } from './localParser';
import { generateFallbackTitle } from './localParser';

// Normalize the raw parsed output from DeepSeek into a guaranteed ParsedData structure
export function normalizeParsedData(raw: any, fallbackText: string): ParsedData {
  const result: ParsedData = {
    title: raw?.title || '',
    diary: raw?.diary || fallbackText,
    expenses: [],
    habits: []
  };

  // 1. Normalize Mood
  const validMoods = ['happy', 'calm', 'sad', 'angry', 'tired'];
  if (raw?.mood && validMoods.includes(raw.mood)) {
    result.mood = raw.mood as 'happy' | 'calm' | 'sad' | 'angry' | 'tired';
  } else if (raw?.mood) {
    // Map Chinese mood keywords to English keys if returned in Chinese
    const moodMap: Record<string, 'happy' | 'calm' | 'sad' | 'angry' | 'tired'> = {
      '开心': 'happy', '愉快': 'happy', '高兴': 'happy', '快乐': 'happy',
      '平静': 'calm', '放松': 'calm', '一般': 'calm', '舒适': 'calm',
      '沮丧': 'sad', '难过': 'sad', '伤心': 'sad', '郁闷': 'sad',
      '生气': 'angry', '愤怒': 'angry', '烦躁': 'angry',
      '疲惫': 'tired', '累': 'tired', '困': 'tired'
    };
    const mapped = moodMap[raw.mood];
    if (mapped) result.mood = mapped;
  }

  // 2. Normalize Expenses/Finances
  // DeepSeek might return it as 'expenses', 'finances', 'ledger', or 'transactions'
  const rawExpenses = raw?.expenses || raw?.finances || raw?.ledger || raw?.transactions || [];
  if (Array.isArray(rawExpenses)) {
    result.expenses = rawExpenses.map((e: any): ParsedExpense => {
      let amt = parseFloat(e?.amount || e?.price || e?.value || 0);
      if (isNaN(amt)) amt = 0;

      let type: 'expense' | 'income' = 'expense';
      if (e?.type === 'income' || e?.type === '收入' || e?.category === '收入') {
        type = 'income';
      }

      let category = e?.category || (type === 'income' ? '收入' : '其他');
      let description = e?.description || e?.desc || e?.name || (type === 'income' ? '收入' : '支出');

      return {
        amount: amt,
        category,
        description,
        type
      };
    });
  }

  // 3. Normalize Habits
  // DeepSeek might return habits as an array of objects, array of strings, or a key-value object
  const rawHabits = raw?.habits || [];
  if (Array.isArray(rawHabits)) {
    result.habits = rawHabits.map((h: any): ParsedHabit => {
      if (typeof h === 'string') {
        return { name: h, completed: true };
      }
      return {
        name: h?.name || h?.habit || '',
        completed: h?.completed !== undefined ? !!h.completed : true
      };
    }).filter(h => h.name);
  } else if (typeof rawHabits === 'object' && rawHabits !== null) {
    // Handle key-value object e.g., {"跑步": true, "喝水": false}
    result.habits = Object.entries(rawHabits).map(([name, completed]): ParsedHabit => {
      return {
        name,
        completed: !!completed
      };
    }).filter(h => h.name);
  }

  // Ensure title is generated if missing
  if (!result.title || result.title.trim() === '') {
    result.title = generateFallbackTitle(result.mood, result.diary || fallbackText);
  }

  return result;
}

export async function parseSentenceWithDeepSeek(
  text: string,
  apiKey: string,
  habitsList: string[]
): Promise<ParsedData> {
  const url = 'https://api.deepseek.com/chat/completions';

  const prompt = `
You are an AI assistant helping a user parse a daily life log (written in a single sentence or brief text) into structured journal data for a hand-ledger app.
Analyze the user's input: "${text}"

Available habits to check: ${habitsList.join(', ')}

Please extract:
1. title: A cute, literary, and minimalist title (4-8 Chinese characters) for this journal page in Chinese, summarizing the day's highlights (e.g., "今日晴空万里", "关于奶茶的小确幸", "跑步与晚风"). Do not include date.
2. The dominant mood (must be one of: "happy", "calm", "sad", "angry", "tired"). If no mood is mentioned or implied, you can omit the field.
3. A polished, friendly diary entry paragraph representing the user's day in Chinese based on their input. Do NOT add any emotional states, feelings, psychological activities (e.g., "感觉充实又满足"), or facts that the user did not explicitly state or imply. Keep it strictly faithful to the factual content of the user's input, but polished to sound elegant and read smoothly as a diary entry.
4. Financial records (expenses and income). For each, extract:
   - amount: number
   - category: must be one of "餐饮", "交通", "购物", "娱乐", "日用", "医疗", "收入", "其他"
   - description: short string (e.g. "奶茶", "打车", "发工资")
   - type: "expense" (支出) or "income" (收入)
5. Habit completions from the available habits list. Include a habit ONLY if it was explicitly mentioned in the text. Mark completed as true if they completed it, and false if they explicitly said they did not do it (e.g., "没去跑步" -> name: "跑步", completed: false).

You must return a valid JSON object matching the requested schema. Output ONLY the raw JSON object, do not wrap in markdown code blocks or write any explanation.
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // Official name for DeepSeek chat models
        messages: [
          {
            role: 'system',
            content: 'You are a structured parser. You output raw JSON only matching the schema.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_object',
        },
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.choices?.[0]?.message?.content;
    if (!candidateText) {
      throw new Error('No response content from DeepSeek');
    }

    const rawParsed = JSON.parse(candidateText);
    // Normalize properties defensively
    const parsed = normalizeParsedData(rawParsed, text);
    return parsed;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('网络请求超时，自动切换至本地规则解析机制');
    }
    console.error('DeepSeek parsing failed:', error);
    throw error;
  }
}
