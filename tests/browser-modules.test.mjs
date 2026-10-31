import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);

test('HTML uses .js scripts and retains a module entry point for static hosting', async () => {
  const html = await readFile(new URL('index.html', dist), 'utf8');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map(([, attrs]) => ({
    source: attrs.match(/\bsrc="([^"]+)"/)?.[1],
    module: /\btype="module"/.test(attrs)
  })).filter(script => script.source);
  assert.ok(scripts.some(script => script.module && script.source === 'app.js'));
  for (const script of scripts) {
    assert.ok(script.source.endsWith('.js'), script.source);
    await readFile(new URL(script.source, dist));
  }
});

test('every browser module dependency exists and uses the .js extension', async () => {
  const files = await readdir(dist);
  assert.equal(files.some(file => file.endsWith('.mjs')), false);
  let imports = 0;
  for (const file of files.filter(file => file.endsWith('.js'))) {
    const source = await readFile(new URL(file, dist), 'utf8');
    for (const [, dependency] of source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
      assert.ok(dependency.startsWith('./'), `${file}: ${dependency}`);
      assert.ok(dependency.endsWith('.js'), `${file}: ${dependency}`);
      await readFile(new URL(dependency, dist));
      imports++;
    }
  }
  assert.ok(imports > 0);
});
