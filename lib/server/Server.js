import crypto from 'crypto'
import http from './express.js'
import { Config, puppeteer, logger } from '#karin'

const port = Config.Config.http.port

export default class Server {
  constructor (socket, request) {
    this.id = 0
    this.socket = socket
    this.request = request
    this.host = this.getHost()
  }

  init () {
    this.socket.on('message', data => this.message(data))
    this.socket.on('close', () => {
      logger.error(`[Server][连接关闭]：${this.request.url}`)
    })
  }

  getHost () {
    const isSecure = this.request.connection.encrypted
    const protocol = isSecure ? 'wss' : 'ws'
    const host = this.request.headers.host
    const path = this.request.url
    return `${protocol}://${host}${path}`
  }

  /**
   * 事件处理
   * @param {puppeteer} data - 请求参数
   * @param {string} data.echo - 唯一标识符
   * @param {'heartbeat'|'render'|'static'} data.action - 请求类型
   * @param {object} data.data - 请求参数
   * @param {string} data.data.file - 请求文件
   * @param {'png'|'jpeg'|'webp'} [data.data.type] - 图片类型
   * @param {number} [data.data.quality] - 图片质量
   * @param {boolean} [data.data.omitBackground] - 是否忽略背景
   * @param {object} [data.data.setViewport] - 设置视口
   * @param {number} data.data.setViewport.width - 视口宽度
   * @param {number} data.data.setViewport.height - 视口高度
   * @param {number} [data.data.setViewport.deviceScaleFactor] - 设备比例
   * @param {boolean|number} data.data.multiPage - 是否多页 如果传递数字则视为视窗高度
   * @param {'load'|'domcontentloaded'|'networkidle0'|'networkidle2'} [data.data.waitUntil] - 等待时间
   * @param {any} data.data.pageGotoParams - 新建页面时传递给page.goto的参数
   */
  async message (data) {
    data = JSON.parse(data)
    switch (data.action) {
      case 'heartbeat':
        return logger.debug(`[Server][心跳]：${this.request.url}`)
      case 'render': {
        /** 这里接收到的是file://或者http地址 */
        data.data.file = decodeURIComponent(data.data.file)
        logger.debug(`[正向WS][渲染] URL: ${this.host} html:${data.data.file}`)
        const res = await puppeteer.screenshot(data.data)
        res.echo = data.echo
        res.action = 'renderRes'
        this.socket.send(JSON.stringify(res))
        break
      }
      case 'renderHtml': {
        /** 这里接收到的是完整html buffer */
        const file = decodeURIComponent(data.data.file)
        logger.debug(`[正向WS][渲染] URL: ${this.host} html:${file}`)
        /** 构建唯一id */
        const hash = `render-${this.id}-${crypto.randomUUID()}`
        const host = `http://localhost:${port}/api/render?hash=${hash}`
        http.file.set(hash, { ws: this, file })
        /** 替换为本地http */
        data.data.file = host
        /** http响应头 */
        data.data.hash = hash
        const res = await puppeteer.screenshot(data.data)
        res.echo = data.echo
        res.action = 'renderRes'
        this.socket.send(JSON.stringify(res))
        break
      }
      case 'static': {
        /** 这里接收的全是静态资源 由pupp主动请求客户端 客户端上报完成 */
        this.socket.emit(data.echo, data)
        break
      }
      default:
        break
    }
  }

  /**
   * 发送数据
   * @param {{
   *  type: string,
   *  action: 'heartbeat'|'static',
   *  data: {
   *    file: string
   * }
   * }} params 请求参数
   * @param {number} time 超时时间
   * @returns {Promise<void>}
   */
  async SendApi (action, params, time = 120) {
    const echo = crypto.randomUUID()
    const request = JSON.stringify({ echo, action, params })
    return new Promise((resolve, reject) => {
      this.socket.send(request)
      this.socket.once(echo, (data) => {
        if (data.status === 'ok') {
          resolve(data.data)
        } else {
          logger.error(`[Api请求错误] ${JSON.stringify(data, null, 2)}`)
          reject(data)
        }
      })
      /** 设置一个超时计时器 */
      setTimeout(() => {
        reject(new Error('API请求超时'))
      }, time * 1000)
    })
  }
}

/**
 * @typedef {{
 * echo: string,
 * action: 'heartbeat'|'render'|'static',
 * data: data
 * }} puppeteer
 */

/**
 * @typedef {{
 *  file: string,
 *  name: string,
 *  type?: 'png'|'jpeg'|'webp',
 *  quality?: number,
 *  omitBackground?: boolean,
 *  setViewport?: {
 *   width: number,
 *   height: number,
 *   deviceScaleFactor?: number,
 * },
 *  multiPage: boolean|number,
 *  waitUntil?: 'load'|'domcontentloaded'|'networkidle0'|'networkidle2',
 *  pageGotoParams: any
 * }} data
 */
