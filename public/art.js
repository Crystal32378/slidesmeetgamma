// Slides Meets Gamma — 手繪 SVG 插畫
// 全部 inline vector，零外部圖檔、零生成成本。風格對齊 Gamma 的 Surreal Pointillism：
// 藍天、點描紋理、單一主體、畫面要會「破框」。
// 三眼貓是 Gamma 官方 mascot「Mr. Peepers」的致敬手繪版本。

let uid = 0;
const nid = (p) => `${p}${(uid += 1)}`;

const DOT_COLORS = ['#84C1FA', '#F578DE', '#FF5000', '#CDDAFA', '#AFE7FC'];

/** Mr. Peepers — 三眼貓。第三隻眼是一個 portal（品牌：Floating G 是通往想法的門）。 */
export function peepers({ size = 220, glow = true, flip = false } = {}) {
  const g = nid('pk');
  const e1 = nid('eye');
  const gl = nid('glow');
  const halo = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 26; i += 1) {
    const a = rnd() * Math.PI * 2;
    const rr = 96 + rnd() * 46;
    halo.push(
      `<circle cx="${(130 + Math.cos(a) * rr * 1.08).toFixed(1)}" cy="${(
        126 +
        Math.sin(a) * rr * 0.92
      ).toFixed(1)}" r="${(1.4 + rnd() * 3).toFixed(1)}" fill="${DOT_COLORS[
        Math.floor(rnd() * DOT_COLORS.length)
      ]}" opacity="${(0.35 + rnd() * 0.5).toFixed(2)}"/>`
    );
  }
  return `
<svg class="art art--peepers" width="${size}" height="${size * 0.98}" viewBox="0 0 260 250" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mr. Peepers，Gamma 的三眼貓 mascot" style="${flip ? 'transform:scaleX(-1)' : ''}">
  <defs>
    <linearGradient id="${g}" x1="40" y1="20" x2="220" y2="230" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2C88F7"/><stop offset="0.45" stop-color="#1862D4"/><stop offset="1" stop-color="#002253"/>
    </linearGradient>
    <radialGradient id="${e1}" cx="38%" cy="32%" r="70%">
      <stop stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#AFE7FC"/><stop offset="1" stop-color="#84C1FA"/>
    </radialGradient>
    <radialGradient id="${nid('third')}" cx="50%" cy="45%" r="60%">
      <stop stop-color="#FFE7F5"/><stop offset="0.5" stop-color="#F578DE"/><stop offset="1" stop-color="#921653"/>
    </radialGradient>
    ${glow ? `<filter id="${gl}" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>` : ''}
  </defs>
  ${halo.join('')}
  <g ${glow ? `filter="url(#${gl})"` : ''}>
    <path d="M58 80 L44 16 L114 46 Z" fill="url(#${g})"/>
    <path d="M202 80 L216 16 L146 46 Z" fill="url(#${g})"/>
    <path d="M68 68 L58 32 L104 52 Z" fill="#F578DE" opacity="0.75"/>
    <path d="M192 68 L202 32 L156 52 Z" fill="#F578DE" opacity="0.75"/>
    <path d="M130 40 C72 40 42 84 42 130 C42 184 78 214 130 214 C182 214 218 184 218 130 C218 84 188 40 130 40 Z" fill="url(#${g})"/>
    <path d="M130 40 C72 40 42 84 42 130 C42 184 78 214 130 214" stroke="#84C1FA" stroke-opacity="0.45" stroke-width="2"/>
    <ellipse cx="92" cy="132" rx="17" ry="19" fill="url(#${e1})"/>
    <ellipse cx="168" cy="132" rx="17" ry="19" fill="url(#${e1})"/>
    <ellipse cx="93" cy="135" rx="7.5" ry="9" fill="#002253"/>
    <ellipse cx="169" cy="135" rx="7.5" ry="9" fill="#002253"/>
    <circle cx="90" cy="130" r="2.6" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="166" cy="130" r="2.6" fill="#FFFFFF" opacity="0.9"/>
    <ellipse cx="130" cy="86" rx="17" ry="20" fill="url(#${nid('t2')})"/>
    <ellipse cx="130" cy="86" rx="7" ry="10" fill="#002253"/>
    <circle cx="127" cy="81" r="2.6" fill="#FFFFFF" opacity="0.92"/>
    <ellipse cx="130" cy="86" rx="27" ry="32" stroke="#84C1FA" stroke-opacity="0.5" stroke-width="1.5"/>
    <ellipse cx="130" cy="86" rx="37" ry="43" stroke="#CDDAFA" stroke-opacity="0.28" stroke-width="1.1"/>
    <path d="M122 166 Q130 159 138 166 Q130 175 122 166 Z" fill="#F578DE"/>
    <path d="M130 174 L130 180" stroke="#AFE7FC" stroke-width="2" stroke-linecap="round"/>
    <path d="M118 183 Q130 192 142 183" stroke="#AFE7FC" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
    <g stroke="#AFE7FC" stroke-width="1.8" stroke-linecap="round" opacity="0.55">
      <path d="M66 146 L16 134"/><path d="M66 156 L14 156"/><path d="M68 166 L20 180"/>
      <path d="M194 146 L244 134"/><path d="M194 156 L246 156"/><path d="M192 166 L240 180"/>
    </g>
  </g>
</svg>`;
}

