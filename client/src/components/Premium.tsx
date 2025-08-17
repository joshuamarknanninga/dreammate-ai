import React from 'react';
import { api } from '../api';

export default function Premium({ token, me }: { token: string; me: any }) {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const go = async () => {
    setLoading(true); setErr(null);
    try {
      const { url } = await api('/api/stripe/create-checkout-session', { method: 'POST', token });
      window.location.href = url;
    } catch {
      setErr('Could not start checkout.');
    } finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3>Premium</h3>
      {me?.is_premium ? (
        <div>You’re already Premium 🎉</div>
      ) : (
        <>
          <p>Unlock longer chats, richer memory, and extra tools.</p>
          <button className="btn" onClick={go} disabled={loading}>{loading ? 'Starting…' : 'Upgrade via Stripe'}</button>
          {err && <div className="small">{err}</div>}
        </>
      )}
    </div>
  );
}
