import WebSocket from 'ws'
import { Config } from './lib/common.js'
import Puppeteer from './lib/puppeteer.js'
import logger from './lib/log.js'

let statr = false
let ws = null
const puppeteer = new Puppeteer()
/** 初始化浏览器 */
await puppeteer.browserInit()
const { karinUrl, headerId } = Config

/** 创建 WebSocket 连接 */
const createWebSocket = () => {
  ws = new WebSocket(karinUrl, {
    headers: {
      'renderer-id': headerId,
      'renderer-type': 'image'
    }
  })

  ws.on('open', () => {
    statr = true
    logger.mark('WebSocket连接成功：', karinUrl)
  })

  ws.on('message', async message => {
    const { echo, name, data } = JSON.parse(message)
    const res = await puppeteer.screenshot(name, data)
    res.echo = echo
    return ws.send(JSON.stringify(res))
  })

  /** 连接断开 */
  ws.on('close', () => {
    statr = false
    reconnect()
  })

  /** 连接错误 */
  ws.on('error', error => {
    /** 检查原因是否为服务器不存在 */

    if (error.code === 'ECONNREFUSED') {
      logger.error('WebSocket连接失败：', karinUrl)
    } else {
      logger.error('WebSocket连接错误：', error)
    }
  })
}

/** 重连函数 */
function reconnect (data) {
  logger.info('连接断开，将在5秒后尝试重新连接...')
  setTimeout(createWebSocket, 5000)
}

/** 捕获错误 */
process.on('unhandledRejection', error => {
  logger.error('unhandledRejection', error)
})
process.on('uncaughtException', error => {
  logger.error('uncaughtException', error)
})
/** 退出事件 */
process.on('exit', () => {
  puppeteer.close()
})

/** 初始创建 WebSocket 连接 */
createWebSocket()