/** 水母 — 半透明、點描內臟、觸手會飄 */
export function jellyfish({ size = 160, tone = 'flamingo', flip = false } = {}) {
  const g = nid('j');
  const gl = nid('jg');
  const palettes = {
    flamingo: ['#FFE7F5', '#F578DE', '#921653'],
    sky: ['#E8EEFC', '#84C1FA', '#1862D4'],
    aurora: ['#E2F7E1', '#7AF9EF', '#009EA4'],
  };
  const [c1, c2, c3] = palettes[tone] || palettes.flamingo;
  const dots = [];
  let seed = 13;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 16; i += 1) {
    dots.push(
      `<circle cx="${(34 + rnd() * 112).toFixed(1)}" cy="${(28 + rnd() * 52).toFixed(1)}" r="${(
        1.2 +
        rnd() * 2.6
      ).toFixed(1)}" fill="#FFFFFF" opacity="${(0.25 + rnd() * 0.45).toFixed(2)}"/>`
    );
  }
  const tent = (x, len, sway) =>
    `<path class="art__tentacle" style="--sway:${sway}s" d="M${x} 104 C${x - 12} 134 ${x + 12} 152 ${
      x - 4
    } ${104 + len}" stroke="${c2}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>`;
  return `
<svg class="art art--jelly" width="${size}" height="${size * 1.25}" viewBox="0 0 180 225" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="漂浮的水母" style="${flip ? 'transform:scaleX(-1)' : ''}">
  <defs>
    <radialGradient id="${g}" cx="50%" cy="26%" r="72%">
      <stop stop-color="${c1}"/><stop offset="0.55" stop-color="${c2}" stop-opacity="0.9"/><stop offset="1" stop-color="${c3}" stop-opacity="0.85"/>
    </radialGradient>
    <filter id="${gl}" x="-70%" y="-70%" width="240%" height="240%">
      <feGaussianBlur stdDeviation="12"/>
    </filter>
  </defs>
  <ellipse cx="90" cy="78" rx="58" ry="46" fill="${c2}" opacity="0.32" filter="url(#${gl})"/>
  <path d="M28 94 C28 36 60 14 90 14 C120 14 152 36 152 94 C136 116 44 116 28 94 Z" fill="url(#${g})"/>
  <path d="M28 94 C28 36 60 14 90 14 C120 14 152 36 152 94" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.6"/>
  ${dots.join('')}
  <path d="M44 104 C64 116 116 116 136 104" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.4"/>
  ${tent(56, 74, 0)}${tent(74, 96, 0.4)}${tent(90, 64, 0.8)}${tent(106, 92, 1.2)}${tent(124, 70, 1.6)}
</svg>`;
}

