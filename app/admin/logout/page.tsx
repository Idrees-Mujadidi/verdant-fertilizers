'use client';
export default function Logout(){return <main className="auth-card"><h1>Sign out?</h1><button className="btn primary" onClick={async()=>{await fetch('/api/admin/session',{method:'DELETE'});location.replace('/admin/login')}}>Sign out</button><a href="/admin">Back to dashboard</a></main>}
