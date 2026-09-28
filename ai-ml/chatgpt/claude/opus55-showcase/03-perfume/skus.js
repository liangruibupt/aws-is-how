// skus.js — 四款香型：名称、香调、价格、液体颜色与吸收、瓶盖、世界、配色、配乐（纯数据）
// absorb：液体每米的 RGB 吸收系数（比尔–朗伯），越厚颜色越深；palette：该世界里文字与按钮的配色

export const SKUS = {
  whitetea: {
    name: { zh: '白茶', en: 'White Tea' },
    image: { zh: '一滴晨露，一片茶山', en: 'Morning dew on the tea hills' },
    notes: { zh: ['佛手柑', '白茶', '白麝香'], en: ['Bergamot', 'White Tea', 'White Musk'] },
    price: { CNY: 699, USD: 95 }, deal: { CNY: 499, USD: 69 },
    liquid: { color: '#cfe3b8', absorb: [9, 3, 11] }, cap: 'silver',
    world: 'whitetea', particle: 'mist', score: 'whitetea',
    palette: { ink: '#22332a', soft: '#4a6453', accent: '#6f9460', cta: '#22332a', ctaInk: '#f4f1e8', shadow: 'rgba(255,255,248,0.6)' },
  },
  osmanthus: {
    name: { zh: '桂花', en: 'Osmanthus' },
    image: { zh: '一树金桂，满城秋香', en: 'Golden blossom, autumn air' },
    notes: { zh: ['杏子', '桂花', '檀香'], en: ['Apricot', 'Osmanthus', 'Sandalwood'] },
    price: { CNY: 699, USD: 95 }, deal: { CNY: 499, USD: 69 },
    liquid: { color: '#e8a93c', absorb: [4, 14, 40] }, cap: 'gold',
    world: 'osmanthus', particle: 'florets', score: 'osmanthus',
    palette: { ink: '#fff6e4', soft: '#f1d9aa', accent: '#e8a93c', cta: '#e8a93c', ctaInk: '#2a1a06', shadow: 'rgba(40,20,0,0.6)' },
  },
  seasalt: {
    name: { zh: '海盐', en: 'Sea Salt' },
    image: { zh: '一缕海风，一片澄蓝', en: 'Sea breeze, clear blue light' },
    notes: { zh: ['海盐', '鼠尾草', '琥珀木'], en: ['Sea Salt', 'Sage', 'Amberwood'] },
    price: { CNY: 659, USD: 89 }, deal: { CNY: 469, USD: 65 },
    liquid: { color: '#bfe6ea', absorb: [10, 3, 2.5] }, cap: 'frost',
    world: 'seasalt', particle: 'spray', score: 'seasalt',
    palette: { ink: '#123a4a', soft: '#3d6978', accent: '#2f9fb2', cta: '#123a4a', ctaInk: '#eefafc', shadow: 'rgba(255,255,255,0.55)' },
  },
  rose: {
    name: { zh: '玫瑰', en: 'Rose' },
    image: { zh: '一瓣玫瑰，一夜丝绒', en: 'One petal, deep as velvet' },
    notes: { zh: ['黑加仑', '玫瑰', '广藿香'], en: ['Blackcurrant', 'Rose', 'Patchouli'] },
    price: { CNY: 799, USD: 109 }, deal: { CNY: 589, USD: 79 },
    liquid: { color: '#9c1f35', absorb: [6, 70, 45] }, cap: 'lacquer',
    world: 'rose', particle: 'petals', score: 'rose',
    palette: { ink: '#f7e9ea', soft: '#d8a8b0', accent: '#c9a45c', cta: '#c9a45c', ctaInk: '#1c0a0e', shadow: 'rgba(0,0,0,0.65)' },
  },
};
