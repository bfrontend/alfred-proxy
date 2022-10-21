## alfred workflow 切换自动代理(pac) 及 系统代理的小工具

> 使用前请创建代理相关的文件

```shell
# 文件名 `${process.env.HOME}/.proxyswitcher.rc`
AutoProxy:
  URL: "http://127.0.0.1:11085/pac/proxy.js"  # URL of pac file
SocksProxy:
  Host: 127.0.0.1
  Port: 7891
HTTPProxy:
  Host: 127.0.0.1
  Port: 1087
  Auth: false
HTTPSProxy:
  Host: 127.0.0.1
  Port: 1087
  Auth: false
```
