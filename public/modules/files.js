const fs = require('fs/promises');

// make sure every component of dir exists
async function mkdirAll(dir, mode = 0o777) {
  await fs.mkdir(dir, { recursive: true, mode });
}

async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch (error) {
    return false;
  }
}


module.exports = { mkdirAll, fileExists };