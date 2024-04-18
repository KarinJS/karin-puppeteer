import fs from 'fs'
import Yaml from 'yaml'

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

let tempFile = './data/temp.json'
let _path = process.cwd() + '/config/'
const pluginPath = process.cwd() + '/plugins/karin-puppeteer'
/** 判断是否为内置插件 */
if (fs.existsSync(pluginPath)) {
  _path = pluginPath + '/config/'
  tempFile = pluginPath + '/data/temp.json'
}

let Config
if (fs.existsSync(_path + 'config.yaml')) {
  Config = Yaml.parse(fs.readFileSync(_path + 'config.yaml', 'utf8'))
} else {
  Config = Yaml.parse(fs.readFileSync(_path + 'config_default.yaml', 'utf8'))
}

export { Config, tempFile }
