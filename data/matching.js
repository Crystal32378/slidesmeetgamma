// 配對引擎 — 三軸加權、可解釋、永遠不顯示分數。
// 分數只用於排序，不外顯（沿用 Coffee Meets Codex 的原則：不是 compatibility score）。

import { labelOf, intentOf, UNCERTAINTY } from './catalog.js';

export function overlap(a = [], b = []) {
  const set = new Set(b.map(String));
  return [...new Set(a.map(String))].filter((x) => set.has(x));
}

export function scoreMatch(me, other) {
  const shared = {
    building: overlap(me.building, other.building),
    taste: overlap(me.taste, other.taste),
    topics: overlap(me.topics, other.topics),
  };
  const total = shared.building.length + shared.taste.length + shared.topics.length;
  // 在做什麼 & 想聊什麼 權重較高；deck 品味是加分項
  const score = shared.building.length * 3 + shared.topics.length * 3 + shared.taste.length * 2;
  return { score, shared, total };
}

export function publicProfile(p) {
  return {
    id: p.id,
    name: p.displayName,
    tagline: p.tagline,
    intentions: p.intentions,
    building: p.building,
    taste: p.taste,
    topics: p.topics,
    mode: p.mode,
  };
}

export function buildReasoning(me, other, m) {
  const reasons = [];
  const { building, taste, topics } = m.shared;

  if (building.length) {
    reasons.push(
      `你們都在做 ${building.map((id) => labelOf('building', id)).join('、')}`
    );
  }
  if (topics.length) {
    reasons.push(`你們都想聊 ${topics.map((id) => labelOf('topics', id)).join('、')}。`);
  }
  if (taste.length) {
    reasons.push(
      `deck 品味也對得上：${taste.map((id) => labelOf('taste', id)).join('、')}。`
    );
  }
  if (reasons.length < 2) {
    const sharedIntent = other.intentions.find((i) => me.intentions.includes(i));
    const label = sharedIntent ? intentOf(sharedIntent).zh : '同一種人';
    reasons.push(`你們想找的是同一種人：${label}。`);
  }
  return reasons.slice(0, 2);
}

export function openerFor(me, other, m) {
  const b = m.shared.building[0] || other.building[0];
  const t = m.shared.topics[0] || other.topics[0];
  if (b && t) {
    return `你也在做${labelOf('building', b)}。${labelOf('topics', t)}的 deck，第一頁放什麼？`;
  }
  if (m.shared.building[0]) {
    return `你也在做${labelOf('building', m.shared.building[0])}——你那份 deck 第一頁是什麼？`;
  }
  if (m.shared.topics[0]) {
    return `你也在聊${labelOf('topics', m.shared.topics[0])}——你最近卡在哪？`;
  }
  if (b) {
    return `${labelOf('building', b)}這塊，你現在做到哪了？`;
  }
  if (t) {
    return `${labelOf('topics', t)}這個話題，你最近卡在哪？`;
  }
  return '你最近在做什麼？講成 3 張卡是什麼樣子？';
}

export function makeCard(me, other, match) {
  return {
    profile: publicProfile(other),
    reasons: buildReasoning(me, other, match),
    uncertainty: UNCERTAINTY,
    opener: openerFor(me, other, match),
    shared: match.shared,
    sharedLabels: {
      building: match.shared.building.map((id) => labelOf('building', id)),
      taste: match.shared.taste.map((id) => labelOf('taste', id)),
      topics: match.shared.topics.map((id) => labelOf('topics', id)),
    },
  };
}
