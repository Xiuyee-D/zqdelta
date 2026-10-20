# zqdelta 本地开发工作流

日常工作默认在本地，提交、推送和部署分别按用户授权执行。仓库为 `Xiuyee-D/zqdelta`；正式地址为 <https://xiuyee-d.github.io/zqdelta/>。英文默认，中文使用 `/zh/`；发布范围为 About、Projects、Blog、Awards，含真实项目与显式发布笔记。

本文按开发阶段提供操作入口，阶段结果与待办集中在 [开发阶段总览](DEVELOPMENT_STAGES.md)。日常维护直接更新对应阶段的当前结论；命令输出、截图和试验过程保存在忽略的测试目录，不逐次追加到本文。

## 阶段一：环境准备与预览

需要 Docker Engine、Git、Node/npm。主机 Ruby 可选；普通开发不需要 Python、CAD 或字体重建环境。`doctor` 会报告缺失工具，不执行主机系统安装。

```bash
./bin/dev doctor
./bin/dev setup
./bin/dev start
```

访问 <http://localhost:4000/zqdelta/> 或 <http://localhost:4000/zqdelta/zh/>。`setup` 构建 Ruby 3.3.5／Node 20 的隔离镜像并执行项目内 `npm ci`。默认 Debian 镜像源在 Dockerfile 内配置，可用 `DEBIAN_MIRROR=http://deb.debian.org ./bin/dev setup` 切换。容器依赖不写入主机系统。

```bash
./bin/dev status
./bin/dev logs
./bin/dev restart
./bin/dev stop
```

配置和依赖变化后重启预览。Gemfile、锁文件和 Dockerfile 的指纹决定镜像名称；变更后重新执行 `setup`。预览产物位于容器 `/tmp/_site`，正式 `./bin/dev build` 生成主机 `_site/`。两者都保留 `/zqdelta` 前缀，不通过清空 baseurl 检查路径。

Docker 无法直接拉取基础镜像时，可选用 `./bin/dev fetch-images`，下载工具仅保存在 `.dev-tools/`。不使用已移除的 Compose、Dev Container 或主机 Python 安装脚本。

## 阶段二：中文内容维护

| 内容                             | 中文源文件／目录                             |
| -------------------------------- | -------------------------------------------- |
| 关于我、共用侧栏、动态、教育背景 | `_pages/about-zh.md`                         |
| 论文                             | `_bibliography/publications.bib`             |
| 项目列表与项目正文               | `_pages/projects-zh.md`、`_projects/*.zh.md` |
| 博客列表和展示信息               | `_pages/blog-zh.md`、`_posts/*.zh.md`        |
| 共享中文笔记正文                 | `_includes/blog-content/*.md`                |
| 获奖                             | `_pages/awards-zh.md` 的 awards 数据         |
| 导航与交互文案                   | `_data/i18n/zh-CN.yml`                       |
| 联系方式                         | `_data/socials.yml`，仅邮箱、LinkedIn、ORCID |

八个栏目文件和一个辅助 404 通过 include 允许名单发布。新项目、文章默认私有，必须显式 `published: true`。CV、教学、独立论文保留源文件备用，不发布、不进入导航。动态直接在 about 内编辑，不恢复独立新闻集合。

### 项目 YAML 约定

