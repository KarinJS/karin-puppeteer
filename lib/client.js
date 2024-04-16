import WebSocket from 'ws'
import Puppeteer from './Puppeteer.js'
import logger from './log.js'

const puppeteer = new Puppeteer()
/** 初始化浏览器 */
await puppeteer.browserInit()

/** 退出事件 */
process.on('exit', () => puppeteer.close())
/** 捕获错误 */
process.on('unhandledRejection', error => logger.error('unhandledRejection', error))
process.on('uncaughtException', error => logger.error('uncaughtException', error))

export default class WebSocketClient {
  constructor (url, headerId) {
    this.url = url
    this.headerId = headerId
    this.ws = null
    this.statr = false
  }

  /** 创建 WebSocket 连接 */
  createWebSocket () {
    this.ws = new WebSocket(this.url, {
      headers: {
        'renderer-id': this.headerId,
        'renderer-type': 'image'
      }
    })

    this.ws.on('open', () => {
      this.statr = true
      logger.mark('WebSocket连接成功：', this.url)
    })

    this.ws.on('message', async message => {
      const { echo, name, data } = JSON.parse(message)
      const res = await puppeteer.screenshot(name, data)
      res.echo = echo
      return this.ws.send(JSON.stringify(res))
    })

    /** 连接断开 */
    this.ws.on('close', () => {
      this.statr = false
      this.reconnect()
    })

    /** 连接错误 */
    this.ws.on('error', error => {
      if (error.code === 'ECONNREFUSED') {
        logger.error('WebSocket连接失败：', this.url)
      } else {
        logger.error('WebSocket连接错误：', error)
      }
    })
  }

  /** 重连函数 */
  reconnect () {
    logger.info('连接断开，将在5秒后尝试重新连接: ', this.url)
    setTimeout(this.createWebSocket.bind(this), 5000)
  }
}