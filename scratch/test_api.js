import { parseSentenceLocally as parser } from '../src/utils/localParser.ts';

const text = "今天发工资了，收到3000块，心情美滋滋！给爸妈买礼物花了600元，表达孝心。晚上还去慢跑了3公里，真是充实又开心的一天。";
const habitsList = ['喝水', '运动', '阅读', '跑步', '早睡', '背单词', '冥想'];

console.log("Input text:", text);

try {
  const localResult = parser(text, habitsList);
  console.log("Local parsed result:", JSON.stringify(localResult, null, 2));
} catch (e) {
  console.error("Local parser crashed:", e);
}
