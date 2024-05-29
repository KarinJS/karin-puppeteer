import fs from 'fs'
import puppeteer from 'puppeteer'
import logger from '../config/log.js'
import Config from '../config/config.js'
import HttpServer from '../server/express.js'

/**
 * @typedef {object} data 截图参数
 * @property {string} data.file http地址或本地文件路径
 * @property {string} [data.name] 模板名称
 * @property {'png'|'jpeg'|'webp'} [data.type] 截图类型 默认'webp'
 * @property {number} [data.quality] 截图质量 默认90
 * @property {string} [data.hash] 页面hash 这里是用于ws渲染识别来源
 * @property {boolean} data.omitBackground 是否隐藏背景 默认false
 * @property {object} [data.setViewport] 设置视窗大小和设备像素比 默认1920*1080、1
 * @property {number} data.setViewport.width 视窗宽度
 * @property {number} data.setViewport.height 视窗高度
 * @property {string} data.setViewport.deviceScaleFactor 设备像素比
 * @property {number|boolean} [data.multiPage] 分页截图 传递数字则视为视窗高度 返回数组
 * @property {object} [data.pageGotoParams] 页面goto时的参数
 * @property {string} data.pageGotoParams.waitUntil 页面加载状态 默认load
 * @property {number} data.pageGotoParams.timeout 页面加载超时时间 默认30000
 */

class Client {
  /**
   * @type {'close'|'starting'|'started'} status - chromium状态
   */
  status

  /**
   * @type {import('puppeteer').Browser|boolean} chromium - chromium实例
   */
  chromium
  constructor () {
    /** chromium实例 */
    this.chromium = false
    /** 当前是否正在初始化 */
    this.init = false
    /** 队列锁 */
    this.shoting = []
    /** 创建页面次数 */
    this.createPageCount = 0
    /** 图片生成次数 */
    this.renderNum = 0

    /** 状态队列 防止并发 */
    this.queue = Promise.resolve()
    /** chromium状态 关闭/启动中/已启动 */
    this.status = 'close'
    /** 打开后将不会关闭浏览器 不关闭标签页 */
    this.debug = false

    /** 关 */
    process.once('SIGHUP', () => {
      this.close()
      process.exit()
    })
    process.once('exit', () => {
      this.close()
      process.exit()
    })
  }

  /** 初始化chromium */
  async browserInit () {
    if (this.chromium) return this.listen()

    /** puppeteer配置 */
    const { debug, headless, args, puppeteerWS, chromiumPath } = Config.puppeteer

    this.debug = debug

    /** 检查开发者是否传入websocket */
    if (puppeteerWS) {
      await this.connect(puppeteerWS)
      if (this.chromium) return this.listen()
    }

    const config = { headless, args }
    config.userDataDir = process.cwd() + '/data/userDataDir'
    /** 检查开发者是否传入自定义chromium地址 */
    if (chromiumPath) {
      /** 使用fs检查 */
      if (fs.existsSync(chromiumPath)) {
        /** 自定义路径 */
        config.executablePath = chromiumPath
      } else {
        logger.error('puppeteer Chromium 自定义地址不存在：', chromiumPath)
      }
    }

    /** debug模式关闭无头 */
    if (debug) config.headless = false

    logger.info('puppeteer Chromium 启动中...')

    /** 如果没有实例，初始化puppeteer chromium */
    try {
      this.chromium = await puppeteer.launch(config)
      logger.info('puppeteer Chromium 启动成功')
      logger.info(`[Chromium] ${this.chromium.wsEndpoint()}`)

      /** 监听Chromium事件 */
      return this.listen()
    } catch (error) {
      logger.error('[chromium] 启动失败 请尝试 node init 进行初始化')
      logger.error(error)
      process.exit(1)
    }
  }

  /** 传入websocket，连接已有的chromium */
  async connect (browserWSEndpoint) {
    try {
      logger.info(`puppeteer Chromium from ${browserWSEndpoint}`)
      this.chromium = await puppeteer.connect({ browserWSEndpoint })
      logger.info('puppeteer Chromium 已连接启动的实例：', browserWSEndpoint)
    } catch {
      logger.error('puppeteer Chromium 连接失败：', browserWSEndpoint)
    }
  }

  /** 监听Chromium事件 */
  listen () {
    this.chromium.on('disconnected', () => {
      logger.error('Chromium 实例崩溃！')
      this.close()
    })

    /** 监听Chromium错误 */
    this.chromium.on('error', (error) => {
      logger.error('Chromium 实例错误！', error)
    })

    this.status = 'started'
    /** 清空队列 */
    this.shoting = []
  }

  /** 关闭浏览器 */
  async close () {
    try {
      await this.chromium?.close()
      logger.info('Chromium 实例已关闭！')
    } catch (e) {
      logger.error(e)
    } finally {
      /** 重置状态 */
      this.status = 'close'
      this.chromium = false
    }
  }

  add (task) {
    this.queue = this.queue.then(() => task())
    return this.queue
  }

  /** 初始化chromium */
  async isInit () {
    /** 传入队列，防止并发browserInit */
    const status = await this.add(() => new Promise((resolve) => {
      if (this.status === 'close') {
        this.status = 'starting'
        resolve(true)
      }
      resolve(false)
    }))

    if (status) await this.browserInit()

    /** 初始化中 */
    return new Promise((resolve) => {
      let num = 0
      const timer = setInterval(() => {
        num++
        if (this.chromium) {
          logger.info('Chromium 初始化完成')
          clearInterval(timer)
          resolve(true)
        }
        if (num >= 120) {
          logger.error('Chromium 初始化超时')
          clearInterval(timer)
          resolve(false)
        }
      }, 500)
    })
  }

