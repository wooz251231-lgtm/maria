// 서비스워커 — 오프라인 + 자동 갱신
// 구조를 크게 바꿀 때 아래 버전 숫자를 올리면 옛 캐시가 정리됩니다.
const CACHE = 'prayers-v2';

// 캐시 우선으로 둘 정적 자원(잘 안 바뀌는 것)
const STATIC = [
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (e)=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)).catch(()=>{}));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(
      keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
    )).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (e)=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  const isContent = req.mode==='navigate'
    || /\/(index\.html|data\.js)$/.test(url.pathname)
    || url.pathname.endsWith('/');

  if(isContent){
    // 콘텐츠: 네트워크 우선 → 최신 반영, 실패 시 캐시
    e.respondWith(
      fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }).catch(()=> caches.match(req).then(r=> r || caches.match('./index.html')))
    );
  } else {
    // 정적 자원: 캐시 우선
    e.respondWith(
      caches.match(req).then(r=> r || fetch(req).then(res=>{
        const copy = res.clone();
        caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
        return res;
      }))
    );
  }
});
