/// <reference types="vitest/config" />
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json' with { type: 'json' };

/** Arquivos de public/ (copiados como estão para o build). */
function publicFiles(dir = 'public'): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? publicFiles(p) : [relative('public', p).split(sep).join('/')];
  });
}

/**
 * PWA sem dependência: gera dist/sw.js a partir de pwa/sw.js com a lista de arquivos do build
 * (JS, CSS, fontes, ícones) e uma versão que muda sempre que algum arquivo muda.
 */
function serviceWorker(): Plugin {
  return {
    name: 'asa-norte-sw',
    apply: 'build',
    generateBundle(_, bundle) {
      // fontes .woff antigas ficam de fora: todo navegador atual usa .woff2
      const files = [
        './',
        // o index.html é gerado depois desta etapa do build, então entra pelo nome
        './index.html',
        ...[...Object.keys(bundle), ...publicFiles()]
          .filter((f) => !f.endsWith('.woff'))
          .sort()
          .map((f) => './' + f),
      ];
      const hash = createHash('sha256');
      for (const [name, out] of Object.entries(bundle))
        hash.update(name + (out.type === 'chunk' ? out.code : String(out.source)));
      const version = `${pkg.version}-${hash.digest('hex').slice(0, 10)}`;
      const source = readFileSync('pwa/sw.js', 'utf8')
        .replace('__VERSION__', version)
        .replace('__PRECACHE__', JSON.stringify(files, null, 2));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base relativo: o build funciona servido de qualquer subpasta
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
