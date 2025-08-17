export function registerSW() {
  // Enable SW only in production; in dev, unregister & clear caches to keep HMR happy.
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.error('SW registration failed:', err));
    });
  } else {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then(rs => rs.forEach(r => r.unregister()))
        .catch(() => {});
    }
    if ('caches' in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
    }
  }
}
