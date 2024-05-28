import os from 'os'
import fs from 'fs'
import path from 'path'
import util from 'util'
import express from 'express'
import Server from './Server.js'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { Config, puppeteer, logger } from '#karin'

class HttpServer {
  constructor (port) {
    this.port = port
    this.app = express()
    this.server = createServer(this.app)
    this.ws = new WebSocketServer({ server: this.server })
    this.file = new Map()
    this.StaticApi()
    this.wsApi()
    this.GetApi()
    this.PostApi()
  }

  init () {
    /** 解析JSON */
    this.app.use(express.json({ limit: '50mb' }))
    /** 解析URL编码 */
    this.app.use(express.urlencoded({ extended: true }))
    /** 设置静态文件目录 */
    this.app.use(express.static(process.cwd()))
    /** 开启服务 */
    this.server.listen(this.port, '0.0.0.0')
  }

  wsApi () {
    this.ws.on('connection', async (socket, request) => {
      const url = request.url
      /** 非标Api禁止连接 */
      if (url !== '/ws/render') return socket.close()
      // /** 检查token */
      // const token = request.headers['x-token']
      // if (token !== '123456') return socket.close()
      logger.mark(`[正向WS][新的连接]：${url}`)
      return new Server(socket, request).init()
    })

    this.ws.on('close', (socket, request) => {
      logger.error(`[正向WS][服务器关闭]：${request.url}`)
    })
  }

  GetApi () {
    /** GET接口 - 渲染 */
    this.app.get('/api/render/', async (req, res) => {
      try {
        const { hash } = req.query
        /** 设置响应头 buffer */
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        const data = this.file.get(hash)
        if (!data) return res.send(JSON.stringify({ code: 404, msg: 'Not Found' }))
        res.send(data.file)
      } catch (e) {
        logger.error('[服务器][GET] 未知错误', e)
        res.status(500).send(JSON.stringify({ code: 500, msg: 'Internal Server Error' }))
      }
    })
  }

  PostApi () {
    this.app.post('/api/render', async (req, res) => {
      const { token, data } = req.body
      if (token !== Config.Config.token) return res.send(JSON.stringify({ code: 403, msg: 'Forbidden' }))
      const image = await puppeteer.screenshot(data)
      res.send(JSON.stringify(image))
    })
  }

  StaticApi () {
    /** 对静态资源重构，使用ws进行传输 */
    this.app.use(async (req, res, next) => {
      if (req.query.hash) return next()
      /** 获取唯一id */
      const hash = req.headers['x-renderer-id']
      if (!hash) return next()
      /** 如果是/favicon.ico 则返回本地 */
      if (req.url === '/favicon.ico') {
        const file = fs.readFileSync('./lib/resources/favicon.ico')
        res.setHeader('Content-Type', 'image/x-icon')
        return res.send(file)
      }

      /** 获取对应的ws */
      const file = this.file.get(hash)
      if (!file || !file.ws) return next()

      const { SendApi } = file.ws
      /** 发送请求 */
      let data = SendApi.call(file.ws, 'static', { file: req.url })
      /** 获取url后缀 */
      const ext = path.extname(req.url).toLowerCase()
      let contentType = 'application/octet-stream'

      try {
        contentType = Config.mime[ext]
      } catch {
        logger.error('[服务器][GET][ContentType] 获取 mime 错误')
      }

      if (util.types.isPromise(data)) data = await data
      res.setHeader('Content-Type', contentType)
      res.send(Buffer.from(data.file.data))
      return true
    })
  }

  getIPS () {
    const interfaces = os.networkInterfaces()
    const list = []

    Object.keys(interfaces).forEach(interfaceName => {
      interfaces[interfaceName].forEach(iface => {
        if (iface.family === 'IPv4' && !iface.internal) {
          list.push(iface.address)
        }
      })
    })

    return list
  }
}

const port = Config.Config.http.port
const isHttp = Config.Config.server.http

let http
if (isHttp) {
  http = new HttpServer(port)
  http.init()

  logger.mark(`[服务器][正向WS][初始化] ws://localhost:${port}/ws/render`)

  /** 获取所有ipv4地址 */
  const ips = http.getIPS()
  ips.forEach(ip => {
    logger.mark(`[服务器][HTTP][post] http://${ip}:${port}/api/render/`)
  })
}

export default http
