# GigPitch demo script (target 1:30)

**0:00–0:15, the hook.** (Screen: 猪八戒 contest list, or text on screen) "Since October 4, I entered 15 logo contests on 猪八戒. Won zero. Earned ¥0. Most of my time went into reading briefs and writing bids, not designing."

**0:15–0:25, the product.** (Screen: GigPitch input, 01_input.png) "So I built GigPitch: a bid assistant that runs fully on my own machine, using Gemma 3 through Ollama and orchestrated by Mastra."

**0:25–0:55, live run 1 (Chinese brief).** Click "Generate pitch" on the coffee-shop brief. While it runs, about 20 seconds: "No API key, nothing leaves this laptop." Then point at the cards:
- the analysis
- ¥909 with each pricing rule shown, and the warning that the client's ¥800 budget is too low
- matched cases from my portfolio
- the Chinese and English bids
- the checklist and logo prompts

**0:55–1:10, live run 2 (English brief).** Paste the Lumen Yoga brief: a $60 budget, logo only, ASAP. It shows the rush multiplier, no VI, and a US-dollar bid.

**1:10–1:25, under the hood.** (Screen: src/agent.js) "Three Mastra steps: analyze, a deterministic quote, then four parallel Gemma calls. The model never sets the price."

**1:25–1:30, close.** "Open weights keep the cost at zero and client data private. GigPitch: MIT licensed, link below. This is my DEV Hacktoberfest Week 2 submission."

Recording tips: 1100×900 browser window, start `npm start` beforehand, and warm up the model with one run so the live runs stay near 20 seconds.
