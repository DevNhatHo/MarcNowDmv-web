/**
 * MapLibre v6 loads its tile-parsing worker from a URL rather than bundling it, and
 * Turbopack does not resolve that URL from inside the package — the map fails with
 * "Worker failed to load" and renders nothing.
 *
 * Copying the worker the installed package ships into `public/` makes the URL explicit and
 * bundler-independent. The file is a build artifact of the pinned dependency, so it is
 * copied rather than committed, and it is regenerated before every dev and build run.
 */
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const packageJson = require.resolve("maplibre-gl/package.json");
// The worker imports its shared chunk by relative path, so both files must sit together
// or the worker 404s on load and the map never renders.
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
const dist = join(dirname(packageJson), "dist");
const publicDir = join(process.cwd(), "public");

mkdirSync(publicDir, { recursive: true });
for (const file of files) {
  copyFileSync(join(dist, file), join(publicDir, file));
}
console.log(`copied ${files.join(", ")} -> public/`);
