import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import assert from 'node:assert/strict'

// Exercise the generated Workbox worker, not just the Vite configuration.
// This verifies lifecycle handoff; it is not a browser/cache-update E2E test.
const events = new Map()
let claims = 0
let skips = 0
const waits = []
const context = {
  URL, Request, Response, Headers, console, setTimeout, clearTimeout,
  navigator: { userAgent: 'lifecycle-test' },
  location: new URL('https://app.example.test/sw.js'),
  caches: { keys: async () => [], open: async () => ({ keys: async () => [], delete: async () => true }) },
}
context.self = context
context.clients = { claim: async () => { claims++ }, matchAll: async () => [] }
context.registration = { scope: 'https://app.example.test/' }
context.addEventListener = (name, callback) => events.set(name, [...events.get(name) ?? [], callback])
context.skipWaiting = async () => { skips++ }
vm.createContext(context)
const dist = new URL('../dist/', import.meta.url)
context.importScripts = (path) => {
  const name = new URL(path, context.location).pathname.split('/').pop()
  vm.runInContext(readFileSync(new URL(name, dist), 'utf8'), context)
}
vm.runInContext(readFileSync(new URL('sw.js', dist), 'utf8'), context, { filename: fileURLToPath(new URL('sw.js', dist)) })
await new Promise(resolve => setTimeout(resolve, 0))
assert.equal(skips, 0, 'The worker must wait for user approval before activation')
for (const callback of events.get('message') ?? []) callback({ data: { type: 'SKIP_WAITING' } })
assert.equal(skips, 1, 'Accepted updates must request activation')
for (const callback of events.get('activate') ?? []) callback({ waitUntil: promise => waits.push(promise) })
await Promise.all(waits)
assert.equal(claims, 1, 'Activated updates must claim open clients so the app can reload')
console.log('PWA build lifecycle passed: user-approved activation claims open clients.')
