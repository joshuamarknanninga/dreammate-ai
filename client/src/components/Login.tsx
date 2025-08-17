import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login({ setToken }: { setToken: (t: string) => void }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { token } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      localStorage.setItem('token', token);
      setToken(token);
      nav('/chat');
    } catch (e: any) {
      setErr('Login failed');
    }
  };

  return (
    <div className="card">
      <h3>Login</h3>
      <form onSubmit={onSubmit}>
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn">Sign in</button>
      </form>
      {err && <div className="small">{err}</div>}
      <div className="small">No account? <Link to="/register">Register</Link></div>
    </div>
  );
}
