// GigPitch: local bid assistant for freelance designers.
// Mastra workflow and agent, running Gemma 3 through Ollama on the local machine.
import { Agent } from '@mastra/core/agent';
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { createOllama } from 'ollama-ai-provider-v2';
import { z } from 'zod';
import fs from 'node:fs';

const ollama = createOllama({ baseURL: (process.env.OLLAMA_URL || 'http://127.0.0.1:11434') + '/api' });
export const MODEL = process.env.GIGPITCH_MODEL || 'gemma3:1b';
const PORTFOLIO = process.env.PORTFOLIO_MD || '/workspace/portfolio/cases.md';

export const gigAgent = new Agent({
  id: 'gigpitch', name: 'GigPitch',
  instructions: 'You write on behalf of Hongpeng, an independent freelance logo designer, bidding on Chinese and international gig sites. Be concise, concrete, and honest. Never invent fake reviews or claims.',
  model: ollama(MODEL),
});

// Portfolio context. This is plain retrieval, deterministic and offline.
export function loadCases() {
  if (!fs.existsSync(PORTFOLIO)) return [];
  return fs.readFileSync(PORTFOLIO, 'utf8').split(/\n## /).slice(1).map(b => {
    const title = b.split('\n')[0].replace(/^案例\s*\d+\s*｜/, '').trim();
    const desc = (b.match(/设计说明：(.*)/) || [,''])[1];
    return { title, desc };
  });
}
const INDUSTRY = { 商贸: ['trade','商贸','贸易'], 健康: ['health','草本','健康','herbal','wellness','yoga','瑜伽','spa'], 珠宝: ['jewel','黄金','珠宝','gold'], 文旅: ['travel','tour','文旅','旅游'], 园区: ['office','园区','写字楼','park'], 生鲜: ['food','fresh','生鲜','果','菜','restaurant','餐','咖啡','coffee','奶茶','tea'], 婚恋: ['dating','wedding','婚','恋'] };
export function matchCases(brief, cases = loadCases(), k = 2) {
  const b = brief.toLowerCase();
  const score = c => Object.entries(INDUSTRY).reduce((s, [key, kws]) =>
    s + ((c.title + c.desc).includes(key) && kws.some(w => b.includes(w)) ? 5 : 0), 0)
    + [...new Set(b.match(/[\u4e00-\u9fa5]{2}/g) || [])].filter(w => (c.title + c.desc).includes(w)).length;
  return cases.map(c => ({ ...c, s: score(c) })).sort((x, y) => y.s - x.s).slice(0, k);
}

// The quote is computed in code, not by the model, so prices stay consistent.
export function quote(a) {
  let base = 299; const why = ['基础LOGO设计 ¥299'];
  if (a.needs_vi) { base += 400; why.push('VI/应用延展 +¥400'); }
  if (a.complexity === 'high') { base += 200; why.push('复杂度高 +¥200'); }
  if (a.urgent) { base = Math.round(base * 1.3); why.push('加急 ×1.3'); }
  if (a.budget_cny && a.budget_cny < base) why.push(`客户预算 ¥${a.budget_cny} 低于建议价，可提供精简方案`);
  return { cny: base, usd: Math.round(base / 7.1), rationale: why };
}

