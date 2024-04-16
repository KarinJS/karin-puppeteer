import Client from './lib/client.js'
import { Config } from './lib/common.js'

const { karinUrl, headerId } = Config

/** 创建 WebSocket 连接 */
for (let url of karinUrl) {
  const client = new Client(url, headerId)
  client.createWebSocket()
}
