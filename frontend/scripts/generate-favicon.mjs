/**
 * One-off favicon generator.
 *
 *   cd frontend && node scripts/generate-favicon.mjs
 *
 * Reads public/vpathlogo.png and writes the full favicon set (favicon.ico,
 * Apple touch icon, web app manifest icons, etc.) into public/. Prints the
 * <link>/<meta> markup at the end — paste it into index.html in place of the
 * existing single <link rel="icon"> line.
 *
 * Re-run whenever the source logo changes. Generated files ARE committed
 * (rather than built at deploy time) because the favicon should never depend
 * on the build pipeline succeeding — a 404 favicon is a bad first impression.
 */
import {
  generateFaviconFiles,
  generateFaviconHtml,
  IconTransformationType,
} from '@realfavicongenerator/generate-favicon';
import {
  getNodeImageAdapter,
  loadAndConvertToSvg,
} from '@realfavicongenerator/image-adapter-node';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(here, '..', 'public');
const SOURCE = resolve(PUBLIC_DIR, 'vpathlogo.png');

// Brand: navy from the logo's blue, used for the iOS touch icon background
// and the PWA theme/background. Gold isn't used here because RFG's flat-color
// backgrounds don't carry the gradient/sparkle of the real mark — better to
// stay solid and let the logo do the talking.
const NAVY = '#1e3a8a';

const imageAdapter = await getNodeImageAdapter();
const masterIcon = { icon: await loadAndConvertToSvg(SOURCE) };

const settings = {
  icon: {
    desktop: {
      regularIconTransformation: {
        type: IconTransformationType.None,
        backgroundRadius: 0,
        backgroundColor: '#ffffff',
        imageScale: 1,
        brightness: 0,
      },
      darkIconType: 'none',
      darkIconTransformation: {
        type: IconTransformationType.None,
        backgroundRadius: 0,
        backgroundColor: '#ffffff',
        imageScale: 1,
        brightness: 0,
      },
    },
    touch: {
      transformation: {
        type: IconTransformationType.Background,
        backgroundColor: NAVY,
        backgroundRadius: 0,
        imageScale: 0.75,
        brightness: 0,
      },
      appTitle: 'V PATHing Rewards',
    },
    webAppManifest: {
      transformation: {
        type: IconTransformationType.Background,
        backgroundColor: NAVY,
        backgroundRadius: 0,
        imageScale: 0.75,
        brightness: 0,
      },
      backgroundColor: NAVY,
      themeColor: NAVY,
      name: 'V PATHing Rewards',
      shortName: 'V PATHing',
    },
  },
  path: '/',
  skipMetadataInjection: false,
};

console.log(`Source: ${SOURCE}`);
console.log(`Output: ${PUBLIC_DIR}`);

const files = await generateFaviconFiles(masterIcon, settings, imageAdapter);

for (const [name, content] of Object.entries(files)) {
  const out = resolve(PUBLIC_DIR, name);
  if (content instanceof Blob) {
    const buf = Buffer.from(await content.arrayBuffer());
    await writeFile(out, buf);
  } else if (Buffer.isBuffer(content)) {
    await writeFile(out, content);
  } else {
    await writeFile(out, content, 'utf8');
  }
  console.log(`  wrote ${name}`);
}

const html = generateFaviconHtml(settings);
console.log('\n--- Paste into index.html <head> ---');
for (const markup of html.markups) {
  console.log(markup);
}
console.log('--- end markup ---\n');
