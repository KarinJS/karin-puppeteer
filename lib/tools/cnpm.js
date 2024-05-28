import { execSync } from 'child_process'

function fnc (cmd, succ, fail) {
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env })
    console.log(succ)
    return true
  } catch (error) {
    console.error(fail)
    console.error(error)
    return false
  }
}

/** 检查是否安装 cnpm 未安装则全局安装 */
console.log('检查 cnpm 是否安装...')
let res = fnc('cnpm -v', 'cnpm 已安装', '未安装 cnpm，正在安装...')
if (!res) {
  const cmd = 'npm install -g cnpm --registry=https://registry.npmmirror.com'
  res = fnc(cmd, 'cnpm 安装成功', 'cnpm 安装失败，请手动安装')
  if (!res) process.exit(1)
}

/** 安装依赖 */
console.log('正在安装依赖...')
res = fnc('cnpm install', '依赖安装成功', '依赖安装失败')