/** 蘑菇 — 帽上有點描斑點，底下發光 */
export function mushroom({ size = 140, cap = 'flamingo', flip = false } = {}) {
  const g = nid('m');
  const gl = nid('mg');
  const palettes = {
    flamingo: ['#F578DE', '#921653', '#FFE7F5'],
    rocket: ['#FF5000', '#CC3702', '#FFDCCB'],
    ultramarine: ['#2C88F7', '#002253', '#E8EEFC'],
    evergreen: ['#3CAA3C', '#1A561C', '#E2F7E1'],
  };
  const [c1, c2, c3] = palettes[cap] || palettes.flamingo;
  const spots = [
    [56, 48, 7],
    [82, 36, 5.5],
    [106, 54, 6],
    [68, 68, 4.5],
    [96, 74, 5],
    [42, 62, 4],
    [122, 68, 3.6],
  ];
  return `
<svg class="art art--mushroom" width="${size}" height="${size * 1.18}" viewBox="0 0 160 190" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="一顆有點描斑點的蘑菇" style="${flip ? 'transform:scaleX(-1)' : ''}">
  <defs>
    <linearGradient id="${g}" x1="30" y1="20" x2="130" y2="100" gradientUnits="userSpaceOnUse">
      <stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="${gl}" cx="50%" cy="50%" r="50%">
      <stop stop-color="${c3}" stop-opacity="0.85"/><stop offset="1" stop-color="${c3}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="80" cy="172" rx="44" ry="9" fill="#002253" opacity="0.1"/>
  <ellipse cx="80" cy="96" rx="62" ry="30" fill="${c3}" opacity="0.6" filter="url(#${gl})"/>
  <path d="M62 84 h36 v62 a18 18 0 0 1 -36 0 z" fill="#FAF9F5"/>
  <path d="M62 84 h14 v80 a18 18 0 0 1 -10 3 z" fill="#E8EEFC" opacity="0.8"/>
  <path d="M18 88 C18 44 48 22 80 22 C112 22 142 44 142 88 Z" fill="url(#${g})"/>
  <path d="M18 88 C44 102 116 102 142 88" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="1.4"/>
  ${spots
    .map(
      ([x, y, r]) =>
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${c3}" opacity="0.92"/><circle cx="${x - r * 0.25}" cy="${
          y - r * 0.25
        }" r="${r * 0.42}" fill="#FFFFFF" opacity="0.55"/>`
    )
    .join('')}
</svg>`;
}

/** 點描點陣 — 用來鋪背景 */
export function dotField({ id = 'dots', color = '#1862D4', opacity = 0.16 } = {}) {
  return `
<svg class="art art--dots" width="0" height="0" aria-hidden="true">
  <defs>
    <pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="${color}" opacity="${opacity}"/>
      <circle cx="13" cy="11" r="1" fill="${color}" opacity="${opacity * 0.7}"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#${id})"/>
</svg>`;
}

/** 天空：藍天 + 太陽 + 遠景光暈 */
export function sky({ id = 'sky' } = {}) {
  return `
<svg class="art art--sky" width="0" height="0" aria-hidden="true">
  <defs>
    <radialGradient id="${id}sun" cx="50%" cy="50%" r="50%">
      <stop stop-color="#FFF6E0"/><stop offset="0.6" stop-color="#FFE7F5" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE7F5" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${id}sky" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#CDDAFA"/><stop offset="0.55" stop-color="#E8EEFC"/><stop offset="1" stop-color="#FAF9F5" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <circle cx="82%" cy="14%" r="220" fill="url(#${id}sun)"/>
  <rect width="100%" height="70%" fill="url(#${id}sky)"/>
</svg>`;
}
