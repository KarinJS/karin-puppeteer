import fs from 'node:fs'
import logger from '../log.js'
import puppeteer from 'puppeteer'
import { Config, sleep, tempFile } from '../common/common.js'

class Puppeteer {
  constructor () {
    this.tempFile = tempFile
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
  }

  /** 初始化chromium */
  async browserInit (normal = false) {
    if (this.chromium) return this.chromium
    let list = []
    if (!normal) {
      /** 从JSON文件读取保存的websocket地址 */
      list = JSON.parse(fs.readFileSync(this.tempFile, 'utf-8')) || []
      for (let index in list) {
        index = Number(index)
        if (!list[index]) {
          /** 移除无效的websocket地址 */
          delete list[index]
          continue
        }
        const chromium = await this.connect(list[index])
        if (chromium) {
          this.chromium = chromium
          return this.chromium
        } else {
          delete list[index]
        }
      }
    } else {
      /** 清空JSON文件读取保存的websocket地址 */
      this.closeAll(list)
      fs.writeFileSync(this.tempFile, JSON.stringify([]))
    }

    /** 检查开发者是否传入websocket */
    if (Config.puppeteerWS) {
      const chromium = await this.connect(Config.puppeteerWS)
      if (chromium) {
        this.chromium = chromium
        return this.chromium
      }
    }

    /** puppeteer配置 */
    const { headless, args } = Config
    const config = { headless, args }

    /** 检查开发者是否传入自定义chromium地址 */
    if (Config.chromiumPath) {
      /** 使用fs检查 */
      if (fs.existsSync(Config.chromiumPath)) {
        /** 自定义路径 */
        config.executablePath = Config.chromiumPath
      } else {
        logger.error('puppeteer Chromium 自定义地址不存在：', Config.chromiumPath)
      }
    }

    logger.info('puppeteer Chromium 启动中...')

    /** 如果没有实例，初始化puppeteer chromium */
    try {
      const chromium = await puppeteer.launch(config)
      logger.info('puppeteer Chromium 启动成功')
      logger.info(`[Chromium] ${chromium.wsEndpoint()}`)
      /** 保存websocket地址到JSON文件 */
      list.push(chromium.wsEndpoint())
      /** 排除空值 */
      const newList = []
      list.forEach(item => item && newList.push(item))
      fs.writeFileSync(this.tempFile, JSON.stringify(newList))

      this.chromium = chromium
      /** 监听Chromium事件 */
      this.listen()
      return this.chromium
    } catch (error) {
      let errMsg = error.toString() + (error.stack ? error.stack.toString() : '')

      if (errMsg.includes('Could not find Chromium')) {
        logger.error('没有正确安装 Chromium，可以尝试执行安装命令：node init')
      } else if (errMsg.includes('cannot open shared object file')) {
        logger.error('没有正确安装 Chromium 运行库')
      }

      logger.error(errMsg)
      return false
    }
  }

  /** 关闭全部链接 */
  async closeAll (list) {
    try {
      if (!list) return
      for (let index in list) {
        index = Number(index)
        if (!list[index]) {
          delete list[index]
          continue
        }
        const chromium = await this.connect(list[index])
        if (chromium) {
          try {
            await chromium.close().catch((err) => logger.error(err))
          } catch (e) {
            logger.error(`关闭ws链接${list[index]}失败：${e.toString()}`)
          }
        }
      }
    } catch (e) {
      logger.error(`关闭全部链接失败：${e.toString()}`)
    }
  }

