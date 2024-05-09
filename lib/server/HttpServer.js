import os from 'os'
import express from 'express'
import logger from '../log.js'
import { Config } from '../common/common.js'
import puppeteer from '../puppeteer/client.js'

export default class HttpServer {
  constructor (port) {
    this.port = port
    if (Config.http.token) {
      this.token = (token) => {
        return token === Config.http.token
      }
    }
  }

  init () {
    this.app = express()
    /** 解析JSON */
    this.app.use(express.json())
    /** 解析URL编码 */
    this.app.use(express.urlencoded({ extended: true }))
    this.app.post('/api/render', async (req, res) => {
      const { name, data } = req.body
      const { host, token } = req.headers
      logger.info(`[HttpServer][${host}] token：${token}`)
      /** token */
      if (!this.token(req.headers.token)) {
        logger.error(`[HttpServer][${host}] token error`)
        res.send(JSON.stringify({ ok: false, data: 'token error' }))
      }
      data.savePath = data.savePath.replace(data.cwd, '').replace(/\\/g, '/')
      data.savePath = `${data.host}/api/render?html=${data.savePath}`
      const screenshot = await puppeteer.screenshot(name, data)
      res.send(JSON.stringify(screenshot))
    })

    /** 启动 */
    this.app.listen(this.port, () => {
      const network = os.networkInterfaces()
      Object.keys(network).forEach(name => {
        network[name].forEach(info => {
          if (name && info.address && info.address !== '::1' && info.family !== 'IPv6') {
            logger.info(`Karin渲染请求host地址: http://${info.address}:${this.port}/api/render`)
          }
        })
      })
    })
  }

  token () {
    return true
  }
}
