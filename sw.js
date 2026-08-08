/**
 * AlgoLens Service Worker
 * 策略：
 *   - 安装时预缓存所有核心资源
 *   - Cache-First：优先使用缓存，无缓存时回退到网络
 *   - 网络请求成功后更新缓存（stale-while-revalidate）
 */
const CACHE_VERSION = 'algolens-v1.4.6';
const CACHE_NAME = CACHE_VERSION;
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './styles/main.css',
    './styles/components.css',
    './styles/algorithms.css',
    './js/core/store.js',
    './js/core/renderer.js',
    './js/core/layoutEngine.js',
    './js/core/tracer.js',
    './js/core/animator.js',
    './js/core/codeRegistry.js',
    './js/core/algorithmLoader.js',
    './js/core/stateBuilders.js',
    './js/ui/codeViewer.js',
    './js/ui/sidebar.js',
    './js/ui/controls.js',
    './js/ui/themeSwitcher.js',
    './js/ui/toast.js',
    './js/ui/shortcut.js',
    './js/algorithms/sorting.js',
    './js/algorithms/linear.js',
    './js/algorithms/tree.js',
    './js/algorithms/graph.js',
    './js/algorithms/string_classic.js',
    './js/algorithms/p1_algorithms.js',
    './js/algorithms/p2_algorithms.js',
    './js/algorithms/p3_algorithms.js',
    './js/algorithms/advanced_algorithms.js',
    './js/app.js'
];

// 安装：预缓存（逐资源容错，单个失败不影响整体安装）
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            Promise.allSettled(PRECACHE_URLS.map(url =>
                cache.add(url).catch(err => {
                    console.warn('[SW] 预缓存失败:', url, err);
                })
            ))
        ).then(() => self.skipWaiting())
    );
});

// 激活：清理旧缓存
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// 拦截请求：Cache-First + 后台更新
self.addEventListener('fetch', event => {
    const req = event.request;
    // 只处理 GET 请求
    if (req.method !== 'GET') return;
    // 跨域请求不处理
    const url = new URL(req.url);
    if (url.origin !== location.origin) return;

    event.respondWith(
        caches.match(req).then(cached => {
            const fetchPromise = fetch(req).then(response => {
                // 仅缓存有效的响应
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
                }
                return response;
            }).catch(() => cached);
            // 优先返回缓存，否则等待网络
            return cached || fetchPromise;
        })
    );
});

// 接收消息：允许页面主动触发更新
self.addEventListener('message', event => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});
