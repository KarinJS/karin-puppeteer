import fs from 'fs'
import path from 'path'

/**
 * 创建目录
 * @param {string} dir 目录
 * @returns {boolean}
 */
export const mkdir = (dir) => {
  if (fs.existsSync(dir)) return
  mkdir(path.dirname(dir))
  fs.mkdirSync(dir)
  return true
}

/**
 * 睡眠
 * @param {number} ms 毫秒
 * @returns {Promise<void>}
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 校验是不是图片后缀
 * @param ext 后缀
 * @returns {boolean}
 */
export const isImgSuffix = (ext) => {
  return ['png', 'jpeg', 'jpg', 'webp', 'gif'].includes(ext)
}

export default {
  mkdir,
  sleep,
  isImgSuffix
}
