import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
  },
  {
    entry: { widget: 'src/index.ts' },
    format: ['iife'],
    globalName: 'AutomatosWidget',
    outExtension: () => ({ js: '.global.js' }),
    sourcemap: true,
    minify: true,
    treeshake: true,
    noExternal: [/@automatos/],
  },
]);
