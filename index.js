import './lib/config/init.js'
import './lib/server/express.js'
import Config from './lib/config/config.js'
import Client from './lib/server/Client.js'
import Puppeteer from './lib/puppeteer/puppeteer.js'

const { server, karinUrl, headerId } = Config.Config

/** 创建 WebSocket 连接 */
if (server.ws) {
  for (let url of karinUrl) {
    const client = new Client(url, headerId)
    client.createWebSocket()
  }
}

export default Puppeteer
