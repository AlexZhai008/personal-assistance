import type { ParsedData } from './localParser';
import { generateFallbackTitle } from './localParser';

export async function parseSentenceWithGemini(
  text: string,
  apiKey: string,
  habitsList: string[]
): Promise<ParsedData> {
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
You are an AI assistant helping a user parse a daily life log (written in a single sentence or brief text) into structured journal data for a hand-ledger app.
Analyze the user's input: "${text}"

Available habits to check: ${habitsList.join(', ')}

Please extract:
1. title: A cute, literary, and minimalist title (4-8 Chinese characters) for this journal page in Chinese, summarizing the day's highlights (e.g., "今日晴空万里", "关于奶茶的小确幸", "跑步与晚风"). Do not include date.
2. The dominant mood (must be one of: "happy", "calm", "sad", "angry", "tired"). If no mood is mentioned or implied, you can omit the field or return nothing for it.
3. A polished, friendly diary entry paragraph representing the user's day in Chinese based on their input. Do NOT add any emotional states, feelings, psychological activities (e.g., "感觉充实又满足"), or facts that the user did not explicitly state or imply. Keep it strictly faithful to the factual content of the user's input, but polished to sound elegant and read smoothly as a diary entry.
4. Financial records (expenses and income). For each, extract:
   - amount: number
   - category: must be one of "餐饮", "交通", "购物", "娱乐", "日用", "医疗", "收入", "其他". If the user did not specify what the expense was for, use "其他". For income, use "收入".
   - description: short string (e.g. "奶茶", "打车", "发工资"). If the user did not specify the reason/item (e.g., "花了80元", "赚了100元"), you MUST still extract the record, using "支出" as description for expenses, and "收入" for income.
   - type: "expense" (支出) or "income" (收入)
5. Habit completions from the available habits list. Include a habit ONLY if it was explicitly mentioned in the text. Mark completed as true if they completed it, and false if they explicitly said they did not do it (e.g., "没去跑步" -> name: "跑步", completed: false).

Few-shot Examples to guide your output:
Example 1:
Input: "今天出二手闲置了2台旧相机回血800，打车去火锅店付了65块"
Output JSON:
{
  "title": "回血与火锅晚宴",
  "mood": "happy",
  "diary": "今天将两台闲置的旧相机出售了，回血了八百元。晚上打车去火锅店吃火锅，打车付了六十五元。",
  "expenses": [
    { "amount": 800, "category": "收入", "description": "出二手闲置相机", "type": "income" },
    { "amount": 65, "category": "交通", "description": "打车去火锅店", "type": "expense" }
  ],
  "habits": []
}

Example 2:
Input: "卖衣服入账200，又去买奶茶15块，今天没运动"
Output JSON:
{
  "title": "奶茶与平静午后",
  "mood": "calm",
  "diary": "今天卖衣服收入了两百元，随后去买了杯十五元的奶茶。今天没有进行运动。",
  "expenses": [
    { "amount": 200, "category": "收入", "description": "卖衣服", "type": "income" },
    { "amount": 15, "category": "餐饮", "description": "买奶茶", "type": "expense" }
  ],
  "habits": [
    { "name": "运动", "completed": false }
  ]
}
`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: {
                type: 'STRING',
                description: 'A cute, literary, and minimalist title (4-8 Chinese characters) for this journal page.',
              },
              mood: {
                type: 'STRING',
                enum: ['happy', 'calm', 'sad', 'angry', 'tired'],
                description: 'Dominant mood parsed from the text.',
              },
              diary: {
                type: 'STRING',
                description: 'A friendly and polished diary narrative text based on the log.',
              },
              expenses: {
                type: 'ARRAY',
                description: 'Financial transactions parsed from the text.',
                items: {
                  type: 'OBJECT',
                  properties: {
                    amount: { type: 'NUMBER' },
                    category: {
                      type: 'STRING',
                      enum: ['餐饮', '交通', '购物', '娱乐', '日用', '医疗', '收入', '其他'],
                    },
                    description: { type: 'STRING' },
                    type: { type: 'STRING', enum: ['expense', 'income'] },
                  },
                  required: ['amount', 'category', 'description', 'type'],
                },
              },
              habits: {
                type: 'ARRAY',
                description: 'Mentioned habits and their completion status.',
                items: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING' },
                    completed: { type: 'BOOLEAN' },
                  },
                  required: ['name', 'completed'],
                },
              },
            },
            required: ['title', 'diary', 'expenses', 'habits'],
          },
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('No response content from Gemini');
    }

    const parsed = JSON.parse(candidateText) as ParsedData;
    if (!parsed.title || parsed.title.trim() === '') {
      parsed.title = generateFallbackTitle(parsed.mood, parsed.diary || text);
    }
    return parsed;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('网络请求超时，自动切换至本地规则解析机制');
    }
    console.error('Gemini parsing failed, falling back to local parser:', error);
    throw error;
  }
}