见 [内容约定](CONTENT_CONTRACT.md#项目-yaml-约定)。字段、真实范围和例外覆盖集中在那里；布局使用的默认值集中在 `_config.yml`。方向和核心技术保持用户校对的值。详情不显示目录、阅读时长或独立成果区。

### 命名与附件

文件名、图片归属及稳定地址见 [命名约定](CONTENT_CONTRACT.md#命名与资料)。新图片填写实际宽高、alt 和说明，保持比例；不添加虚构封面。真实 PDF 等附件可放入 `assets/pdf/`；目录按需要创建，不保留示例文件。

### 项目插图来源

食品风味项目使用用户提供的系统图 `assets/img/projects/olfactory-flavor-perception/system-architecture.png`（2400×1350），只在模板提供本地化说明，不重绘图内中文。仍需保留的导入原稿见文末原始资料说明。

TARF 架构图直接来自只读论文源 `~/projects/msa_tact/paper/figures/fig_tarf_architecture.pdf`，渲染为 `assets/img/projects/multimodal-sentiment-analysis/tarf-architecture.png`（2400×1302），项目及首页论文共用。需要重新导出时，可使用已有 Poppler 工具；缺失时先报告，不安装主机依赖：

```bash
pdftoppm -scale-to-x 2400 -scale-to-y -1 -singlefile -png \
  ~/projects/msa_tact/paper/figures/fig_tarf_architecture.pdf \
  assets/img/projects/multimodal-sentiment-analysis/tarf-architecture
```

这两张图均按原比例行内展示，无点击跳转。源研究项目保持只读，不复制未公开稿件到站点。

## 阶段三：视觉与交互

统一字体、色彩、标题、栏宽和动效见 [视觉约定](PROJECT_PRESENTATION.md)，共用侧栏修改源仍为 about。先完成中文版的桌面与移动预览，再调整公共模板／样式；变更后执行浏览器回归。若修改 gem 覆盖，按文末升级流程审阅审计记录。不要将逐轮截图或已放弃的方案写入长期文档。

## 阶段四：英文同步

先修改中文、完成预览，再同步对应英文。页面 `_pages/*-zh.md` 对应无语言后缀的英文文件；项目用 `.zh.md`／`.en.md`；UI 使用两个语言 YAML。保持 `translation_key` 和地址对应。

博客只有一份正文：中文和英文元数据通过同一个 `body_include` 指向 `_includes/blog-content/<slug>.md`。英文更新标题、摘要、标签、课程导航和 `toc_labels`，正文及图注保留中文；原章节锚点不变。正文的 lang 为 zh-CN，英文界面标注 Body: Chinese。只改正文不复制到英文；章节增删或改名后维护目录译文。

```bash
./bin/dev check
./bin/dev translations
# 完成实际翻译并格式化后才记录：
./bin/dev translations --record
./bin/dev check --final
```

`translations` 只读检查，`--record` 保存中文来源指纹而不翻译。博客指纹记录元数据，不声称正文已翻译。不要重录指纹掩盖未同步内容。

## 阶段五：构建与跨浏览器验收

```bash
./bin/dev check --final
npm run test:site:integration
npm run test:links
npm run test:site:browser
# 或一次运行 Ruby 集成、Chromium 专项及 Firefox／WebKit：
npm run test:site
```

`check` 包含 Prettier、本站依赖／所有权契约、升级和覆盖审计、正式构建；`--final` 另要求翻译同步。`test:links` 检查 `_site/` 中带真实 baseurl 的内部资源和锚点，不检查外部网站。Ruby 集成使用临时源树及自产 SVG／PDF，不依赖公开模板媒体、不修改内容。

Chromium 的八套专项保留几何、动效与图片准备的细粒度检查；Firefox／WebKit 使用同一套跨浏览器检查，覆盖全部 52 页、375／768／1440px 明暗主题、双语入口、目录／返回、公式、代码复制、回顶及 CAD。不同引擎按实际能力使用原生过渡或普通导航，不要求所有引擎暴露 Chromium 专有的动画观测接口。

```bash
# 日常有针对性的回归：
npm run test:site:chromium
npm run test:site:cross-browser
# 完整验收：Ruby、Chromium 专项、Firefox 和 WebKit
npm run test:site
```

Linux 的跨浏览器入口默认使用可选 `Dockerfile.browser`，只在容器内准备 Firefox／WebKit 运行库，以 Xvfb 提供软件渲染环境。镜像指纹取自该 Dockerfile 和 npm 锁文件；浏览器下载复用 `.dev-tools/browsers/`，不增大日常 Jekyll 镜像，也不安装主机系统包。镜像源可通过 `UBUNTU_MIRROR` 指定；浏览器下载可按 Playwright 官方配置使用 `PLAYWRIGHT_DOWNLOAD_HOST`。缺少 Docker 时先报告并参照环境安装说明，不执行系统安装。

Chromium 首次下载只需项目内安装：

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.dev-tools/browsers" npx playwright install --only-shell chromium
```

已有运行库的 Linux、macOS 和 CI 可直接运行原生浏览器：

```bash
PLAYWRIGHT_BROWSERS_PATH="$PWD/.dev-tools/browsers" npx playwright install firefox webkit
PERSONAL_SITE_NATIVE_BROWSERS=1 npm run test:site:cross-browser
```

遇到系统库缺失时报告具体缺项；优先使用上述容器，不自动在主机执行 `--with-deps`。CI 的 `--with-deps` 仅用于临时 runner。浏览器版本与项目锁文件配套，不单独升级引擎。

WebKit 为 Safari 引擎覆盖，Playwright 不驱动品牌 Safari；Linux 的结果不能替代 macOS／iOS Safari 实机验收，参见 [官方说明](https://playwright.dev/docs/browsers#webkit)。实机检查重点为窄屏菜单、字体换行、亮暗切换、页面／历史返回、长文目录和 CAD 触控操作，结果集中更新阶段总览。

Chromium 检查启动或复用开发预览，不自动关闭已有预览。Firefox／WebKit 默认重新构建 `_site/`，使用独立的临时静态服务验收正式产物，不注入 LiveReload；完成后自动关闭该临时服务。可用 `PERSONAL_SITE_URL` 指定现有服务。最新博客截图位于 `.dev-tools/test-results/blog/`；跨浏览器截图和结构化结果位于 `.dev-tools/test-results/compatibility/<engine>/`，同名文件覆盖更新，避免按每次开发建立新目录。失败时保留当前截图与报告。旧 `test:visual` 为完整浏览器回归的兼容入口。

### 可选本地质量审计

```bash
# 仅缺少审计工具时安装到项目忽略目录；不修改主机系统：
./bin/dev audit-setup
# 重新构建正式产物，执行无障碍与性能审计：
./bin/dev audit
# 也可分别运行：
./bin/dev audit --axe
./bin/dev audit --lighthouse
```

入口为 `test/personal_site_quality.cjs`，工具版本由它集中指定，安装位置为 `.dev-tools/quality-tools/`。Lighthouse 需要主机 Node.js 22.19 或更高版本；缺失时使用已有版本管理工具准备兼容环境，不自动安装系统包。Chromium 复用上述项目内 Playwright 缓存；运行库缺失时先报告。

axe 对全部主要页面及 404 执行 375／1440px 明暗主题审计，报告所选 WCAG A／AA 和 best-practice 规则；发现违规返回失败。另检查 404 回退与实际溢出区域的基础键盘滚动。Lighthouse 抽样中文首页、中文项目列表及英文博客列表，不以波动分数设置硬门槛，也不将本地结果视为线上验收。

原始报告和 `summary.json` 固定写入 `.dev-tools/test-results/quality/`，同名覆盖；汇总记录构建指纹、运行模式和完成状态，失败时不要将旧报告当作本次通过。该可选入口不增加普通 `setup`／`check`／`test:site` 的依赖。

## 阶段六：发布准备与维护

发布前完成阶段五的构建、站内链接、双语同步和浏览器验收，检查未跟踪文件、真实附件及 [资源保留规则](CLEANUP_PLAN.md)。推送／部署仍需明确授权。

### 依赖及模板升级

活动依赖为实际使用的 Jekyll 插件及六个 al-folio 插件，CV 插件保留备用。Gemfile 与配置必须一致；不要引入本地 Tailwind 构建。依赖更新后通过锁文件更新和 `setup` 重建环境，再执行完整检查。

```bash
./bin/dev bundle exec al-folio upgrade overrides audit
# 审阅所有新／已修改覆盖后：
./bin/dev bundle exec al-folio upgrade overrides accept --all
./bin/dev bundle exec al-folio upgrade overrides audit --fail-on-stale
```

仅接受审阅过的差异，不能清空审计或用跳过检查处理冲突。`head.liquid` 和 `scripts.liquid` 保留核心元信息、样式与主题顺序，删除闲置字体／脚本。MathJax 依据渲染后 Kramdown 定界符按需引入，不复制双语文章正文，也不需要每篇重复维护 math 字段。两个代码高亮样式 ID 仍供核心主题函数切换。

### 可选重建和备用页面

- 字体：使用静态 Academic Sans Unicode 分片，普通构建不需要工具。新增未覆盖字形时，参照 [字体来源](../assets/fonts/README.md)，在项目内虚拟环境安装 `fonttools[woff]==4.51.0`，运行 `bin/build-site-font.py`，随后执行 `npx prettier assets/fonts/academic-sans.css _data/fonts.json --write`。同时保留生成的 CSS、WOFF2 和 manifest；主站及 CAD 共用字形与缓存，字体源缓存可离线复用。
- CAD：按 [VOICE_TERMINAL.md](VOICE_TERMINAL.md) 使用保留的私有源码归档，普通预览／回归不需要 CAD 虚拟环境。不要把 STEP 放入发布资产。
- CV：`_pages/cv.md`、`_data/cv.yml`、JSON 和 RenderCV 设置保留的是上游示例。补齐个人信息、语言和允许名单后再考虑发布；这些数据／产物默认排除构建。可选项目内 Python 环境安装 `requirements.txt` 并运行 RenderCV，或手动运行仅输出 artifact 的 CV 工作流，不自动提交。JSON 导入不再作为全站构建依赖。
- 教学、独立论文：源码保留备用，启用前校对实际内容与路由，按需要加到发布允许名单。

### 辅助页面与分享预览

`_pages/404.md` 发布到 `/404.html`，共用站点布局，提供中英文主页入口，不自动跳转、不进入导航或 sitemap，并输出 `noindex`。这是一个双语辅助页，不新增翻译配对。52 个主要页面与它分别计数；CAD 嵌入文档仍单列。

分享元数据由已审计的 `_includes/metadata.liquid` 维护，沿用现有标题、简介及头像；中文 `zh_CN`、英文 `en_US`，博客详情为 `article`，栏目为 `website`。不增加第三方追踪服务或虚构封面。部署后再验收第三方平台实际抓取的分享卡片。

本地正式产物静态服务默认 `no-store`，浏览器回归不依赖缓存；仅在性能审计时可用 `PERSONAL_SITE_HTTP_CACHE=1` 模拟 Pages 的 600 秒缓存，避免把禁止缓存导致的字体重复下载误归为线上表现。Lighthouse 本地分数不能代替线上网络验收。

### CI、发布和原始资料

`Personal site checks` 在推送／PR 时执行同一 Docker 构建、链接、集成、Chromium 专项及 Firefox／WebKit 检查。升级检查单独覆盖 CLI 与本地覆盖。CodeQL 和手动无障碍／Lighthouse 检查保留；手动质量检查针对提供的已发布 URL，不代表验证了当前未部署代码。

`Deploy site` 仅手动触发，复用完整检查工作流的构建 artifact 后将产物发布到 `gh-pages`，不执行另一套 CSS 裁剪。`.nojekyll` 必须随构建复制并包含在 artifact 中，防止 Pages 再次构建。GitHub Pages 来源须与 `gh-pages` 根目录匹配；设置与权限的当前确认结果见阶段总览。当前工作仍仅本地，不自动触发线上工作流。工作流和包版本更新需按实际运行验证，未在线运行不能宣称通过。

已删除的模板、参考原稿和旧记录不恢复。实际 CAD 源归档及 manifest 单独保留；食品项目原始导入资料保留在忽略目录，旧截图／构建副本按 [资源保留规则](CLEANUP_PLAN.md) 处理。`.dev-tools/`、`_site/`、node_modules 和缓存不进入 Git／发布；不整目录盲删私有原件，不改写 `.git` 历史，不执行全局 Docker prune。
