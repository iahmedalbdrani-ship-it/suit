/**
 * Original, brand-coloured interior & city illustrations used as clearly-labelled demo photos.
 * Hosts replace them with real photos from the host space.
 */

type Pal = { wall: string; wall2: string; floor: string; accent: string; accent2: string; wood: string; sky1: string; sky2: string; fabric: string };

const PALETTES: Pal[] = [
  { wall: "#efe6d8", wall2: "#e5d8c4", floor: "#c9a77c", accent: "#173B3B", accent2: "#72B6A2", wood: "#a9783b", sky1: "#bfe1d6", sky2: "#f4ead9", fabric: "#2f6764" },
  { wall: "#e3efe9", wall2: "#d3e6dd", floor: "#d8c1a0", accent: "#22504f", accent2: "#D5A76B", wood: "#b88a52", sky1: "#9fd0c8", sky2: "#eaf5f1", fabric: "#72B6A2" },
  { wall: "#f3ebe0", wall2: "#ead9c2", floor: "#b99268", accent: "#173B3B", accent2: "#c97f5a", wood: "#8e6236", sky1: "#f2cfa4", sky2: "#fbefe0", fabric: "#D5A76B" },
  { wall: "#e9ece6", wall2: "#dcdfd6", floor: "#cbb28f", accent: "#2f6764", accent2: "#D5A76B", wood: "#9b7046", sky1: "#c3dcea", sky2: "#eef4f6", fabric: "#173B3B" },
  { wall: "#f1e4d2", wall2: "#e6d2b8", floor: "#a77f55", accent: "#22504f", accent2: "#72B6A2", wood: "#7d5630", sky1: "#d7e7d9", sky2: "#f6efe3", fabric: "#c98f5e" },
  { wall: "#e6efec", wall2: "#d4e3de", floor: "#d2b48e", accent: "#173B3B", accent2: "#e2b97f", wood: "#a37547", sky1: "#f1d7b6", sky2: "#e8f2ee", fabric: "#2f6764" },
];

const W = 800, H = 600;
const wrap = (body: string, title: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>`;

function plant(x: number, y: number, s: number, p: Pal) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="-70" rx="16" ry="44" fill="${p.accent2}" transform="rotate(-28)"/>
    <ellipse cx="0" cy="-76" rx="15" ry="48" fill="${p.accent}" transform="rotate(12)"/>
    <ellipse cx="0" cy="-64" rx="14" ry="38" fill="${p.accent2}" opacity=".85" transform="rotate(38)"/>
    <path d="M-26 -22 h52 l-8 42 h-36z" fill="${p.wood}"/></g>`;
}

function archWindow(x: number, y: number, w: number, h: number, p: Pal, scene: "city" | "sea" | "hills") {
  const r = w / 2;
  const clip = `M${x} ${y + r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h} H${x} Z`;
  let land = "";
  if (scene === "city") land = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${x + 8 + i * (w / 6)}" y="${y + h - 40 - ((i * 37) % 70)}" width="${w / 7}" height="${200}" fill="${p.accent}" opacity="${0.25 + (i % 3) * 0.1}"/>`).join("");
  if (scene === "sea") land = `<rect x="${x}" y="${y + h * 0.62}" width="${w}" height="${h}" fill="${p.accent2}" opacity=".55"/><path d="M${x} ${y + h * 0.7} q ${w / 4} -10 ${w / 2} 0 t ${w / 2} 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>`;
  if (scene === "hills") land = `<path d="M${x} ${y + h * 0.75} Q ${x + w * 0.3} ${y + h * 0.45} ${x + w * 0.55} ${y + h * 0.68} T ${x + w} ${y + h * 0.6} V ${y + h} H ${x} Z" fill="${p.accent}" opacity=".35"/>`;
  return `<defs><clipPath id="win${x}"><path d="${clip}"/></clipPath><linearGradient id="sky${x}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky1}"/><stop offset="1" stop-color="${p.sky2}"/></linearGradient></defs>
    <g clip-path="url(#win${x})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sky${x})"/><circle cx="${x + w * 0.7}" cy="${y + h * 0.35}" r="${w * 0.1}" fill="#fff" opacity=".7"/>${land}</g>
    <path d="${clip}" fill="none" stroke="#fff" stroke-width="10"/><line x1="${x + r}" y1="${y + 12}" x2="${x + r}" y2="${y + h}" stroke="#fff" stroke-width="6"/>`;
}

