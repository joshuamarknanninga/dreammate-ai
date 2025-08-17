# dreammate-ai
# DreamMate AI — MVP

## Run it locally

1) Backend
- Copy `.env.example` to `server/.env` and fill keys.
- Install & seed:
  ```bash
  cd server
  npm i
  npm run db:seed
  npm run dev


---

## What’s “MVP” here (and how to extend fast)
- ✅ Chat loop with OpenAI (and a micro tool-calling pattern).
- ✅ Structured memories (SQLite) and minimal retrieval hinting.
- ✅ Safety check by age + banned-term filter.
- ✅ Stripe upgrade flow + webhook to set `is_premium=1`.
- ✅ PWA: users can install it on desktop/mobile.

**Next 1–2 hour upgrades (resume candy):**
- Add a **“Memories” list** panel + delete button.
- Add **rate-limits** for free vs premium (e.g., 30/day vs unlimited).
- Store short **conversation summaries** into memory automatically.
- Add a second tool: `{"tool":"get_time"}` → returns server time (easy demo).

---

If you want, I can also zip this into copy-paste gists or tailor it to **Render** deploy right now. Either way—you’ve got a shippable, résumé-ready MVP. Let’s make the “DreamMate”… dream real. 🚀
