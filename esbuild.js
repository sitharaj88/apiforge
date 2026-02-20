const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: 'esbuild-problem-matcher',
  setup(build) {
    build.onStart(() => {
      console.log('[watch] build started');
    });
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`);
        console.error(`    ${location.file}:${location.line}:${location.column}:`);
      });
      console.log('[watch] build finished');
    });
  },
};

/**
 * Copy static assets to dist folder
 * @type {import('esbuild').Plugin}
 */
const copyAssetsPlugin = {
  name: 'copy-assets',
  setup(build) {
    build.onEnd(() => {
      // Ensure dist directory exists
      const distDir = path.join(__dirname, 'dist');
      if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
      }

      // Copy schemas if they exist
      const schemasDir = path.join(__dirname, 'schemas');
      const distSchemasDir = path.join(distDir, 'schemas');
      if (fs.existsSync(schemasDir)) {
        if (!fs.existsSync(distSchemasDir)) {
          fs.mkdirSync(distSchemasDir, { recursive: true });
        }
        const schemaFiles = fs.readdirSync(schemasDir);
        schemaFiles.forEach((file) => {
          fs.copyFileSync(
            path.join(schemasDir, file),
            path.join(distSchemasDir, file)
          );
        });
      }
    });
  },
};

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    logLevel: 'info',
    plugins: [
      copyAssetsPlugin,
      ...(watch ? [esbuildProblemMatcherPlugin] : []),
    ],
    define: {
      'process.env.NODE_ENV': production ? '"production"' : '"development"',
    },
  });

  if (watch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build completed successfully!');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
