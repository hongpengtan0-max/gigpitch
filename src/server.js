import express from 'express';
import { runGig, MODEL } from './agent.js';
const app = express(); app.use(express.json()); app.use(express.static(new URL('../public', import.meta.url).pathname));
app.post('/api/pitch', async (req, res) => {
  try { const t = Date.now(); res.json({ ...(await runGig(String(req.body.brief || ''))), ms: Date.now() - t, model: MODEL }); }
  catch (e) { res.status(500).json({ error: String(e.message || e) }); }
});
const port = process.env.PORT || 4111; app.listen(port, '127.0.0.1', () => console.log('GigPitch on http://127.0.0.1:' + port));
