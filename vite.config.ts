import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// Relative base: the same build works at a domain root, under a GitHub Pages
// subpath (https://xarchline.github.io/<repo>/) and inside a Capacitor webview.
// Renaming the repo needs no change here.

// After the build, stamp dist/sw.js with a per-build version and the list of files to precache.
function serviceWorkerManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'sw-precache',
    apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const swPath = join(outDir, 'sw.js');
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const p = join(dir, name);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split(sep).join('/'));
        }
      };
      walk(outDir);
      const precache = ['./', ...files.filter((f) => f !== 'sw.js' && f !== 'index.html')];
      const src = readFileSync(swPath, 'utf8')
        .replace('__SW_VERSION__', Date.now().toString(36))
        .replace('self.__PRECACHE__', JSON.stringify(precache));
      writeFileSync(swPath, src);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [serviceWorkerManifest()],
});
