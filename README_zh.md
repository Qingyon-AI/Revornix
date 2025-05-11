# Revornix

> 当我起名的时候，我联想到的是这个碎片化的时代，以及如何要在这个时代中发展自己。于是结合了「重生Rebirth」与「漩涡Vortex」之意，寓意在碎片中涅槃重生。

AI时代的资讯管理工具。Revornix可以帮助你便捷整合所有可见资讯，并在特定时间给你一份完整的报告。

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260003067.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260004562.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260004883.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260008198.png)

# 快速开始

## Docker 方式（建议）

### 克隆仓库到本地

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 环境变量配置

```shell
cp ./envs/.api.env.example ./envs/.api.env
cp ./envs/.file.env.example ./envs/.file.env
cp ./envs/.celery.env.example ./envs/.celery.env
cp ./envs/.hot.env.example ./envs/.hot.env
```

前往对应的环境变量文件配置，详情见[环境变量配置篇章](environment)

在 web 子目录下添加如下文件，用于配置前端环境变量

```shell filename=".env"
NEXT_PUBLIC_API_PREFIX='http://localhost/api/main-service'
NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX='ws://localhost/api/main-service/notification/'
NEXT_PUBLIC_FILE_API_PREFIX='http://localhost/api/file-service'
NEXT_PUBLIC_DAILY_HOT_API_PREFIX='http://localhost/api/daily-hot-service'
```

### docker 拉取必要仓库并启动

```shell
docker compose up -d
```

当所有服务均启动之后，访问 http://localhost 即可看到前端页面，注意由于后端服务启动时间较长，前端可能需要等待一段时间（正常情况下为 3-5 分钟左右）才能正常请求接口，可以通过`docker compose logs api`查看核心后端服务启动状态。


## 手动部署方式

除非你需要自己修改部分源码适配自定义功能，否则不建议使用这种。流程确实会比较复杂。

> [!WARNING]
> 强烈建议使用 conda 针对每个服务创建不同的 python 虚拟环境，因为不同服务之间的python依赖可能存在冲突。当然如果你有别的python虚拟环境管理工具，也可以使用别的。

### 克隆仓库到本地

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### 环境变量配置

```shell
cp ./envs/.api.env.example ./api/.env
cp ./envs/.file.env.example ./file-backend/.env
cp ./envs/.celery.env.example ./celery-worker/.env
cp ./envs/.hot.env.example ./daily-hot/.env
```

请在`./api/.env`和`./file-backend/.env`文件中补充如下内容：

```
ENV=dev
```

在 web 子目录下添加如下文件，用于配置前端环境变量

```shell filename=".env"
NEXT_PUBLIC_API_PREFIX='http://localhost/api/main-service'
NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX='ws://localhost/api/main-service/notification/'
NEXT_PUBLIC_FILE_API_PREFIX='http://localhost/api/file-service'
NEXT_PUBLIC_DAILY_HOT_API_PREFIX='http://localhost/api/daily-hot-service'
```

前往对应的环境变量文件配置，详情见[环境变量配置篇章](https://revornix.com/docs/environment)

### 初始化一些必要的数据

```shell
cd api
python -m script.init_vector_base_data
python -m script.init_sql_base_data
```

### 安装并且启动基础服务

> [!NOTE]
> 如果你没有安装mysql和redis以及milvus，那么你需要手动在本地安装这些服务，并修改环境变量文件中的对应参数配置。
> 
> 考虑到这些属于比较麻烦且不重要的工作，我特地做了一个`docker-compose-local.yaml`文件，你可以直接使用这个文件下载并且启动这些服务。

> [!WARNING]
> 注意：如果你本地已经安装了其中的部分服务，请按照你的实际情况在`docker-compose-local.yaml`文件中关闭对应的服务配置，否则可能会引起一些意料之外的情况。

```shell
docker compose -f ./docker-compose-local.yaml up -d 
```

### 启动核心后端服务

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### 启动热搜聚集服务

```shell
cd daily-hot
pnpm i 
pnpm dev
```

### 启动文件后端服务

```shell
cd file-backend
conda create -n file-backend python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8002
```

### 启动 celery 任务序列

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app.celery_app worker --loglevel=info --pool threads
```

### 启动前端服务

```shell
cd web
pnpm i
pnpm dev
```

当你将所有服务均启动之后，访问 http://localhost:3000 即可看到前端页面
