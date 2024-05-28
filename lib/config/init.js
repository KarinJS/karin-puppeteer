import logger from './log.js'
import Config from './config.js'

/** 捕获错误 */
process.on('unhandledRejection', error => logger.error('unhandledRejection', error))
process.on('uncaughtException', error => logger.error('uncaughtException', error))

logger.mark('karin-puppeteer 正在启动中...')
logger.mark(`版本：${Config.package.version}`)
logger.mark('https://github.com/KarinJS/karin-puppeteer')
