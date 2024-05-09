import { Config } from './lib/common/common.js'
import HttpServer from './lib/server/HttpServer.js'
import WebSocketClient from './lib/server/WebSocket.js'

const { karinUrl, headerId } = Config

/** 创建 WebSocket 连接 */
for (let url of karinUrl) {
  const client = new WebSocketClient(url, headerId)
  client.createWebSocket()
}

/** 创建 HTTP 服务器 */
if (Config.http.enable) {
  const { port } = Config.http
  new HttpServer(port).init()
}
