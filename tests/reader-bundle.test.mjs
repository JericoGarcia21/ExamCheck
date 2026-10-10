import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

test('dashboard deployment file contains validation and has no external file imports', async () => {
  const bundle = await readFile(new URL('../supabase/functions/read-answers/dashboard.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(bundle, /^import\s/m)
  assert.match(bundle, /function validateReadRequest/)
  assert.match(bundle, /function validateRecognition/)
  execFileSync(process.execPath, ['scripts/bundle-reader.mjs', '--check'], { cwd: new URL('../', import.meta.url), windowsHide: true })
})
