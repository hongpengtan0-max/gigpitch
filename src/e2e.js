import { runGig } from './agent.js';
const brief = process.argv[2] || '需求：我们是一家社区咖啡店「豆仓 Bean Barn」，想要一个温暖、手作感的LOGO，配色偏棕色和奶油色，还需要名片和外带杯包装设计。预算800元，希望一周内完成。';
const t = Date.now(); const r = await runGig(brief);
console.log(JSON.stringify(r, null, 2)); console.error('elapsed ms', Date.now() - t);
for (const k of ['analysis','quote','bid_zh','bid_en','checklist','prompts']) if (!r[k]) { console.error('MISSING', k); process.exit(1); }
console.error('E2E OK');
