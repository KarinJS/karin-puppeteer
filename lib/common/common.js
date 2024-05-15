import fs from 'fs'
import Yaml from 'yaml'

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const tempFile = './config/temp/temp.json'
const _path = process.cwd() + '/config/config'
const configPath = _path + '/config.yaml'
const defConfigPath = _path + '/config_default.yaml'

if (!fs.existsSync(configPath)) fs.copyFileSync(defConfigPath, configPath)
if (!fs.existsSync(tempFile)) fs.writeFileSync(tempFile, JSON.stringify([]))

const Config = {
  ...Yaml.parse(fs.readFileSync(defConfigPath, 'utf8')),
  ...Yaml.parse(fs.readFileSync(configPath, 'utf8'))
}

export { Config, tempFile }
