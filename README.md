# 简介

适用于 [Karin](https://github.com/KarinJS/karin.git) 的`Puppeteer`  
本仓库使用的`Puppeteer`是`13.7.0`版本的，不推荐使用外置`chromium`
---

## 克隆仓库

```bash
git clone https://github.com/KarinJS/karin-puppeteer.git
```

## 进入目录

```bash
cd karin-puppeteer
```

## 安装依赖

> [!IMPORTANT]
> 中国大陆服务器请使用`cnpm`下载依赖`(自己什么网络你心里没点逼数嘛~)`
> 以下方式任选其一即可......

<details><summary>cnpm</summary>

```bash
# 使用官方源(国外服务器)安装
npm install -g cnpm

# 如果安装失败，请指定国内源npmmirror.com安装
npm --registry=https://registry.npmmirror.com install cnpm -g
```

```bash
cnpm install -P
```

</details>

<details><summary>npm</summary>

```bash
npm install -P
```

</details>

<details><summary>pnpm</summary>

```bash
npm install -g pnpm
```

```bash
pnpm install -P
```

</details>

<details><summary>yarn</summary>

```bash
npm install -g yarn
```

```bash
yarn install -P
```

</details>


## 前台启动

```bash
node .
```

## 后台运行

```bash
# 启动
pnpm start

# 停止
pnpm stop

# 重启
pnpm restart

# 查看日志
pnpm run log
```

## 配置文件

> [!IMPORTANT]
> 可修改：`config/config.yaml`  
> 无效修改项：`config/config_default.yaml`

目前提供了两种连接方式，`WebSocket`和`Http`。  

### `WebSocket(默认)`: 
  - 优点
    - 无需占用端口，无需修改`karin`的配置，开箱即用。
  - 缺点：
    - 需要将`karin-puppeteer`和`karin`放在同一台服务器、电脑上

可配置多个`karin`服务端，在配置文件添加`karinUrl`地址即可

```yaml
# 同时连接3个karin服务端
# karin 地址 可填写多个
karinUrl:
  - "ws://localhost:7000/puppeteer" # 默认地址
  - "ws://localhost:7001/puppeteer" # 地址1
  - "ws://localhost:7002/puppeteer" # 地址2

```

### `Http(拓展)`: 
  - 优点
    - 可以将`karin-puppeteer`和`karin`放在不同的服务器上、不同的网络环境
    - 如果`karin`有公网环境，可以连接公共的`karin-puppeteer`服务而做到`远程渲染`!
  - 缺点：
    - 需要占用端口，`karin`需要另外配置对应的插件
    - 需要跟`karin`在一个内网或者都处于公网环境，因为需要`互相访问`...
    - 需要将`karin`作为一个`express`服务器运行`(可能...会有安全问题?)`

此方式为扩展方式，默认关闭

```yaml
# HTTP 服务配置
http:
  # 是否启用
  enable: false
  # HTTP 服务端口
  port: 7005
```