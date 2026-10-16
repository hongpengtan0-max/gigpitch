# GigPitch 🎯

**A local bid assistant for freelance designers.** Paste a gig brief from 猪八戒, Upwork, Fiverr, or anywhere else. GigPitch returns:

1. **Brief analysis**: brand, industry, style keywords, whether VI is needed, urgency, budget
2. **Quote suggestion**: computed by transparent pricing rules (not invented by the model), with the reasoning shown
3. **Bilingual bid text**: one Chinese and one English draft, citing your *own* matched portfolio cases
4. **Deliverables checklist**: file formats and versions
5. **Logo prompt ideas**: three concepts for an image generator

Everything runs **on your own machine**: [Gemma 3](https://ai.google.dev/gemma) (open weights) served by [Ollama](https://ollama.com), orchestrated by a [Mastra](https://mastra.ai) workflow. No API keys, no per-token bills, and client briefs never leave the machine.

Built for the DEV × Hacktoberfest 2026 Open-Source AI Challenge, Week 2 ("Side Hustle").

## Architecture

```
brief ─▶ [Mastra step: analyze]  Gemma 3 → JSON (tolerant parser + rule guards)
      ─▶ [Mastra step: quote]    deterministic pricing + portfolio retrieval (cases.md)
      ─▶ [Mastra step: write]    4 parallel Gemma calls: zh bid, en bid, checklist, prompts
```

- `src/agent.js`: Mastra `Agent` (Gemma via `ollama-ai-provider-v2`), the three `createStep`s, and `createWorkflow`
- `src/server.js`: Express API (`POST /api/pitch`) plus the static UI
- `public/index.html`: a minimal single-page UI
- `src/e2e.js`: end-to-end test (`npm test`)

## Run

```bash
# 1. Ollama and the model (gemma3:1b fits in about 1 GB of RAM; use gemma3:4b if you have 6 GB or more free)
ollama pull gemma3:1b
# 2. App
npm install
npm start            # http://127.0.0.1:4111
npm test             # end-to-end workflow run
```

Environment variables: `GIGPITCH_MODEL` (default `gemma3:1b`), `OLLAMA_URL`, `PORTFOLIO_MD` (path to your cases markdown, using `## title` blocks with a `设计说明：` line) (defaults to `cases.md` in the repo root), and `PORT`.

On a CPU-only 8-vCPU box, a full pitch takes about 20 seconds with `gemma3:1b`.

## Honest limits

A 1B model sometimes produces malformed JSON or generic phrasing. GigPitch handles this by parsing tolerantly, applying rule-based guards (VI, urgency, budget, brand name), and keeping prices deterministic. **Always read a bid before sending it.**

## License

MIT, see [LICENSE](LICENSE).
