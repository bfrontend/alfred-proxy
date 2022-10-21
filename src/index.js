'use strict'
const path = require('path')
const YAML = require('yamljs')
const { execSync } = require('child_process')
const argv = omit(require('minimist')(process.argv.slice(2)), ['_'])
const USER_HOME = process.env.HOME || process.env.USERPROFILE
const configPath = path.resolve(USER_HOME, '.proxyswitcher.rc')
const proxyConfig = YAML.load(configPath)
const keyMap = {
    'AutoDiscoveryProxy':'proxyautodiscovery',
    'AutoProxy':'autoproxy',
    'SocksProxy':'socksfirewallproxy',
    'HTTPProxy':'webproxy',
    'HTTPSProxy':'securewebproxy',
    'FTPProxy':'ftpproxy',
    'RTSPProxy':'streamingproxy',
    'GopherProxy':'gopherproxy'
}
function omit(obj, keys) {
  const result = {}
  Object.keys(obj).forEach(key => {
    if (!keys.includes(key)) {
      result[key] = obj[key]
    }
  })
  return result
}
function getService() {
  const serviceId = execSync(`printf "open\nget State:/Network/Global/IPv4\nd.show" | \
  scutil | grep "PrimaryService" | awk '{print $3}'`,{encoding: 'utf8'})
  return execSync(`printf "open\nget Setup:/Network/Service/${serviceId}\nd.show" |\
  scutil | grep "UserDefinedName" | awk -F': ' '{print $2}'`,{encoding: 'utf8'})
}

const serviceName = getService().replace(/[\r\n]/g, '')
function getItemInfo(item) {
  const getInfoShell = (name, service) => {
    const joinStr = /^AutoProxy/.test(name) ? 'url' : ''
    return `networksetup -get${keyMap[name]}${joinStr} ${service}`
  }
  const statusStr = execSync(getInfoShell(item, serviceName),{encoding: 'utf8'})
  const status = parseInfoStr(statusStr)
  return status || {}
}
function parseInfoStr (str) {
  return str.split(/[\r\n]/g).reduce((pre, line) => {
    const [key, val = ''] = line.split(':')
    if (key) {
      pre[key] = val.replace(/^\s+|\s+$/g, '')
    }
    return pre
  }, {})
}
function changeItemStatus(item, status, options) {
  const changeStatusShell = (name, service) => {
    if (/^AutoProxy/.test(name)) {
      return status
        ? `networksetup -set${keyMap[name]}url ${serviceName} ${options.URL}`
        : `networksetup -set${keyMap[name]}state ${serviceName} off`
    } else if (/^AutoDiscoveryProxy/.test(name)){
      return `networksetup -set${keyMap[name]} ${serviceName} ${status ? 'on' : 'off'}`
    } else {
      return status
        ? `networksetup -set${keyMap[name]} ${serviceName} ${options.Host} ${options.Port}`
        : `networksetup -set${keyMap[name]}state ${serviceName} off`
    }
  }
  execSync(changeStatusShell(item, serviceName),{encoding: 'utf8'})
}
function divideItem() {
  const autoList = []
  const systemList = []
  const items = Object.keys(proxyConfig)
  items.forEach(key => {
    if (/^Auto/.test(key)) {
      autoList.push(key)
    } else {
      systemList.push(key)
    }
  })
  return { autoList, systemList }
}
const {autoList, systemList} = divideItem()
function generateItems() {
  const baseItems = [
    {
      key: 'autoProxy',
      label: '自动代理',
      status: autoList.length > 0 ? getItemInfo(autoList[0]).Enabled === 'Yes' : false
    },
    {
      key: 'systemProxy',
      label: '系统代理',
      status: systemList.length > 0 ? getItemInfo(systemList[0]).Enabled === 'Yes' : false
    }
  ]
  return baseItems.map(item => {
    return {
      title: item.label,
      subtitle: item.status ? '已开启' : '未开启',
      autocomplete: item.label,
      icon:{
        path: item.status ? 'On.png' : 'Off.png'
      },
      arg: JSON.stringify({
        key: item.key,
        status: !item.status
      })
    }
  })
}


function run(arg) {
  if (Object.keys(arg).length) {
    const target = JSON.parse(arg.type)
    const todos = target.key === 'systemProxy' ? systemList : autoList
    todos.forEach(key => {
      changeItemStatus(key, !!target.status, proxyConfig[key])
    })
    const statusMsg = target.status ? '开启' : '关闭'
    console.log(target.key === 'systemProxy' ? `系统代理${statusMsg}成功` : `自动代理${statusMsg}成功`)
  } else {
    console.log(JSON.stringify({
      items: generateItems()
    }))
  }
}

run(argv)