function living(p: Pal, v: number) {
  const scene = (["city", "sea", "hills"] as const)[v % 3];
  return `<rect width="${W}" height="${H}" fill="${p.wall}"/><rect y="440" width="${W}" height="160" fill="${p.floor}"/>
  <rect y="436" width="${W}" height="8" fill="${p.wall2}"/>
  ${archWindow(470, 90, 220, 300, p, scene)}
  <rect x="120" y="120" width="150" height="110" rx="6" fill="#fff"/><rect x="132" y="132" width="126" height="86" fill="${p.accent2}" opacity=".6"/><circle cx="215" cy="165" r="22" fill="${p.accent}" opacity=".7"/>
  <ellipse cx="300" cy="540" rx="250" ry="38" fill="${p.wall2}" opacity=".9"/>
  <rect x="70" y="330" width="380" height="120" rx="34" fill="${p.fabric}"/><rect x="90" y="300" width="340" height="80" rx="26" fill="${p.fabric}" opacity=".85"/>
  <rect x="105" y="318" width="90" height="62" rx="16" fill="${p.accent2}"/><rect x="330" y="318" width="80" height="62" rx="16" fill="${p.wall2}"/>
  <rect x="90" y="446" width="10" height="26" fill="${p.wood}"/><rect x="420" y="446" width="10" height="26" fill="${p.wood}"/>
  <rect x="210" y="470" width="190" height="20" rx="10" fill="${p.wood}"/><rect x="230" y="488" width="8" height="40" fill="${p.wood}"/><rect x="372" y="488" width="8" height="40" fill="${p.wood}"/>
  <circle cx="300" cy="462" r="12" fill="${p.accent2}"/>
  <line x1="740" y1="200" x2="740" y2="470" stroke="${p.accent}" stroke-width="5"/><path d="M705 200 h70 l-14 -50 h-42z" fill="${p.accent2}"/>
  ${plant(40, 470, 1.1, p)}`;
}

function bedroom(p: Pal, v: number) {
  return `<rect width="${W}" height="${H}" fill="${p.wall}"/><rect y="450" width="${W}" height="150" fill="${p.floor}"/>
  <rect x="560" y="70" width="180" height="250" rx="6" fill="${p.sky1}"/><rect x="560" y="70" width="180" height="250" rx="6" fill="none" stroke="#fff" stroke-width="10"/>
  <path d="M545 60 h50 v300 q-30 -20 -50 0z" fill="${p.accent2}" opacity=".85"/><path d="M755 60 h-50 v300 q30 -20 50 0z" fill="${p.accent2}" opacity=".85"/>
  <rect x="150" y="190" width="330" height="170" rx="24" fill="${p.accent}"/>
  <rect x="120" y="340" width="390" height="120" rx="18" fill="#fff"/><rect x="120" y="380" width="390" height="90" rx="14" fill="${p.fabric}" opacity=".9"/>
  <rect x="160" y="300" width="130" height="60" rx="20" fill="${p.wall2}"/><rect x="340" y="300" width="130" height="60" rx="20" fill="${p.wall2}"/>
  <rect x="130" y="466" width="12" height="24" fill="${p.wood}"/><rect x="488" y="466" width="12" height="24" fill="${p.wood}"/>
  <rect x="30" y="380" width="80" height="90" rx="8" fill="${p.wood}"/><path d="M50 380 h40 l-6 -40 h-28z" fill="${p.accent2}"/><rect x="66" y="340" width="6" height="0" />
  <line x1="320" y1="0" x2="320" y2="90" stroke="${p.accent}" stroke-width="3"/><path d="M290 90 h60 l-10 30 h-40z" fill="${p.accent2}"/>
  <ellipse cx="320" cy="540" rx="220" ry="30" fill="${p.wall2}" opacity="${v % 2 ? 0.9 : 0.6}"/>`;
}

