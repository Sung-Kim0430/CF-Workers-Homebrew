import * as esbuild from 'esbuild';

const DEBUG = process.env.DEBUG === '1';

await esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/index.js',
  format: 'esm',
  target: 'esnext',
  define: {
    '__DEBUG__': DEBUG.toString()
  },
  minify: !DEBUG,
  sourcemap: DEBUG
});

console.log(`Build complete (DEBUG=${DEBUG})`);
