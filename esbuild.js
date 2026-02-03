const esbuild = require('esbuild');
const { glob } = require('glob');
const path = require('path');

const isWatch = process.argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  external: ['vscode', 'duckdb-async'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
  treeShaking: true,
};

/** @type {esbuild.BuildOptions} */
const testBuildOptions = {
  bundle: true,
  outdir: 'out/test/integration',
  external: ['vscode', 'mocha', 'glob'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: false,
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
    console.log('Build complete');

    // Also build integration tests
    try {
      const testFiles = await glob('src/test/integration/**/*.ts');
      if (testFiles.length > 0) {
        await esbuild.build({
          ...testBuildOptions,
          entryPoints: testFiles,
        });
        console.log('Integration tests built');
      }
    } catch (err) {
      console.log('No integration tests found (or glob not available)');
    }
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
