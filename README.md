# OP 工具反馈中心

面向大区用户、平台管理员和 AI 开发者的问题反馈闭环平台。项目采用原生 HTML/CSS/JavaScript 前端、Node.js API 和 Oracle 数据库，可直接制作镜像部署到 K8s。

## 已实现

- 大区用户注册/登录、提交问题或建议、上传附件或问题截图、模糊查询本人反馈、补充记录、验证关闭
- 管理员总览、反馈受理、优先级、开发负责人、预计完成时间、状态流转、用户启停、创建管理员
- 9 位预置管理员和 1 个 AI 开发者账号；密码以 `scrypt` 加盐哈希保存
- AI 开发者按低风险规则分析和认领 Bug，K8s CronJob 每天 09:00 触发巡检
- Oracle 持久化，附件以 BLOB 保存，表统一使用 `OPFB_` 前缀；浏览器不保存业务数据
- 存活检查 `/health/live`，数据库就绪检查 `/health/ready`
- 反馈提交使用客户端请求号和 Oracle 唯一索引防止连续点击或网络重试产生重复记录

## 目录

```text
index.html / app.js / styles.css  前端
server/                           Node.js API、Oracle 连接、迁移脚本
deploy/                           K8s Deployment、Service、CronJob 示例
Dockerfile                        生产镜像
```

## 首次建库

复制 `.env.example` 为本机 `.env`，填入测试库连接、两个初始密码和随机密钥。`.env` 已加入 `.gitignore`，不要提交。

```powershell
npm install
npm run db:migrate
```

迁移会幂等创建 `OPFB_USERS`、`OPFB_ISSUES`、`OPFB_TIMELINE`、`OPFB_ATTACHMENTS`、`OPFB_AI_RUNS`、编号序列和索引，并确保 9 位管理员及 AI 开发者账号存在。

每条反馈最多上传 5 个附件，单个文件不超过 10 MB。支持常用图片、PDF、Office、TXT 和 ZIP；附件下载会校验反馈查看权限。

## 本地启动

```powershell
npm start
```

打开 `http://localhost:4173`。修改后端时可使用 `npm run dev` 自动重启。

## Docker 与 K8s

```powershell
docker build -t your-registry/op-feedback:1.0.0 .
docker push your-registry/op-feedback:1.0.0
```

1. 修改 `deploy/k8s.yaml` 中的镜像地址和 Oracle 连接串。
2. 参照 `deploy/secret.example.yaml` 在集群中创建 `op-feedback-secret`；不要提交真实 Secret。
3. 执行 `kubectl apply -f deploy/k8s.yaml`。
4. 根据公司入口方式补充 Ingress、域名和 TLS。

Oracle 地址必须能从 K8s Pod 网络访问。`AUTH_SECRET` 和 `AI_CRON_SECRET` 建议使用至少 32 字节的独立随机值。

## 账号

管理员登录账号为姓名全拼：`wujianjun`、`jiangyifan`、`tanghao`、`liululu`、`qiuxulei`、`lihongpeng`、`liubingqi`、`liuguozheng`、`wangyang`。AI 账号为 `ai.developer`。初始密码取自首次迁移时的环境变量，不写入前端或仓库。
