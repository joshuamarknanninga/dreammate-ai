import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Register({ setToken }: { setToken: (t: string) => void }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [display_name, setName] = React.useState('');
  const [age, setAge] = React.useState<number | ''>('');
  const [err, setErr] = React.useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      const { token } = await api('/api/auth/register', { method: 'POST', body: { email, password, display_name, age: age ? Number(age) : null } });
      localStorage.setItem('token', token);
      setToken(token);
      nav('/chat');
    } catch {
      setErr('Registration failed (email in use?)');
    }
  };

  return (
    <div className="card">
      <h3>Create account</h3>
      <form onSubmit={onSubmit}>
        <input className="input" placeholder="Display name" value={display_name} onChange={e=>setName(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="number" placeholder="Age (optional)" value={age} onChange={e=>setAge(e.target.value ? Number(e.target.value) : '')} />
        <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn">Register</button>
      </form>
      {err && <div className="small">{err}</div>}
      <div className="small">Already have an account? <Link to="/">Login</Link></div>
    </div>
  );
}
