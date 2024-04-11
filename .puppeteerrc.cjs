const path = require('path')

module.exports = {
  skipDownload: false,
  cacheDirectory: path.resolve(__dirname, 'data'),
  downloadBaseUrl: 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
}
