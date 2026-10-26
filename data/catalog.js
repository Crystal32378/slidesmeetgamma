// Slides Meets Gamma — 活動目錄
// 三條配對軸 + 三種「你來找什麼」的意圖。每一軸的選項都是主辦方定義的，
// 不用自由文字，降低現場填寫成本（活動 90 秒內要填完）。

export const INTENTS = [
  { id: 'inspire', zh: '找靈感', en: 'Inspiration', hint: '想看看別人怎麼把想法講成故事' },
  { id: 'collaborate', zh: '找合作', en: 'Collaborate', hint: '想找人一起把某件事做成' },
  { id: 'crew', zh: '找同好', en: 'Find your people', hint: '想遇到聊得來、聊得久的人' },
];

export const BUILDING = [
  { id: 'pitch', zh: '提案簡報', en: 'Pitch deck' },
  { id: 'portfolio', zh: '作品集', en: 'Portfolio' },
  { id: 'teach', zh: '教學內容', en: 'Teaching' },
  { id: 'newsletter', zh: '電子報', en: 'Newsletter' },
  { id: 'product', zh: '產品上線', en: 'Product launch' },
  { id: 'brand', zh: '品牌敘事', en: 'Brand story' },
  { id: 'research', zh: '研究報告', en: 'Research' },
  { id: 'event', zh: '活動演講', en: 'Event talk' },
];

export const TASTE = [
  { id: 'cinematic', zh: '電影感', en: 'Cinematic' },
  { id: 'editorial', zh: '雜誌感', en: 'Editorial' },
  { id: 'minimal', zh: '極簡', en: 'Minimal' },
  { id: 'surreal', zh: '超現實', en: 'Surreal' },
  { id: 'handmade', zh: '手作感', en: 'Handmade' },
  { id: 'data', zh: '數據感', en: 'Data-driven' },
  { id: 'retro', zh: '復古印刷', en: 'Retro print' },
  { id: 'playful', zh: '玩味', en: 'Playful' },
];

export const TOPICS = [
  { id: 'ai-design', zh: 'AI × 設計', en: 'AI × Design' },
  { id: 'founder', zh: '創業與品牌', en: 'Founding & brand' },
  { id: 'teaching', zh: '教學與知識', en: 'Teaching & knowledge' },
  { id: 'community', zh: '社群經營', en: 'Community' },
  { id: 'visual', zh: '視覺實驗', en: 'Visual experiments' },
  { id: 'career', zh: '職涯轉彎', en: 'Career pivots' },
  { id: 'tech-aesthetic', zh: '科技與美學', en: 'Tech & aesthetics' },
  { id: 'storytelling', zh: '說故事', en: 'Storytelling' },
];

export const AXES = { building: BUILDING, taste: TASTE, topics: TOPICS };

export function labelOf(axis, id) {
  const item = (AXES[axis] || []).find((x) => x.id === id);
  return item ? item.zh : id;
}

export function intentOf(id) {
  return INTENTS.find((x) => x.id === id) || INTENTS[0];
}

export const UNCERTAINTY =
  '共同點只是起點，合不合只有現場才知道。';
