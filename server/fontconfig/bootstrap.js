'use strict';

const fs = require('fs');
const path = require('path');

// Sharp → libvips → Pango uses fontconfig. Empty env values yield: "Cannot load default config file: No such file: (null)"
for (const key of ['FONTCONFIG_FILE', 'FONTCONFIG_PATH']) {
  const v = process.env[key];
  if (v === '' || v === 'null') {
    delete process.env[key];
  }
}

const systemConf = '/etc/fonts/fonts.conf';
if (fs.existsSync(systemConf)) {
  return;
}

const bundled = path.join(__dirname, 'fonts.conf');
if (fs.existsSync(bundled)) {
  process.env.FONTCONFIG_FILE = bundled;
}
