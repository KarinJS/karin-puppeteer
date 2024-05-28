import { execSync } from 'child_process'

const cmd = 'node node_modules/puppeteer/install.js '
process.env.PUPPETEER_DOWNLOAD_HOST = 'https://cdn.npmmirror.com/binaries/chrome-for-testing'
console.log('[Puppeteer] 正在安装chromium，请耐心等待...')

try {
  let output = execSync(cmd, { env: process.env, stdio: 'inherit' })
  output = output.toString()
  if (/Chromium is already in.*skipping download/.test(output)) {
    // 正则表达式模式，用于匹配路径
    const regex = /Chromium is already in (.+?);/
    // 使用正则表达式的 exec() 方法匹配字符串
    const match = regex.exec(output)
    console.log(`[Puppeteer] chromium已安装，无需重复安装：${match[1]}`)
  } else {
    const regex = /Chromium \(\d+\) downloaded to (.+)/
    const match = regex.exec(output)
    console.log(`[Puppeteer] 安装成功：${match[1]}`)
  }
} catch (error) {
  console.error(`[Puppeteer] 安装失败: ${error}`)
}
