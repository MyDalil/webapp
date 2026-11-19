/* DALIL — service worker minimal, écrit à la main (sans dépendance).
 * - page hors ligne pré-cachée (/offline.html) ;
 * - navigations : réseau d’abord, repli sur les 30 dernières pages publiques consultées, puis sur la page hors ligne ;
 * - /_next/static (fichiers versionnés) : cache d’abord ;
 * - jamais de cache pour les espaces privés, l’API, OAuth, ni pour un visiteur connecté (en-tête X-Dalil-Session).
 * Règles pures (cacheRule, storable) testées par src/platform/shell/sw.test.ts.
 */
var VERSION = 'v1'
var PREFIX = 'dalil-'
var PAGES = PREFIX + 'pages-' + VERSION
var STATIC = PREFIX + 'static-' + VERSION
var OFFLINE = PREFIX + 'offline-' + VERSION
var OFFLINE_URL = '/offline.html'
var MAX_PAGES = 30
var MAX_STATIC = 150

/** Chemins jamais mis en cache (dans les trois langues : /x, /en/x, /ar/x). */
var PRIVATE = [
  '/admin',
  '/api',
  '/oauth',
  '/.well-known',
  '/connexion',
  '/mon-compte',
  '/espace',
  '/espace-pro',
  '/annonces/messagerie',
  '/annonces/deposer',
  '/onboarding',
  '/missions',
  '/visio',
]

function isPrivatePath(pathname) {
  var path = pathname.replace(/^\/(?:fr|en|ar)(?=\/|$)/, '') || '/'
  for (var i = 0; i < PRIVATE.length; i++) {
    var p = PRIVATE[i]
    if (path === p || path.indexOf(p + '/') === 0) return true
  }
  return false
}

/** 'static' (cache d’abord), 'page' (réseau d’abord) ou 'bypass' (le navigateur fait comme sans service worker). */
function cacheRule(req) {
  if (req.method !== 'GET') return 'bypass'
  var url = new URL(req.url)
  if (url.origin !== req.origin) return 'bypass'
  if (url.pathname.indexOf('/_next/static/') === 0) return 'static'
  if (req.mode !== 'navigate') return 'bypass'
  if (isPrivatePath(url.pathname)) return 'bypass'
  return 'page'
}

/** Une réponse ne se garde que si elle est complète, du site même, et sans session. */
function storable(res) {
  if (!res || res.status !== 200 || res.type !== 'basic' || res.redirected) return false
  return !res.headers.get('x-dalil-session')
}

function trim(name, max) {
  return caches.open(name).then(function (cache) {
    return cache.keys().then(function (keys) {
      var extra = keys.length - max
      var jobs = []
      for (var i = 0; i < extra; i++) jobs.push(cache.delete(keys[i]))
      return Promise.all(jobs)
    })
  })
}

function remember(name, max, req, res) {
  return caches.open(name).then(function (cache) {
    // Supprimer puis remettre : l’entrée repasse en dernière position (les plus anciennes partent en premier).
    return cache
      .delete(req)
      .then(function () { return cache.put(req, res) })
      .then(function () { return trim(name, max) })
  })
}

function page(event) {
  var req = event.request
  var network = Promise.resolve(event.preloadResponse).then(function (pre) { return pre || fetch(req) })
  return network
    .then(function (res) {
      if (storable(res)) event.waitUntil(remember(PAGES, MAX_PAGES, req, res.clone()).catch(function () {}))
      return res
    })
    .catch(function () {
      return caches.match(req, { cacheName: PAGES }).then(function (hit) {
        return hit || caches.match(OFFLINE_URL, { cacheName: OFFLINE })
      }).then(function (hit) {
        return hit || Response.error()
      })
    })
}

function asset(event) {
  var req = event.request
  return caches.match(req, { cacheName: STATIC }).then(function (hit) {
    if (hit) return hit
    return fetch(req).then(function (res) {
      if (storable(res)) event.waitUntil(remember(STATIC, MAX_STATIC, req, res.clone()).catch(function () {}))
      return res
    })
  })
}

if (typeof self !== 'undefined' && typeof self.addEventListener === 'function') {
  self.addEventListener('install', function (event) {
    event.waitUntil(
      caches.open(OFFLINE).then(function (cache) { return cache.add(new Request(OFFLINE_URL, { cache: 'reload' })) }).then(function () { return self.skipWaiting() }),
    )
  })

  self.addEventListener('activate', function (event) {
    var keep = [PAGES, STATIC, OFFLINE]
    event.waitUntil(
      caches
        .keys()
        .then(function (names) {
          return Promise.all(
            names.map(function (name) {
              if (name.indexOf(PREFIX) === 0 && keep.indexOf(name) === -1) return caches.delete(name)
            }),
          )
        })
        .then(function () {
          if (self.registration.navigationPreload) return self.registration.navigationPreload.enable()
        })
        .then(function () { return self.clients.claim() }),
    )
  })

  self.addEventListener('fetch', function (event) {
    var req = event.request
    var rule = cacheRule({ method: req.method, url: req.url, mode: req.mode, origin: self.location.origin })
    if (rule === 'page') event.respondWith(page(event))
    else if (rule === 'static') event.respondWith(asset(event))
  })
}
