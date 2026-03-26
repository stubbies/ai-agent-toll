import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],      // Support both import and require
  dts: true,                   // Generate .d.ts files for IntelliSense
  splitting: false,            // Keep it in one file for simpler worker imports
  sourcemap: true,             // Helpful for debugging in Cloudflare
  clean: true,                 // Wipe the /dist folder before each build
  minify: true,                // Keep the SDK footprint small (< 50KB)
  treeshake: true,             // Remove unused code (like Hono logic for Vanilla users)
  // Ensure we don't bundle peer dependencies
  external: ['hono', '@cloudflare/workers-types', 'viem'], 
});
