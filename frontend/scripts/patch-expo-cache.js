const fs = require('fs');
const path = require('path');

const cacheFile = path.join(__dirname, '..', 'node_modules', '@expo', 'image-utils', 'build', 'Cache.js');

if (fs.existsSync(cacheFile)) {
  let content = fs.readFileSync(cacheFile, 'utf8');
  const original = "const CACHE_LOCATION = '.expo/web/cache/production/images';";
  const replacement = "const CACHE_LOCATION = 'node_modules/.cache/expo-image-utils';";

  if (content.includes(original)) {
    content = content.replace(original, replacement);
    fs.writeFileSync(cacheFile, content);
    console.log('Patched @expo/image-utils Cache.js successfully');
  }
}
