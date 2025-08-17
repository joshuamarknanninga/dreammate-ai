import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import Stripe from 'stripe';

const {
  PORT = 4000,
  OPENAI_API_KEY,
  JWT_SECRET = 'changeme',
  STRIPE_SECRET_KEY,
  STRIPE_PRICE_ID,
  STRIPE_WEBHOOK_SECRET,
  CLIENT_URL = 'http://localhost:5173',
  SYSTEM_NAME = 'DreamMate'
} = process.env;

if (!OPENAI_API_KEY) console.warn('WARN: OPENAI_API_KEY not set');
if (!STRIPE_SECRET_KEY) console.warn('WARN: STRIPE_SECRET_KEY not set');

const stripe = new Stripe(STRIPE_SECRET_KEY ?? '', { apiVersion: '2023-10-16' });
const app = express();
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// --- DB init ---
import fs from 'node:fs';
import path from 'node:path';
const dbPath = path.join(process.cwd(), 'dreammate.db');
const needSchema = !fs.existsSync(dbPath);
const db = new Database(dbPath);
if (needSchema) {
  const schema = fs.readFileSync(path.join(process.cwd(), 'schema.sql'), 'utf8');
  db.exec(schema);
}

// --- helpers ---
function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
}
function auth(req, res, next) {
  const authz = req.headers.authorization;
  if (!authz) return res.status(401).json({ error: 'No auth header' });
  const token = authz.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function safetyCheck(age, text) {
  const under18 = Number(age) && Number(age) < 18;
  const banned = /(nsfw|explicit|sexual|porn|erotic|fetish|violence|gore)/i;
  if (under18 && banned.test(text)) {
    return { allowed: false, reason: 'Age-restricted content blocked for minors.' };
  }
  return { allowed: true };
}

// Tiny “tool-calling” contract: model may respond with ONLY JSON like:
// {"tool":"save_memory","args":{"kind":"preference","content":"Loves cozy bedtime prompts","tags":"sleep,cozy"}}
function looksLikeTool(jsonText) {
  try {
    const obj = JSON.parse(jsonText);
    return obj && typeof obj === 'object' && typeof obj.tool === 'string' && obj.args;
  } catch { return false; }
}

// --- Auth routes ---
app.post('/api/auth/register', async (req, res) => {
  const { email, password, display_name, age } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email & password required' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (email, password_hash, display_name, age) VALUES (?,?,?,?)');
    const info = stmt.run(email, hash, display_name ?? null, age ?? null);
    const user = { id: info.lastInsertRowid, email, display_name, age, is_premium: 0 };
    return res.json({ token: signToken(user), user });
  } catch (e) {
    return res.status(409).json({ error: 'Email already registered' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  return res.json({
    token: signToken(user),
    user: { id: user.id, email: user.email, display_name: user.display_name, age: user.age, is_premium: !!user.is_premium }
  });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,email,display_name,age,is_premium FROM users WHERE id=?').get(req.user.id);
  return res.json(user);
});

app.post('/api/auth/me', auth, (req, res) => {
  const { display_name, age } = req.body;
  db.prepare('UPDATE users SET display_name=?, age=? WHERE id=?').run(display_name ?? null, age ?? null, req.user.id);
  const user = db.prepare('SELECT id,email,display_name,age,is_premium FROM users WHERE id=?').get(req.user.id);
  return res.json(user);
});

// --- Memories ---
app.get('/api/memories', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM memories WHERE user_id=? ORDER BY id DESC LIMIT 50').all(req.user.id);
  res.json(rows);
});
app.post('/api/memories', auth, (req, res) => {
  const { kind = 'chat_note', content, tags = '' } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const info = db.prepare('INSERT INTO memories (user_id, kind, content, tags) VALUES (?,?,?,?)')
    .run(req.user.id, kind, content, tags);
  res.json({ id: info.lastInsertRowid, kind, content, tags });
});

// --- Chat (OpenAI) ---
async function callOpenAI(messages, { system, temperature = 0.7 }) {
  const body = {
    model: 'gpt-4o-mini',
    temperature,
    messages: [
      { role: 'system', content: system },
      ...messages
    ]
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const e = await resp.text();
    throw new Error(`OpenAI error: ${e}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content ?? '';
  return text;
}

app.post('/api/chat', auth, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const safe = safetyCheck(user.age, message);
    if (!safe.allowed) return res.status(400).json({ error: safe.reason });

    // Pull a few recent memories and last few messages
    const memories = db.prepare('SELECT kind,content,tags FROM memories WHERE user_id=? ORDER BY id DESC LIMIT 5').all(user.id);
    const history = db.prepare('SELECT role,content FROM messages WHERE user_id=? ORDER BY id DESC LIMIT 12').all(user.id).reverse();

    // Save user message
    db.prepare('INSERT INTO messages (user_id, role, content) VALUES (?,?,?)').run(user.id, 'user', message);

    const toolsSpec = `
You are ${SYSTEM_NAME}, a friendly AI companion.
SAFETY:
- If user is under 18, refuse or redirect NSFW/explicit requests.
MEMORY TOOL-CALLING:
- When you want to store a durable fact, reply ONLY with JSON:
  {"tool":"save_memory","args":{"kind":"preference|profile|chat_note","content":"...", "tags":"comma,words"}}
- Otherwise, reply normally with text.
TONE: Warm, encouraging, and age-appropriate. Keep it helpful.
If asked about premium-only features and user is not premium, mention upgrade lightly.
Current user premium: ${user.is_premium ? 'yes' : 'no'}.
Recent memories: ${JSON.stringify(memories)}.
`;

    // First model pass
    let ai = await callOpenAI(
      [
        ...history,
        { role: 'user', content: message }
      ],
      { system: toolsSpec }
    );

    // Tool path?
    if (looksLikeTool(ai)) {
      const call = JSON.parse(ai);
      if (call.tool === 'save_memory') {
        const { kind = 'chat_note', content, tags = '' } = call.args || {};
        if (content && typeof content === 'string') {
          db.prepare('INSERT INTO memories (user_id, kind, content, tags) VALUES (?,?,?,?)')
            .run(user.id, kind, content, tags);
        }
        // Second turn: confirm back in natural language
        const confirm = await callOpenAI(
          [
            ...history,
            { role: 'user', content: message },
            { role: 'tool', content: `Saved memory: ${JSON.stringify(call.args)}` }
          ],
          { system: toolsSpec }
        );
        ai = confirm;
      }
    }

    // Safety on output for minors
    const outSafe = safetyCheck(user.age, ai);
    const finalText = outSafe.allowed ? ai : 'I can’t discuss that—let’s switch to a safe topic.';

    // Save assistant message
    db.prepare('INSERT INTO messages (user_id, role, content) VALUES (?,?,?)').run(user.id, 'assistant', finalText);

    res.json({ reply: finalText });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// --- Stripe: create Checkout session ---
app.post('/api/stripe/create-checkout-session', auth, async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${CLIENT_URL}/?success=1`,
      cancel_url: `${CLIENT_URL}/?canceled=1`,
      metadata: { userId: String(req.user.id) }
    });
    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Stripe session error' });
  }
});

// --- Stripe webhook ---
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = Number(session.metadata?.userId);
    if (userId) {
      db.prepare('UPDATE users SET is_premium=1 WHERE id=?').run(userId);
    }
  }
  res.json({ received: true });
});

// Health
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Start
app.listen(PORT, () => {
  console.log(`Server on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: POST /api/stripe/webhook`);
});
