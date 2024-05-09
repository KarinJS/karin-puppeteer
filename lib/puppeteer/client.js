import logger from '../log.js'
import Puppeteer from './puppeteer.js'

logger.mark('karin-puppeteer 正在启动中...')
logger.mark('https://github.com/KarinJS/karin-puppeteer')

const puppeteer = new Puppeteer()
await puppeteer.browserInit()

process.on('SIGHUP', () => {
  puppeteer.close()
  process.exit()
})
process.on('exit', () => {
  puppeteer.close()
  process.exit()
})
process.on('unhandledRejection', error => logger.error('unhandledRejection', error))
process.on('uncaughtException', error => logger.error('uncaughtException', error))

export default puppeteer
