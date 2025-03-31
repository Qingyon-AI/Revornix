# next-web-app-template 通用前端初始框架

> 为了方便自己的开发流程，将一些常用的组件和配置搭建为模版，方便快速开发。

![image](https://oss.kinda.info/image/202501112112695.png)

> [!TIP]
> 需要搭配后端template使用。

[后端template](https://github.com/Alndaly/fastapi-template)，注意后端框架基于FastAPI，如果不擅长该框架或者不熟悉的话请先了解[FastAPI框架使用文档](https://fastapi.tiangolo.com)。

前端框架NextJS，默认基于**app router**。

## 集成环境

- [NextJS](https://nextjs.org)
- [tailwindcss](https://tailwindcss.com) css框架
- [shadcn/ui](https://ui.shadcn.com) 组件样式
- [typescript](https://www.typescriptlang.org)
- [zustand](https://zustand.docs.pmnd.rs/getting-started/introduction) 数据状态管理库

## 配置详解

大部分的配置项都在`src/config`目录下。

### `src/config/api.ts`

- `API_PREFIX` 接口前缀，根据你实际后端项目的接口地址修改。
- `LOGIN_WS_URL` websocket接口前缀，同样根据你实际后端项目的接口地址修改。

### `src/config/router.ts`

如果想要使用`TopNav`组件的话务必基于你的实际路由完善该文件，该组件将会基于实际的网络路径和路由配置生成导航栏。如果不需要该组件，直接改动源码去掉该组件即可。
