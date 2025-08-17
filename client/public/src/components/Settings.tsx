import React from 'react';
import { api } from '../api';

export default function Settings({ token, me, setMe }: { token: string; me: any; setMe: (m:any)=>void }) {
  const [display_name, setName] = React.useState(me?.display_name ?? '');
  const [age, setAge] = React.useState<number | ''>(me?.age ?? '');

  const save = async () => {
    const data = await api('/api/auth/me', { method: 'POST', token, body: { display_name, age: age? Number(age): null } });
    setMe(data);
  };

  return (
    <div className="card">
      <h3>Settings</h3>
      <input className="input" placeholder="Display name" value={display_name} onChange={e=>setName(e.target.value)} />
      <input className="input" type="number" placeholder="Age" value={age} onChange={e=>setAge(e.target.value? Number(e.target.value) : '')} />
      <button className="btn" onClick={save}>Save</button>
      <p className="small">Age enables safety mode. Under 18 gets stricter filters.</p>
    </div>
  );
}
