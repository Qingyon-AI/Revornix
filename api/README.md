# Revornix项目的后端

注意这个后端的设计所有的crud不做主动提交，所以在接口处需要最后进行一次`db.commit()`

## 任务设计

celery负责任务序列，apscheduler任务负责定时调度，两者结合可保证不会过载，避免瞬间任务过多导致服务崩溃。

TODO:

- 考虑把伪删除改为做另外一个单独的数据库存放删除数据，保存一定时间防止用户误删。同时也缓解当前数据库的压力。
- 考虑到milvus的defaultModel训练数据不含中文，对中文embedding效果着实较差，打算修改embedding模型为https://github.com/netease-youdao/BCEmbedding/blob/master/README_zh.md