async function askJSON(prompt, fallback) {
  const r = await gigAgent.generate(prompt + '\nReturn ONLY a JSON object, no markdown.');
  const m = r.text.match(/\{[\s\S]*\}/);
  try { return { ...fallback, ...JSON.parse(m[0]) }; } catch {}
  // Small models sometimes emit almost-valid JSON. Recover the fields one by one.
  const out = { ...fallback }, t = r.text;
  for (const k of Object.keys(fallback)) {
    const sm = t.match(new RegExp(`"${k}"\\s*:\\s*"([^"\\n]*?)["”]?\\s*[,}\\n]`));
    const am = t.match(new RegExp(`"${k}"\\s*:\\s*\\[([\\s\\S]*?)\\]`));
    const bm = t.match(new RegExp(`"${k}"\\s*:\\s*(true|false|null|\\d+)`));
    if (am) out[k] = [...am[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
    else if (bm) out[k] = JSON.parse(bm[1]);
    else if (sm) out[k] = sm[1].trim();
  }
  return out;
}
const ask = async p => (await gigAgent.generate(p)).text.trim().replace(/^(okay|sure|here(’|')?s|here are)[^\n]*\n+/i, '').replace(/\n+-{3,}[\s\S]*$/, '');

const analyze = createStep({
  id: 'analyze', inputSchema: z.object({ brief: z.string() }), outputSchema: z.any(),
  execute: async ({ inputData: { brief } }) => {
    const a = await askJSON(`Analyze this logo design brief.\nBRIEF:\n${brief}\nJSON keys: brand_name (string), industry (string), style_keywords (array of strings), needs_vi (boolean, true if VI/brand kit/packaging/business cards requested), complexity ("low"|"medium"|"high"), urgent (boolean), budget_cny (number or null), summary_zh (one sentence in Chinese).`,
      { brand_name: '', industry: '', style_keywords: [], needs_vi: false, complexity: 'medium', urgent: false, budget_cny: null, summary_zh: '' });
    // Guard against small-model misses with simple rules.
    a.needs_vi = /\bvi\b|VI|名片|包装|brand kit|brand identity|business card|packaging|全套/i.test(brief); // rule-based, more reliable than a 1B model
    a.urgent = /加急|急单|urgent|asap|24\s?h|明天|今天/i.test(brief);
    const bm = brief.match(/预算[^\d]{0,6}(\d{2,6})/); if (bm) a.budget_cny = +bm[1];
    const um = brief.match(/\$\s?(\d{2,5})/); if (um && !bm) a.budget_cny = Math.round(+um[1] * 7.1);
    if (typeof a.budget_cny === 'string') a.budget_cny = parseInt(a.budget_cny) || null;
    if (!a.brand_name) a.brand_name = (brief.match(/[「"“]([^」"”]{1,40})[」"”]/) || [,''])[1];
    return { brief, analysis: a };
  },
});
const price = createStep({
  id: 'quote', inputSchema: z.any(), outputSchema: z.any(),
  execute: async ({ inputData }) => ({ ...inputData, quote: quote(inputData.analysis), cases: matchCases(inputData.brief) }),
});
const write = createStep({
  id: 'write', inputSchema: z.any(), outputSchema: z.any(),
  execute: async ({ inputData: d }) => {
    const ctx = `Brand: ${d.analysis.brand_name}; industry: ${d.analysis.industry}; style: ${(d.analysis.style_keywords||[]).join(', ')}; price ¥${d.quote.cny} (~$${d.quote.usd}); relevant past work from MY OWN portfolio (not the client's): ${d.cases.map(c => c.title).join(' / ')}; English names: ${d.cases.map(c => (c.title.match(/[A-Z][A-Z ]{2,}/)||[c.title.split(' ')[0]])[0].trim()).join(' / ')}.`;
    let [bid_zh, bid_en, checklist, prompts] = await Promise.all([
      ask(`用中文写一段80-120字的投标文案给客户。${ctx} 提到相关案例，报价¥${d.quote.cny}，承诺3天内交初稿、含2次修改（尚未开始设计，不要说已完成）。全文只用中文（品牌名除外），语气真诚，不要自称经验丰富/资深，以个人设计师「Hongpeng」署名，不要使用方括号占位符，不要编造口碑。只输出文案。`),
      ask(`Write a 70-100 word bid message in English to the client. ${ctx} Mention one relevant past project, price $${d.quote.usd} (quote in USD only, no ¥), promise first drafts within 3 days and 2 revision rounds (work has NOT started yet; do not claim drafts exist). Sign as "Hongpeng". Honest, no hype, do not call yourself experienced. English only (no Chinese characters; use the English brand name). Output only the message.`),
      ask(`List 6-8 concrete deliverables (file formats, versions) for this logo job as a markdown checklist using "- [ ]". ${ctx} needs VI: ${d.analysis.needs_vi}. Output only the list.`),
      ask(`Give 3 distinct logo concept prompts for an image generator, numbered, one line each, in English. ${ctx}`),
    ]);
    const fix = t => t.replace(/\[[^\]\n]{1,30}\]/g, m => /client|name|company|客户|公司|姓名/i.test(m) ? (d.analysis.brand_name || 'there') : '').replace(/\s*\((?:available )?(?:at|on)\s*\)/gi, '');
    const zhClean = t => t.replace(/[，,]?\s*(?:是)?一位(?:经验丰富|资深|专业)的/g, '，一位').replace(/经验丰富的?|资深的?|顶级的?/g, '')
      .replace(/^\s*(Sincerely|Best regards|Regards),?\s*$/gim, '此致').replace(/Brand:\s*/g, '品牌：').replace(/\bMinimal(?:ist)?(?:主义)?/gi, '简约').replace(/\bearthy\b/gi, '大地色').replace(/\borganic\b/gi, '自然')
      .replace(/\n\s*(Lumen|[A-Z][\w ]{0,30})\s*$/, '').replace(/\n{3,}/g, '\n\n').trim();
    const enClean = t => t.replace(/[\u4e00-\u9fa5（）｜·]+/g, ' ').replace(/\s+([,.)])/g, '$1').replace(/[ \t]{2,}/g, ' ')
      .replace(/¥\s?\d+\s*(?:USD)?\s*\((?:approximately|approx\.?|~|about)?\s*(\$\d+)(?:\s*USD)?\)/gi, '$1').replace(/¥\s?\d+\s*USD/gi, `$${d.quote.usd}`).replace(/¥\s?\d+/g, `$${d.quote.usd}`)
      .replace(/\b(highly )?experienced\b ?/gi, '').replace(/As an? [\w ]*assistant,?\s*/gi, '').replace(/\s*\(\s*\)/g, '').replace(/\s*[–-]\s*’s/g, '’s')
      .replace(/[^.\n]*(drafts? (are|is) (currently )?(in progress|not yet)|no drafts exist|not yet completed)[^.\n]*\.\s*/gi, '').replace(/[ \t]{2,}/g, ' ').trim();
    const ckClean = t => t.split('\n').map(l => l.replace(/\*\*/g, '').match(/^\s*(?:[-*•]|\d+[.)])\s*(?:\[\s?[xX ]?\s?\])?\s*(.+)$/)).filter(Boolean).map(m => '- [ ] ' + m[1].trim()).join('\n');
     checklist = ckClean(checklist);
    bid_zh = zhClean(fix(bid_zh)); bid_en = enClean(fix(bid_en));
    return { ...d, bid_zh, bid_en, checklist, prompts };
  },
});
export const gigWorkflow = createWorkflow({ id: 'gigpitch', inputSchema: z.object({ brief: z.string() }), outputSchema: z.any() })
  .then(analyze).then(price).then(write).commit();

export async function runGig(brief) {
  const run = await gigWorkflow.createRun();
  const r = await run.start({ inputData: { brief } });
  if (r.status !== 'success') throw new Error('workflow ' + r.status + ': ' + JSON.stringify(r.error || r).slice(0, 300));
  return r.result;
}
