const SELF_HARM_KEYWORDS = [
  '自杀', '自残', '割腕', '跳楼', '跳河', '上吊', '服毒', '烧炭',
  '想死', '不想活了', '活着没意思', '结束生命', '离开这个世界',
  'kill myself', 'suicide', 'self harm', 'cutting', 'want to die',
  '自伤', '伤害自己', '自我伤害'
];

export const detectSelfHarmKeywords = (text: string): { detected: boolean; matchedKeywords: string[] } => {
  const lowerText = text.toLowerCase();
  const matchedKeywords: string[] = [];

  for (const keyword of SELF_HARM_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    detected: matchedKeywords.length > 0,
    matchedKeywords
  };
};

export const CRISIS_HOTLINE = env.crisisHotline;
export const CRISIS_HOTLINE_BACKUP = env.crisisHotlineBackup;

export const CRISIS_RESPONSE = {
  message: '我们注意到您可能正在经历困难时期，请记住您不是一个人。',
  hotline: CRISIS_HOTLINE,
  backupHotline: CRISIS_HOTLINE_BACKUP,
  resources: [
    '全国心理援助热线：400-161-9995',
    '北京心理危机研究与干预中心：010-82951332',
    '上海市心理援助热线：021-12320-5',
    '广州市心理援助热线：020-12320-5'
  ],
  immediateHelp: '如果您有紧急危险，请立即拨打110或前往最近医院急诊。'
};
import { env } from '../config/env.js';
