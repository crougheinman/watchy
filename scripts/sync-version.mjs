// Sync package.json "version" to Supabase app_config.latest_version before a build.
//
// Reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY from .env, fetches the
// required version from app_config (id=1), and writes it into package.json so the
// built APK reports exactly the version Supabase requires. Soft-fails (warns and
// exits 0) if Supabase is unreachable, so the build can still proceed.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseEnv(path) {
  const out = {};
  try {
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
    }
  } catch { /* no .env */ }
  return out;
}

const env = parseEnv(join(root, '.env'));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[sync-version] Supabase env missing in .env — keeping current package.json version.');
  process.exit(0);
}

try {
  const res = await fetch(`${url}/rest/v1/app_config?id=eq.1&select=latest_version`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rows = await res.json();
  const version = rows?.[0]?.latest_version;
  if (!version) throw new Error('no latest_version in app_config');

  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.version === version) {
    console.log(`[sync-version] package.json already at ${version}.`);
  } else {
    console.log(`[sync-version] package.json ${pkg.version} -> ${version} (from Supabase).`);
    pkg.version = version;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
} catch (e) {
  console.warn(`[sync-version] Could not read Supabase version (${e.message}) — keeping current version.`);
  process.exit(0);
}
