import log4js from 'log4js'
import Config from './config.js'
import common from '../common/common.js'

const logsDir = './data/logs'
const { log_level: level } = Config.Config

/** 递归创建文件夹 */
common.mkdir(logsDir)

const pattern = '%[[Karin-puppeteer][%d{hh:mm:ss.SSS}][%4.4p]%] %m'

log4js.configure({
  appenders: {
    console: {
      type: 'console',
      layout: {
        type: 'pattern',
        pattern
      }
    },
    out: {
      /** 输出到文件 */
      type: 'file',
      filename: 'data/logs/logger',
      pattern: 'yyyy-MM-dd.log',
      /** 日期后缀 */
      keepFileExt: true,
      /** 日志文件名中包含日期模式 */
      alwaysIncludePattern: true,
      /** 日志输出格式 */
      layout: {
        type: 'pattern',
        pattern: '[%d{hh:mm:ss.SSS}][%4.4p] %m'
      }
    }
  },
  categories: {
    default: { appenders: ['out', 'console'], level }
  }
})

const logger = log4js.getLogger('default')
export default Object.freeze(logger)