  /**
   * chromium 截图
   * @param {data} data 截图参数
   * @param {boolean} opts.retry 是否重试，默认true
   * todo: 浏览器崩溃重试
   * @return {Promise<{ok: boolean, data: string|Array<string>}>} 返回图片base64
   */
  async screenshot (data, opts = { retry: true }) {
    const name = data.name || 'render'
    if (this.status !== 'started') {
      logger.info(`[图片生成][${name}] 初始化中...`)
      const initFlag = await this.isInit()
      if (!initFlag) {
        logger.error(`[图片生成][${name}] 初始化失败`)
        return { ok: false, data: `[图片生成][${name}] 初始化失败` }
      } else {
        logger.info(`[图片生成][${name}] 初始化完成`)
      }
    }

    /** 开始时间 */
    let start = Date.now()
    /** 队列 */
    this.shoting.push(name)
    /** 创建页面 */
    let page = await this.chromium.newPage()
    try {
      /** 打开页面数+1 */
      this.createPageCount++
      let file = data.file
      if (!file) return { ok: false, data: `[图片生成][${name}] 缺少文件路径` }

      const { waitUntil, timeout } = Config.puppeteer

      /** waitUntil参数处理 */
      if (waitUntil) {
        if (!data.pageGotoParams) {
          data.pageGotoParams = { waitUntil }
        } else if (!data.pageGotoParams?.waitUntil) {
          data.pageGotoParams.waitUntil = waitUntil
        }
      }

      /** 页面goto时的参数 */
      const pageGotoParams = { timeout, ...data.pageGotoParams || {} }

      logger.debug(`[goto] ${file}`)
      /** 加载页面 */
      await page.goto(file, pageGotoParams)
      await page.waitForSelector('body')
      const { type = 'jpeg', quality = 90, omitBackground = false } = data

      /** 设置全局的HTTP头部 用于ws渲染识别 */
      if (data.hash) await page.setExtraHTTPHeaders({ 'x-renderer-id': data.hash })

      /** 获取页面元素 */
      const body = await page.$('body')

      /** 计算页面高度 */
      const box = await body.boundingBox()

      /** 视窗大小和设备像素比 */
      const setViewport = this.setViewport(data, box)
      if (setViewport) await page.setViewport(setViewport)

      /** 截图参数 */
      const screenshotOpts = { quality, type, omitBackground, encoding: 'base64' }

      /** 整页 */
      if (!data.multiPage) {
        if (type === 'png') delete screenshotOpts.quality
        const buff = await body.screenshot(screenshotOpts)

        /** 计算图片大小 */
        const kb = (buff.length / 1024).toFixed(2) + 'KB'
        /** 次数+1 */
        this.renderNum++
        logger.mark(`[图片生成][${name}][${this.renderNum}次] ${kb} ${Date.now() - start}ms`)
        this.shoting.pop()
        if (data.hash) HttpServer.file.delete(data.hash)
        return { ok: true, data: 'base64://' + buff }
      }

      const images = []
      /** 分页截图 */
      screenshotOpts.type = 'jpeg'

      /** 高度 不传参则为4000 */
      const height = typeof data.multiPage === 'number' ? data.multiPage : (box.height >= 4000 ? 4000 : box.height)
      /** 分页数量 */
      const count = Math.ceil(box.height / height)

      for (let i = 0; i < count; i++) {
        let y = i * height
        let clipHeight = Math.min(height, box.height - i * height)

        if (i !== 0) {
          y -= 100
          clipHeight += 100
        }

        /** 截图位置 */
        screenshotOpts.clip = { x: 0, y, width: box.width, height: clipHeight }

        /** 截图 */
        const buff = await body.screenshot(screenshotOpts)
        /** 计算图片大小 */
        const kb = (buff.length / 1024).toFixed(2) + 'KB'
        /** 次数+1 */
        this.renderNum++
        images.push('base64://' + buff)
        logger.mark(`[图片生成][${name}][${this.renderNum}次] ${kb} ${Date.now() - start}ms`)
      }

      this.shoting.pop()
      if (data.hash) HttpServer.file.delete(data.hash)
      return { ok: true, data: images }
    } catch (error) {
      logger.error(`[图片生成][${name}] 图片生成失败, 是否重试：${opts.retry}`)
      logger.error(error)
      if (opts.retry) {
        /** 重试一次看看 */
        return this.screenshot(data, { retry: false })
      } else {
        return { ok: false, data: `[图片生成][${name}] 图片生成失败：${error.toString()}` }
      }
    } finally {
      if (!this.debug) page.close().catch((err) => logger.error(err))
      logger.debug(`[队列] ${this.shoting.length}`)
    }
  }

  /**
   * 视窗参数
   * @param {data} data 截图参数
   * @returns {{
   *  width: number,
   *  height: number,
   *  deviceScaleFactor: number
   * }|false} 视窗参数
   */
  setViewport (data, box) {
    /** 视窗大小和设备像素比 */
    if (data.setViewport) {
      const { width = 1920, height = 1080, deviceScaleFactor = 1 } = data.setViewport
      return {
        width: Math.round(box.width || width),
        height: Math.round(box.height || height),
        deviceScaleFactor
      }
    } else if (Config.puppeteer.setViewport.enable) {
      const { useBody, width, height, deviceScaleFactor = 1 } = Config.puppeteer.setViewport
      if (useBody) {
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          deviceScaleFactor
        }
      }

      return {
        width: Math.round(width),
        height: Math.round(height),
        deviceScaleFactor
      }
    }
    return false
  }
}

const Puppeteer = new Client()
await Puppeteer.browserInit()

export default Puppeteer
