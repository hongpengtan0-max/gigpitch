---
title: "GigPitch: I lost 15 logo contests in a row, so I built a local AI that writes my bids"
published: false
tags: devchallenge, hf26challenge, ai, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

## What I Built

Since October 4, I've been trying to earn my first money as a freelance logo designer on 猪八戒 (Zhubajie), China's largest gig marketplace. I entered **15 logo design contests (比稿)** and won **zero** of them. Total earnings: **¥0**.

Looking back, the designs weren't the main problem. The problem was everything around them: reading vague briefs, guessing a price, and writing the same bid again and again in Chinese and English, often at 2 a.m. Every losing contest cost me an hour of unpaid admin work.

**GigPitch** is the tool I wish I'd had from day one. You paste a gig brief from 猪八戒, Upwork, Fiverr, or anywhere else, and about 20 seconds later you get:

1. **Brief analysis**: brand, industry, style keywords, whether VI or packaging is needed, urgency, and budget
2. **A quote suggestion**: calculated by transparent rules, with every line of the reasoning shown, and a warning when the client's budget is below it
3. **Bilingual bid text** in 中文 and English, citing *my own* most relevant portfolio cases
4. **A deliverables checklist** (formats and versions), so scope is clear before the client says yes
5. **Three logo concept prompts** to kick off the actual design

**Who would pay for it?** Solo designers and small studios who bid on many small jobs. Saving 30 to 45 minutes per bid is worth far more than a small monthly fee, and because the tool runs locally, it costs almost nothing to operate.

## Demo

<!-- TODO: {% embed <video URL> %} (docs/demo.mp4, 1:55, no voice-over: captions only) -->

![GigPitch result for a coffee-shop brief](SCREENSHOT_02)
![GigPitch result for an English yoga-studio brief](SCREENSHOT_03)

## Code

<!-- TODO: {% embed https://github.com/<user>/gigpitch %} -->

MIT licensed. Run it with `ollama pull gemma3:1b && npm install && npm start`.

## How I Built It

- **Model:** Gemma 3 (open weights), run **locally with Ollama**. I used `gemma3:1b` because my box only had about 3 GB of free RAM, and it runs CPU-only at roughly 44 tokens per second. With more memory, switching to `gemma3:4b` is a single environment variable.
- **Orchestration: Mastra.** GigPitch is a Mastra `createWorkflow` with three `createStep`s around a Mastra `Agent` backed by Gemma (via `ollama-ai-provider-v2`):
  1. `analyze`: Gemma extracts structured JSON from the brief.
  2. `quote`: a **deterministic** pricing function plus retrieval from my portfolio file (`cases.md`). I deliberately kept money out of the model's hands.
  3. `write`: four Gemma calls in parallel (Chinese bid, English bid, checklist, prompts).
- **Making a 1B model reliable.** Small models return almost-valid JSON (I got a stray curly quote `”` that broke `JSON.parse`) and sometimes miss obvious facts. The fixes:
  - a tolerant, field-by-field JSON recovery parser
  - rule-based guards for VI, urgency, budget (including `$` budgets converted to ¥), and brand names in 「」 or quotes
  - prompt rules plus post-filters: no self-praise like "经验丰富" or "experienced", no Chinese characters in the English bid, prices in the right currency, one `- [ ]` checklist format, no `[Client Name]` placeholders, and no claims that drafts already exist
- **UI:** one HTML file and a small Express endpoint. `npm test` runs the whole workflow end to end.

## Why Does Open Innovation Matter?

- **Cost decides whether the business works.** My actual revenue so far is ¥0. A side hustle that loses money on API calls before it lands its first client is not a side hustle. With open weights on my own CPU, each extra bid costs nothing.
- **Client data stays private.** Briefs include unreleased brand names and business plans. Nothing leaves the machine, which I can tell clients truthfully.
- **No lock-in, works across borders.** I'm moving between China and the US, and not every closed API works or bills smoothly in both places. Ollama + Gemma + Mastra works the same anywhere and keeps working even if a vendor changes its pricing.
- **Small models are good enough when the system is designed well.** With deterministic pricing and rule guards, a 1B open model handles a real niche task, and I can fine-tune it later on my own winning bids.

## Prize Categories

- **Best Use of Mastra**: the whole pipeline is a Mastra workflow (`createWorkflow` / `createStep`) around a Mastra `Agent` on an open model.
- **Best Use of Gemma**: Gemma 3 runs locally through Ollama and handles every language task.

*Built with help from an AI coding assistant; I directed the design and tested the outputs.*
