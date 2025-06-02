# Revornix

[中文文档](./README_zh.md)

> When I came up with the name, I was inspired by the fragmented nature of this era and how one must evolve in it. Thus, I combined the meanings of “Rebirth” and “Vortex,” symbolizing a process of rebirth in the midst of fragmentation.

Revornix is an information management tool for the AI era. It helps you conveniently integrate all visible information and provides you with a comprehensive report at a specific time.

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260003067.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260004562.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260004883.png)

![](https://qingyon-revornix-public.oss-cn-beijing.aliyuncs.com/images/202504260008198.png)

# Quick Start

## Docker Method (Recommended)

### Clone the Repository Locally

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### Environment Variables Configuration

```shell
cp ./envs/.api.env.example ./envs/.api.env
cp ./envs/.file.env.example ./envs/.file.env
cp ./envs/.celery.env.example ./envs/.celery.env
cp ./envs/.hot.env.example ./envs/.hot.env
cp ./envs/.mcp.env.example ./envs/.mcp.env
```

Go to the corresponding environment variable files and configure them. For details, refer to Environment Variables Configuration.

In the web subdirectory, add the following file to configure the front-end environment variables:

```
NEXT_PUBLIC_API_PREFIX='http://localhost/api/main-service'
NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX='ws://localhost/api/main-service/notification/'
NEXT_PUBLIC_FILE_API_PREFIX='http://localhost/api/file-service'
NEXT_PUBLIC_DAILY_HOT_API_PREFIX='http://localhost/api/daily-hot-service'
```

### Pull Necessary Repositories and Start with Docker

```shell
docker compose up -d
```

Once all services are started, you can visit http://localhost to view the front-end page. Note that due to the back-end services taking longer to start, the front-end may need to wait for some time (usually around 3-5 minutes) before it can make successful requests. You can check the core back-end service status with docker compose logs api.

## Manual Deployment Method

This method is not recommended unless you need to modify the source code for custom features, as it can be more complex.

> [!WARNING]
> It is strongly recommended to create separate Python virtual environments for each service using conda, as there may be dependency conflicts between services. However, if you have another Python environment management tool, you may use that as well.

### Clone the Repository Locally

```shell
git clone git@github.com:Qingyon-AI/Revornix.git
cd Revornix
```

### Environment Variables Configuration

```shell
cp ./envs/.api.env.example ./api/.env
cp ./envs/.file.env.example ./file-backend/.env
cp ./envs/.celery.env.example ./celery-worker/.env
cp ./envs/.hot.env.example ./daily-hot/.env
cp ./envs/.mcp.env.example ./mcp-server/.env
```

In the ./api/.env and ./file-backend/.env files, add the following content:

```
ENV=dev
```

In the web subdirectory, add the following file to configure the front-end environment variables:

```
NEXT_PUBLIC_API_PREFIX='http://localhost/api/main-service'
NEXT_PUBLIC_NOTIFICATION_WS_API_PREFIX='ws://localhost/api/main-service/notification/'
NEXT_PUBLIC_FILE_API_PREFIX='http://localhost/api/file-service'
NEXT_PUBLIC_DAILY_HOT_API_PREFIX='http://localhost/api/daily-hot-service'
```

Go to the corresponding environment variable files for configuration. For details, refer to the Environment Variables Configuration.

### Initialize Necessary Data

```shell
cd api
python -m script.init_vector_base_data
python -m script.init_sql_base_data
```

### Install and Start Core Services

> [!NOTE]
> If you have not installed MySQL, Redis, and Milvus, you will need to install these services manually and modify the corresponding parameters in the environment variable files.

To simplify this, I have provided a docker-compose-local.yaml file, which you can use to download and start these services.

> [!WARNING]
> If you already have some of these services installed locally, make sure to disable the corresponding service configurations in the docker-compose-local.yaml file to avoid conflicts.

docker compose -f ./docker-compose-local.yaml up -d 

### Start MCP Server

```shell
cd mcp-server
pip install -r ./requirements.txt
fastapi run --port 8003
```

### Start Core Back-End Services

```shell
cd api
conda create -n api python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8001
```

### Start Hot Search Aggregation Service

```shell
cd daily-hot
pnpm i 
pnpm dev
```

### Start File Back-End Service

```shell
cd file-backend
conda create -n file-backend python=3.11 -y
pip install -r ./requirements.txt
fastapi run --port 8002
```

### Start Celery Task Queue

```shell
cd celery-worker
conda create -n celery-worker python=3.11 -y
pip install -r ./requirements.txt
celery -A common.celery.app.celery_app worker --loglevel=info --pool threads
```

### Start Front-End Service

```shell
cd web
pnpm i
pnpm dev
```

Once all services are started, you can visit http://localhost:3000 to view the front-end page.