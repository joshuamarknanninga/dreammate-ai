import React from 'react';
import { api } from '../api';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Chat({ token, me }: { token: string; me: any }) {
  const [input, setInput] = React.useState('');
  const [msgs, setMsgs] = React.useState<Msg[]>([]);

  const send = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setMsgs(m => [...m, { role: 'user', content: text }]);
    setInput('');
    try {
      const { reply } = await api('/api/chat', { method: 'POST', token, body: { message: text } });
      setMsgs(m => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Oops—something went sideways.' }]);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h3>Chat with {me?.display_name || 'Your DreamMate'}</h3>
        <span className="small">{me?.is_premium ? 'Premium features enabled' : 'Free tier'}</span>
      </div>

      <div style={{ minHeight: 260, margin: '1rem 0' }}>
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'user' ? 'me' : 'ai'}`}>{m.content}</div>
        ))}
      </div>

      <div className="row">
        <input className="input" placeholder="Say hi..." value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} />
        <button className="btn" onClick={send}>Send</button>
      </div>

      <div className="small" style={{ marginTop: '.75rem' }}>
        Tip: say “remember that I like cozy bedtime stories” — the model will drop a tiny JSON tool-call and I’ll store it.
      </div>
    </div>
  );
}