  /** 传入websocket，连接已有的chromium */
  async connect (browserWSEndpoint) {
    try {
      logger.info(`puppeteer Chromium from ${browserWSEndpoint}`)
      const chromium = await puppeteer.connect({ browserWSEndpoint })
      logger.info('puppeteer Chromium 已连接启动的实例：', browserWSEndpoint)
      return chromium
    } catch {
      logger.error('puppeteer Chromium 连接失败：', browserWSEndpoint)
      return false
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
  }

  /** 关闭浏览器 */
  async close () {
    if (this.chromium) {
      await this.chromium?.close().catch((err) => logger.error(err))
      this.chromium = false
      logger.info('Chromium 实例已关闭！')
    }
  }

  /** 重启浏览器 */
  async restart (normal) {
    if (!this.init) {
      if (this.createPageCount >= Config.createPageCount) {
        logger.info(`当前队列数量：${this.shoting.length}`)
        if (this.shoting.length <= 0) {
          if (normal) logger.mark(`当前页面创建数量[${this.createPageCount}]已达到达到单次最大值[${Config.createPageCount}]，1秒后将重启浏览器...`)
          this.init = true
          this.createPageCount = 0
          // await sleep(5000)
          await this.close()
          setTimeout(async () => {
            await this.browserInit(true)
            this.init = false
          }, 100)
        }
      }
      return true
    }
    await this.isInit()
  }

  /** 检查初始化 */
  async isInit () {
    /** 未初始化 进行初始化 */
    if (!this.init) {
      this.init = true
      await this.browserInit()
      this.init = false
      return true
    }

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
   * `chromium` 截图
   * @param name 模板名称
   * @param data 模板参数
   * @param opts 其它参数
   * @param data.savePath html模板路径、必传
   * @param data.imgType  screenshot参数，生成图片类型：jpeg，png
   * @param data.quality  screenshot参数，图片质量 0-100，jpeg是可传，默认90
   * @param data.omitBackground  screenshot参数，隐藏默认的白色背景，背景透明。默认不透明
   * @param data.path   screenshot参数，截图保存路径，需使用请传递绝对路径，默认不保存
   * @param data.multiPage 是否分页截图，默认false
   * @param data.multiPageHeight 分页状态下页面高度，默认4000
   * @param data.pageGotoParams 页面goto时的参数
   * @param data.setViewport 页面视窗大小和设备像素比 默认1920*1080、1
   * @param opts.retry 是否重试，默认true
   * @return {Promise<string|string[]|boolean>} 图片base64数据或false
   */
  async screenshot (name, data = {}, opts = { retry: true }) {
    const init = this.init
    if (init) {
      logger.info(`[图片生成][${name}] 初始化中...`)
    }
    /** 初始化 */
    // if (!this.chromium) await this.isInit()
    const initFlag = await this.isInit()
    if (!initFlag) {
      logger.error(`[图片生成][${name}] 初始化失败`)
      return { ok: false, data: `[图片生成][${name}] 初始化失败` }
    } else if (init) {
      this.shoting = []
      logger.info(`[图片生成][${name}] 初始化完成`)
    }

    /** 打开页面数+1 */
    this.createPageCount++

    /** 分页状态下页面高度，默认4000 */
    const pageHeight = data.multiPageHeight || 4000

    /** html模板路径 */
    let savePath = data.savePath
    if (!fs.existsSync(savePath) && !savePath.startsWith('http')) return { ok: false, data: `[图片生成][${name}] 缺少模板路径` }
    /** 如果非http路径，添加前缀 */
    if (!savePath.startsWith('http')) {
      savePath = 'file://' + savePath
    }

    /** waitUntil参数处理 */
    if (Config.waitUntil || Config.waitUntil === false) {
      if (!data.pageGotoParams) data.pageGotoParams = {}
      if (!Config.waitUntil) {
        delete data.pageGotoParams.waitUntil
      } else {
        data.pageGotoParams.waitUntil = Config.waitUntil
      }
    }

    /** 截图数据 */
    let buff = ''
    /** 开始时间 */
    let start = Date.now()

    /** 截图返回值 */
    let ret = []
    this.shoting.push(name)
    try {
      /** 创建页面 */
      const page = await this.chromium.newPage()
      /** 页面goto时的参数 */
      let pageGotoParams = { timeout: Config.timeout, ...data.pageGotoParams || {} }
      /** 加载html */
      await page.goto(savePath, pageGotoParams)
      /** 获取页面元素 */
      let body = await page.$('#container') || await page.$('body')
      /** 计算页面高度 */
      const boundingBox = await body.boundingBox()

      /** 默认分页数 */
      let num = 1

      const { imgType = 'jpeg', omitBackground = false, quality = 90, path = '' } = data

      /** 截图参数 */
      const randData = {
        path,
        quality,
        type: imgType,
        omitBackground,
        encoding: 'base64'
      }

      /** 设置视窗大小和设备像素比 */
      const { width = 1920, height = 1080, deviceScaleFactor = 1 } = data.setViewport || {}
      await page.setViewport({ width, height, deviceScaleFactor })

      /** 分页截图 */
      if (data.multiPage) {
        randData.type = 'jpeg'
        num = Math.round(boundingBox.height / pageHeight) || 1
      }

      if (data.imgType === 'png') {
        delete randData.quality
      }

      if (!data.multiPage) {
        buff = await body.screenshot(randData)
        /** 计算图片大小 */
        const kb = (buff.length / 1024).toFixed(2) + 'KB'
        /** 次数+1 */
        this.renderNum++
        logger.mark(`[图片生成][${name}][${this.renderNum}次] ${kb} ${Date.now() - start}ms`)
        ret.push(buff)
      } else {
        /** 分页截图 */
        if (num > 1) {
          await page.setViewport({
            width: boundingBox.width,
            height: pageHeight + 100
          })
        }

        for (let i = 1; i <= num; i++) {
          if (i !== 1 && i === num) {
            await page.setViewport({
              width: boundingBox.width,
              height: parseInt(boundingBox.height) - pageHeight * (num - 1)
            })
          }
          if (i !== 1 && i <= num) {
            await page.evaluate(pageHeight => window.scrollBy(0, pageHeight), pageHeight)
          }
          /** 截图 */
          buff = num === 1 ? await body.screenshot(randData) : buff = await page.screenshot(randData)
          if (num > 2) await sleep(200)

          /** 计算图片大小 */
          const kb = (buff.length / 1024).toFixed(2) + 'KB'
          /** 次数+1 */
          this.renderNum++
          logger.mark(`[图片生成][${name}][${i}/${num}] ${kb}`)
          ret.push(buff)
        }
        if (num > 1) {
          logger.mark(`[图片生成][${name}] 处理完成`)
        }
      }
      /** 关闭页面 */
      page.close().catch((err) => logger.error(err))
    } catch (error) {
      logger.error(`[图片生成][${name}] 图片生成失败：${error}, 是否重试：${opts.retry}`)
      if (opts.retry) {
        /** 重试一次看看 */
        /** 关闭浏览器 */
        // if (this.chromium) await this.restart()
        return this.screenshot(name, data, { retry: false })
      } else {
        ret = []
        // if (this.chromium) await this.restart()
        return { ok: false, data: `[图片生成][${name}] 图片生成失败：${error.toString()}` }
      }
    }
    this.shoting.pop()

    this.restart(true)

    if (ret.length === 0 || !ret[0]) {
      logger.error(`[图片生成][${name}] 图片生成为空`)
      return { ok: false, data: `[图片生成][${name}] 图片生成为空` }
    }

    /** 加前缀 */
    ret.forEach((item, index) => {
      ret[index] = 'base64://' + item
    })

    return { ok: true, data: data.multiPage ? ret : ret[0] }
  }
}

export default Puppeteer
