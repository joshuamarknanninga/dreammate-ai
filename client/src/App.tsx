import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import TopBar from './components/TopBar';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import Premium from './components/Premium';
import Settings from './components/Settings';

export default function App() {
  const [token, setToken] = React.useState<string | null>(() => localStorage.getItem('token'));
  const [me, setMe] = React.useState<any>(null);
  const nav = useNavigate();

  React.useEffect(() => {
    const t = localStorage.getItem('token');
    if (t) {
      fetch((import.meta as any).env.VITE_API_URL ?? 'http://localhost:4000' + '/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` }
      }).then(r => r.json()).then(setMe).catch(() => setMe(null));
    }
  }, [token]);

  const onLogout = () => { localStorage.removeItem('token'); setToken(null); setMe(null); nav('/'); };

  return (
    <div className="container">
      <TopBar me={me} onLogout={onLogout} />
      <Routes>
        <Route path="/" element={token ? <Chat token={token} me={me} /> : <Login setToken={setToken} />} />
        <Route path="/register" element={<Register setToken={setToken} />} />
        <Route path="/chat" element={token ? <Chat token={token} me={me} /> : <Login setToken={setToken} />} />
        <Route path="/premium" element={token ? <Premium token={token} me={me} /> : <Login setToken={setToken} />} />
        <Route path="/settings" element={token ? <Settings token={token} me={me} setMe={setMe} /> : <Login setToken={setToken} />} />
        <Route path="*" element={<div className="card">Not found. <Link to="/">Go home</Link></div>} />
      </Routes>
    </div>
  );
}
