// 虛構 demo cast — 全部是虛構的成年人，沒有真人資料、沒有聯絡方式。
// 用途：主辦方在活動前排演流程、講者示範、以及第一次開啟的人先玩一遍。
// demo 資料與真實參加者資料分開存放在不同 mode，互不混用。

export const DEMO_CAST = [
  {
    id: 'demo-lin',
    displayName: 'Lin',
    tagline: '把法條講成大家都想聽的 podcast。',
    intentions: ['inspire', 'crew'],
    building: ['newsletter', 'teach'],
    taste: ['editorial', 'minimal'],
    topics: ['teaching', 'storytelling'],
  },
  {
    id: 'demo-ken',
    displayName: 'Ken',
    tagline: '替一間老唱片行做品牌重生。',
    intentions: ['collaborate', 'inspire'],
    building: ['brand', 'portfolio'],
    taste: ['retro', 'handmade'],
    topics: ['founder', 'tech-aesthetic'],
  },
  {
    id: 'demo-mu',
    displayName: 'Mu',
    tagline: '在數據裡找故事，故事裡找數據。',
    intentions: ['inspire', 'crew'],
    building: ['research', 'pitch'],
    taste: ['data', 'minimal'],
    topics: ['ai-design', 'storytelling'],
  },
  {
    id: 'demo-jun',
    displayName: 'Jun',
    tagline: '每週做一場兩百人的線上工作坊。',
    intentions: ['collaborate', 'crew'],
    building: ['teach', 'event'],
    taste: ['playful', 'editorial'],
    topics: ['community', 'teaching'],
  },
  {
    id: 'demo-sun',
    displayName: 'Sun',
    tagline: '把一杯咖啡的溫度做成儀表板。',
    intentions: ['inspire'],
    building: ['product', 'pitch'],
    taste: ['surreal', 'cinematic'],
    topics: ['visual', 'ai-design'],
  },
  {
    id: 'demo-aya',
    displayName: 'Aya',
    tagline: '離開廣告業，現在只做自己好奇的專案。',
    intentions: ['crew', 'collaborate'],
    building: ['portfolio', 'product'],
    taste: ['surreal', 'playful'],
    topics: ['career', 'community'],
  },
  {
    id: 'demo-qi',
    displayName: 'Qi',
    tagline: '寫程式，也寫詩。',
    intentions: ['inspire', 'crew', 'collaborate'],
    building: ['portfolio', 'research'],
    taste: ['minimal', 'cinematic'],
    topics: ['tech-aesthetic', 'ai-design'],
  },
  {
    id: 'demo-nova',
    displayName: 'Nova',
    tagline: '一場活動只要一個好問題。',
    intentions: ['inspire', 'collaborate'],
    building: ['event', 'pitch'],
    taste: ['cinematic', 'surreal'],
    topics: ['community', 'visual'],
  },
];

export const DEMO_PROFILE = {
  id: 'demo-you',
  displayName: 'You',
  tagline: '我正在把一個想法講成三張卡。',
  intentions: ['inspire', 'collaborate', 'crew'],
  building: ['pitch', 'portfolio'],
  taste: ['editorial', 'surreal'],
  topics: ['storytelling', 'ai-design'],
};
