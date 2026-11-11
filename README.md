# LiteLLM 中文发行层

[![汉化层检查](https://github.com/le-shi/litellm-zh/actions/workflows/test.yml/badge.svg)](https://github.com/le-shi/litellm-zh/actions/workflows/test.yml)
[![中文镜像发布](https://github.com/le-shi/litellm-zh/actions/workflows/release.yml/badge.svg)](https://github.com/le-shi/litellm-zh/actions/workflows/release.yml)

在上游 [BerriAI/litellm](https://github.com/BerriAI/litellm) 的正式发行版上应用独立中文转换层，再使用该版本的原始 Dockerfile 构建镜像。固定显示中文，不新增语言切换、前端国际化框架、后端接口或数据库迁移。

## 获取镜像

```yaml
services:
  litellm:
    image: ghcr.io/le-shi/litellm:v1.109.0-zh
```

以上只展示镜像替换位置，不是完整部署配置。保留自己的配置、环境变量、数据库、卷、端口和重启策略。支持 `linux/amd64` 与 `linux/arm64`。生产环境建议进一步固定镜像摘要，正式发布的版本标签不自动覆盖。

命名映射：

```text
ghcr.io/berriai/litellm:v1.108.4
                 ↓
ghcr.io/le-shi/litellm:v1.108.4-zh
```

镜像是否已产出以 [Releases](https://github.com/le-shi/litellm-zh/releases) 和发布流程结果为准，不把仓库创建、脚本测试成功当作镜像可用。

## 自动同步与发布

- 每六小时检查一次上游正式 Release，也可在 Actions 中手动运行并指定 `vX.Y.Z`。
- 只处理版本号 `>= 1.108.0`、`draft=false`、`prerelease=false` 的 Release。拒绝 RC、beta、预览版本、分支名和单独存在但没有正式 Release 的 Git Tag。
- 自动模式从官方 latest 和最近 100 个 Release 中选择数值最大的正式版本，防止旧维护分支后发补丁造成版本倒退。默认只处理最新版本，不批量补发全部历史版本；可手动构建其他符合门槛的正式版。
- 先把 Tag 解析为精确提交 SHA，再 checkout。汉化后检查源码语法和前端类型，再构建两个架构的镜像。
- 两个架构均通过无网络的镜像内版本、中文 HTML 和中文 bundle 检查后，才发布统一镜像标签和正式 Release。
- Release 附件保留原始上游源码、中文源码、翻译报告、构建溯源、镜像索引和 SHA256 校验清单。
- 发布源码位于 `releases/vX.Y.Z-zh` 分支，Release Tag 为 `vX.Y.Z-zh`。主分支只维护本仓库的转换程序、词库和发布编排，不和上游进行日常 merge。
- 上游 workflows 原文保留在发行源码的 `.zh/upstream-workflows/`，不在本仓库触发其 Issue 管理、内部部署或全量测试任务。上游原始附件保留原路径。发布只使用本仓库明确审查的编排。

GitHub 定时任务不保证准点，且无活动的公开仓库可能被 GitHub 停用定时工作流；停用后需要手动重新启用。

## “复用上游构建”的准确边界

上游 `.github/workflows/test-merge-smoke.yml` 的 `dashboard-build` job 使用 `docker build --target ui-builder -f Dockerfile .`，但没有 `workflow_call`；公开仓库也未提供可供外部调用的完整镜像发布 reusable workflow。因此不能用 `uses: BerriAI/litellm/...` 直接调用这个 job。

本项目复用每个正式版本的原始根目录 Dockerfile、其中的 `ui-builder` 阶段、锁文件、Node/UI/Python/Rust/Prisma 构建链和启动入口。本仓库 Actions 仅提供同步、汉化、调用原始构建、检查和 GHCR 推送编排，不复制或维护第二份 Dockerfile。原始 Dockerfile 和公开构建 workflow 的 SHA256 会记入 `provenance.json`；入口结构变化时停止发布，待人工适配，不静默套用旧配方。

## 汉化范围与安全边界

词库初始复用 [此前的中文界面贡献](https://github.com/BerriAI/litellm/pull/48257) 的 8,131 个词条。通过 TypeScript 语法树精确匹配 JSX 文案、显示属性、通知和有限的本地显示配置；已有 i18next 的版本复用其词库键和占位符，只转换显示值。默认 HTML 语言为 `zh-CN`。

不会扫描或替换浏览器 DOM；不会翻译用户输入、API 返回值、模型回复、模型名、密钥别名、路由、状态判断、枚举值、表单提交值、代码块和业务请求字段。不改后端、认证、授权、模型调用、数据库 schema、锁文件或 Dockerfile。不修改 `enterprise/`，相关文件及许可证沿用上游。

**独立不等于永远免维护，也不代表全站 100% 汉化。** 新增文案、复杂动态文案、受保护的业务字符串、外部包界面和未命中的文案保留英文；每次输出 `translation-report.json`，可据此补词库或适配规则。覆盖量低于配置门槛、入口漂移、语法或类型错误时不发布镜像。中文层不修复上游业务缺陷，不保证上游新版本本身没有漏洞或兼容问题。

## 本地使用

需要 Node.js 24、Git，以及待转换版本的干净上游 checkout：

```bash
npm ci --ignore-scripts
npm test
node scripts/apply.mjs /path/to/clean/litellm
docker build -t ghcr.io/le-shi/litellm:v1.109.0-zh /path/to/clean/litellm
```

`apply.mjs` 只应用中文层，不发布、不修改 Git 分支。相同转换结果可以重复检查；词库或已经转换的文件发生变化时，必须使用干净上游源码重新生成，不能叠加不同汉化层。

## 发布权限与恢复

工作流只使用当前仓库的 `GITHUB_TOKEN`：发现和准备阶段只读，构建阶段仅增加 `packages: write`，正式发布阶段增加 `contents: write`。无需配置长期 PAT，不会推送到 BerriAI 或原来的 `le-shi/litellm`。第三方 Actions 固定到提交 SHA，转换器依赖 TypeScript 5.9.3 并提交锁文件。

GHCR 新包可能默认为私有。首次发布后需确认包的可见性；如未继承公开设置，在包设置中改为 Public，才能匿名拉取。

失败不会生成正式 Release。可重跑失败 job；如果发布阶段已创建同内容源码分支或镜像，会核对内容后继续。已发布的正式版本或内容不同的同名镜像拒绝覆盖；需要修正已发布版本时先明确新的版本策略，不由定时任务改写旧版本。

## 升级提醒

`-zh` 不改变上游升级要求。从 1.91.0 跨版本升级时仍需备份数据库，并在恢复副本上验证迁移；回滚镜像不能撤销数据库迁移。保留原有主密钥、加密盐和业务配置。镜像内静态检查不等于登录、权限、模型请求或生产环境验收。

## 许可证与来源

本仓库中文层采用 MIT；上游源码按上游各目录许可证提供。见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)。
