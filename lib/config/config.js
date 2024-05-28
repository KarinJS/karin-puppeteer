import fs from 'fs'
import Yaml from 'yaml'
import common from '../common/common.js'

/**
 * 配置文件
 */
class Config {
  constructor () {
    this.dir = process.cwd()
    this._path = this.dir + '/config/config'
    this._pathDef = this.dir + '/config/defSet'

    /** 缓存 */
    this.config = {}
    /** 是否正在修改配置 */
    this.review = false
    /** 监听文件 */
    this.watcher = { config: {}, defSet: {} }

    common.mkdir(this._path)

    this.initCfg()
  }

  /** 初始化配置 */
  initCfg () {
    const files = fs.readdirSync(this._pathDef).filter(file => file.endsWith('.yaml'))
    for (let file of files) {
      const path = `${this._path}/${file}`
      const pathDef = `${this._pathDef}/${file}`
      if (!fs.existsSync(path)) fs.copyFileSync(pathDef, path)
    }
  }

  /**
   * mime类型
   */
  get mime () {
    return this.getConfig('mime') || this.getdefSet('mime')
  }

  /**
   * @returns {Cfg} - 基本配置
   * @typedef {Object} Cfg
   * @property {string} Config.log_level - 日志等级
   * @property {string} Config.headerId - 请求头id，反向ws
   * @property {object} Config.server - server服务配置
   * @property {boolean} Config.server.http - 启用http服务
   * @property {boolean} Config.server.ws - 启用ws服务
   * @property {object} Config.http - http服务配置
   * @property {number} Config.http.port - http服务端口
   * @property {string} Config.token - token配置
   * @property {string[]} Config.karinUrl - 反向ws地址
   */
  get Config () {
    return { ...this.getdefSet('config'), ...this.getConfig('config') }
  }

  /**
   * 获取 Puppeteer 配置项
   * @returns {Puppeteer} Puppeteer 配置对象
   * @typedef {Object} Puppeteer Puppeteer 配置对象
   * @property {boolean} Puppeteer.debug - 是否开启调试模式
   * @property {string} Puppeteer.chromiumPath - Chromium 可执行文件路径
   * @property {string} Puppeteer.puppeteerWS - Puppeteer WebSocket 地址
   * @property {boolean} Puppeteer.headless - 是否启用 Headless 模式
   * @property {string[]} Puppeteer.args - Puppeteer 启动参数
   * @property {number} Puppeteer.timeout - 页面加载超时时间（毫秒）
   * @property {string} Puppeteer.waitUntil - 页面等待条件设置
   * @property {Object} Puppeteer.setViewport - 默认视口设置
   * @property {boolean} Puppeteer.setViewport.enable - 是否启用视口设置
   * @property {number} Puppeteer.setViewport.width - 视口宽度（整数）
   * @property {number} Puppeteer.setViewport.height - 视口高度（整数）
   * @property {number} Puppeteer.setViewport.deviceScaleFactor - 设备像素比，影响图像质量
   */
  get puppeteer () {
    return { ...this.getdefSet('puppeteer'), ...this.getConfig('puppeteer') }
  }

  /** package.json */
  get package () {
    if (this._package) return this._package
    this._package = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    return this._package
  }

  /**
   * 用户配置
   * @param {string} name 文件名称 不带后缀
   */
  getConfig (name) {
    return this.getYaml('config', name)
  }

  /**
   * 默认配置 建议使用 getConfig
   * @param {string} name 文件名称 不带后缀
   */
  getdefSet (name) {
    return this.getYaml('defSet', name)
  }

  /**
   * 获取配置yaml
   * @param {'defSet'|'config'} type 类型
   * @param {string} name 文件名称 不带后缀
   */
  getYaml (type, name) {
    let file = `config/${type}/${name}.yaml`
    let key = `${type}.${name}`
    if (this.config[key]) return this.config[key]
    this.config[key] = Yaml.parse(fs.readFileSync(file, 'utf8'))
    return this.config[key]
  }
}

export default new Config()