function kitchen(p: Pal) {
  return `<rect width="${W}" height="${H}" fill="${p.wall}"/><rect y="470" width="${W}" height="130" fill="${p.floor}"/>
  <rect x="60" y="80" width="460" height="120" rx="8" fill="${p.accent}"/>${[0, 1, 2, 3].map((i) => `<rect x="${72 + i * 112}" y="92" width="100" height="96" rx="6" fill="${p.accent}" stroke="${p.accent2}" stroke-width="2" opacity=".95"/><rect x="${116 + i * 112}" y="170" width="14" height="4" rx="2" fill="${p.accent2}"/>`).join("")}
  <rect x="60" y="250" width="460" height="60" fill="#fff"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${60 + i * 57.5}" y="250" width="57" height="30" fill="none" stroke="${p.wall2}"/>`).join("")}
  <rect x="40" y="310" width="500" height="22" rx="4" fill="${p.wood}"/><rect x="60" y="332" width="460" height="140" fill="${p.accent2}" opacity=".85"/>
  ${[0, 1, 2].map((i) => `<rect x="${80 + i * 150}" y="350" width="130" height="104" rx="6" fill="none" stroke="#fff" stroke-width="3" opacity=".7"/>`).join("")}
  <rect x="580" y="90" width="150" height="380" rx="12" fill="#dfe5e3"/><line x1="580" y1="230" x2="730" y2="230" stroke="#c4ccca" stroke-width="4"/><rect x="600" y="250" width="8" height="60" rx="4" fill="#9aa6a3"/>
  ${[0, 1].map((i) => `<line x1="${200 + i * 180}" y1="0" x2="${200 + i * 180}" y2="40" stroke="${p.accent}" stroke-width="3"/><path d="M${180 + i * 180} 40 h40 l8 26 h-56z" fill="${p.wood}"/>`).join("")}
  <circle cx="160" cy="300" r="14" fill="${p.accent2}"/><circle cx="190" cy="304" r="10" fill="${p.wood}"/>
  ${plant(470, 312, 0.6, p)}`;
}

function bath(p: Pal) {
  const tiles = Array.from({ length: 12 }, (_, i) => Array.from({ length: 9 }, (_, j) => `<rect x="${i * 70}" y="${j * 70}" width="68" height="68" fill="${(i + j) % 2 ? p.wall : p.wall2}"/>`).join("")).join("");
  return `${tiles}<rect y="470" width="${W}" height="130" fill="${p.floor}"/>
  <circle cx="400" cy="200" r="110" fill="#fff"/><circle cx="400" cy="200" r="96" fill="${p.sky1}" opacity=".7"/><path d="M340 170 q60 -40 120 10" stroke="#fff" stroke-width="10" fill="none" opacity=".6"/>
  <rect x="230" y="330" width="340" height="30" rx="6" fill="${p.wood}"/><ellipse cx="400" cy="332" rx="80" ry="14" fill="#fff"/>
  <rect x="250" y="360" width="300" height="110" rx="8" fill="${p.accent}"/><line x1="400" y1="370" x2="400" y2="460" stroke="${p.accent2}" stroke-width="3"/>
  <rect x="396" y="300" width="8" height="32" fill="#b9c2c0"/><rect x="396" y="300" width="28" height="8" rx="4" fill="#b9c2c0"/>
  <rect x="640" y="230" width="10" height="200" fill="${p.wood}"/><rect x="610" y="250" width="70" height="140" rx="10" fill="${p.accent2}"/>
  ${plant(140, 470, 0.9, p)}`;
}

function view(p: Pal, v: number) {
  const scene = (["sea", "hills", "city"] as const)[v % 3];
  return `<rect width="${W}" height="${H}" fill="${p.wall2}"/>
  ${archWindow(70, 40, 660, 470, p, scene)}
  <rect y="480" width="${W}" height="120" fill="${p.floor}"/>
  <rect x="60" y="430" width="680" height="10" fill="#fff" opacity=".9"/>${Array.from({ length: 18 }, (_, i) => `<rect x="${70 + i * 38}" y="440" width="5" height="60" fill="#fff" opacity=".8"/>`).join("")}
  <rect x="300" y="470" width="200" height="16" rx="8" fill="${p.wood}"/><rect x="390" y="486" width="20" height="60" fill="${p.wood}"/>
  <rect x="180" y="440" width="90" height="70" rx="20" fill="${p.fabric}"/><rect x="530" y="440" width="90" height="70" rx="20" fill="${p.fabric}"/>
  <circle cx="370" cy="460" r="10" fill="#fff"/><circle cx="430" cy="460" r="10" fill="#fff"/>`;
}

function city(slug: string) {
  const p = PALETTES[0];
  const bg = `<defs><linearGradient id="cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1d7b6"/><stop offset=".6" stop-color="#bfe1d6"/><stop offset="1" stop-color="#72B6A2"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#cs)"/><circle cx="560" cy="160" r="70" fill="#fff" opacity=".55"/>`;
  const ground = `<rect y="470" width="${W}" height="130" fill="${p.accent}"/>`;
  const palms = (x: number, s = 1) => `<g transform="translate(${x} 470) scale(${s})"><path d="M0 0 q6 -90 -4 -170" stroke="#22504f" stroke-width="10" fill="none"/>${[-60, -25, 15, 50].map((a) => `<ellipse cx="0" cy="-170" rx="62" ry="13" fill="#22504f" transform="rotate(${a} -4 -170) translate(40 0)"/>`).join("")}</g>`;
  const arches = (x: number, n: number) => Array.from({ length: n }, (_, i) => `<path d="M${x + i * 70} 470 v-90 a30 30 0 0 1 60 0 v90z" fill="#fff" opacity=".85"/>`).join("") + `<rect x="${x - 10}" y="360" width="${n * 70 + 10}" height="20" fill="#fff" opacity=".85"/>`;
  const towers = [80, 160, 250, 330, 420, 520, 610, 690].map((x, i) => `<rect x="${x}" y="${470 - (120 + ((i * 53) % 190))}" width="${50 + (i % 3) * 14}" height="${400}" rx="4" fill="#173B3B" opacity="${0.55 + (i % 3) * 0.15}"/>`).join("");
  const sea = `<rect y="400" width="${W}" height="200" fill="#2f6764"/><path d="M0 430 q100 -16 200 0 t200 0 t200 0 t200 0" stroke="#c9e6dc" stroke-width="4" fill="none"/><path d="M0 470 q100 -16 200 0 t200 0 t200 0 t200 0" stroke="#c9e6dc" stroke-width="3" fill="none" opacity=".6"/>`;
  const hills = `<path d="M0 420 Q150 260 300 380 T600 330 T800 360 V600 H0Z" fill="#22504f"/><path d="M0 480 Q200 380 420 460 T800 440 V600 H0Z" fill="#173B3B"/>`;
  const rocks = `<path d="M60 470 q10 -170 90 -190 q70 -10 90 80 q20 -90 90 -60 q40 40 30 170z" fill="#c97f5a"/><path d="M460 470 q20 -220 120 -230 q90 10 110 130 q10 60 -10 100z" fill="#a9783b"/><rect y="470" width="${W}" height="130" fill="#D5A76B"/>`;
  const art: Record<string, string> = {
    riyadh: bg + towers + `<path d="M380 470 V170 q30 -60 60 0 V470z" fill="#0f2828"/><ellipse cx="410" cy="190" rx="28" ry="12" fill="#f1d7b6"/>` + ground,
    jeddah: bg + sea + palms(120) + palms(680, 0.85) + `<rect x="400" y="130" width="10" height="290" fill="#fff"/><circle cx="405" cy="130" r="14" fill="#fff"/>`,
    makkah: bg + hills + arches(250, 5) + palms(120, 0.9),
    madinah: bg + ground + arches(180, 7) + palms(100, 0.9) + palms(720, 0.8),
    dammam: bg + towers + sea,
    khobar: bg + sea + palms(150) + `<rect x="520" y="200" width="60" height="230" fill="#173B3B"/><path d="M500 200 h100 l-50 -60z" fill="#173B3B"/>`,
    abha: bg + hills + `<g fill="#fff">${[180, 260, 340].map((x, i) => `<rect x="${x}" y="${330 - i * 20}" width="60" height="${140 + i * 20}"/>`).join("")}</g><g fill="#c97f5a">${[180, 260, 340].map((x, i) => `<rect x="${x}" y="${350 - i * 20}" width="60" height="8"/>`).join("")}</g>`,
    taif: bg + hills + `<g fill="#c97f5a">${[0, 1, 2, 3, 4, 5].map((i) => `<circle cx="${140 + i * 110}" cy="${500 + (i % 2) * 20}" r="22"/>`).join("")}</g>`,
    alula: bg + rocks + palms(370, 0.8),
  };
  return art[slug] ?? bg + ground;
}

export function renderArt(name: string): string | null {
  const m = /^(living|bedroom|kitchen|bath|view|city|hero)-([a-z0-9]+)$/.exec(name);
  if (!m) return null;
  const [, kind, arg] = m;
  if (kind === "city") return wrap(city(arg), `Illustration ${arg}`);
  const v = Number(arg);
  if (!Number.isInteger(v) || v < 0 || v > 5) return null;
  const p = PALETTES[v];
  const body = { living: () => living(p, v), bedroom: () => bedroom(p, v), kitchen: () => kitchen(p), bath: () => bath(p), view: () => view(p, v), hero: () => living(p, 1) }[kind as "living"]();
  return wrap(body, `Interior illustration`);
}
