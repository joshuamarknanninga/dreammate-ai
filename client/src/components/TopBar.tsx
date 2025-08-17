import React from 'react';
import { Link } from 'react-router-dom';

export default function TopBar({ me, onLogout }: { me: any; onLogout: () => void }) {
  return (
    <div className="header">
      <h2>DreamMate <span className="small">MVP</span></h2>
      <nav style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
        {me && <span className="badge">{me.is_premium ? 'Premium' : 'Free'}</span>}
        <Link to="/">Chat</Link>
        <Link to="/premium">Go Premium</Link>
        <Link to="/settings">Settings</Link>
        {me ? <button className="btn" style={{ width: 'auto', padding: '.5rem .8rem' }} onClick={onLogout}>Logout</button> : <Link to="/register">Register</Link>}
      </nav>
    </div>
  );
}
