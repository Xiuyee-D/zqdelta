# 语音终端结构展示

模型嵌入中英文语音终端详情的 PCB 工作段落之后，不增加项目、栏目或列表封面。图注明确：**当前可视化模型不含电池、扬声器和轻触开关**；展开仅说明部件关系。原文、元数据和排序不变。

## 几何修正

原工程已完成迁移核验并清理，主站资源目录是当前展示的唯一活动版本。六份原始 STEP、派生 CAD、重建工具和校验记录完整保存在本机私有归档 `.dev-tools/archives/voice-terminal-r4-source.tar.gz`，68 个文件已逐项核对 SHA-256，清单见同目录 `voice-terminal-r4-source.manifest.json`。

归档被 Git、Jekyll 与 Docker 构建上下文排除，不随网站发布，也不会随仓库克隆自动复制；换机继续维护 CAD 时需另行迁移此归档。网站运行与构建不依赖归档或旧项目目录。

- D1、D5、D6 是三处同型号直插 LED。仅切除这三个已识别器件基面以下的六根引脚，保留灯体，其他器件不参与切削。GLB 同步去除对应节点的引脚图元。
- 卡扣以安装端为基准设置刚体展示限位，默认 0.3°，约束范围 0.3°—0.4°。参考点为装配坐标 `[-54, 45.45, 3.10435333521643] mm`，旋转方向 +X。未切削、缩放或隐藏卡扣；展开时卡扣与后壳同组移动。
- 这只是展示姿态约束，不表示源模型中存在已验证的实体铰链或新增机械限位结构。
- 21 组静态 BRep 配对均无超过 `1e-5 mm³` 阈值的体积交叠，后壳／卡扣名义最小距离约 `0.022681 mm`；另有 4 组角度约束与 11 组展开状态采样，无后壳／卡扣体积交叠。PCB 配对检查体积交叠，未计算其复合实体最小距离。
- 未完成公差、柔性卡扣、实物装配和连续拆装路径验证，不作为制造签核。

归档内 `docs/geometry_edits.json`、`docs/assembly_validation.json` 保存输入 SHA-256、派生文件及检查记录。普通网站预览不需要 CAD 依赖；确需重建几何时，先解包到项目内工作目录，再使用隔离环境：

```bash
mkdir -p .dev-tools/voice-terminal-workbench
tar -xzf .dev-tools/archives/voice-terminal-r4-source.tar.gz -C .dev-tools/voice-terminal-workbench
python3 -m venv .dev-tools/cad-venv
.dev-tools/cad-venv/bin/python -m pip install -r .dev-tools/voice-terminal-workbench/voice_terminal_site/tools/requirements-cad.txt
.dev-tools/cad-venv/bin/python .dev-tools/voice-terminal-workbench/voice_terminal_site/tools/prepare_site_geometry.py
.dev-tools/cad-venv/bin/python .dev-tools/voice-terminal-workbench/voice_terminal_site/tools/validate_geometry.py
```

## 网站实现

`_includes/voice-terminal-viewer.liquid` 生成 figure、双主题静态图、激活按钮与图注。它在 Markdown 内按 `page.lang` 自行读取 `_data/i18n/` 文案，不依赖稍后执行的 layout 变量。外层样式位于 `assets/css/site.css`。

只引入以下运行文件，不复制 STEP、GLB、外观参考图、转换工具或内部报告到站点资源目录。公开装配清单仅保留渲染、限位和模型范围所需字段。

```text
assets/voice-terminal/compact.html
assets/voice-terminal/compact.js
assets/voice-terminal/compact.css
assets/voice-terminal/compact-embed.js
assets/voice-terminal/assembly.json
assets/voice-terminal/models/geometry.vtm
assets/voice-terminal/posters/assembled-light.png
assets/voice-terminal/posters/assembled-dark.png
```

点击后才创建同源 iframe、下载约 2.8MB 几何缓存。iframe 共用主站 Academic Sans，不复制字体。展示区预留高度，加载与展开不改变正文几何；失败时移除 iframe，保留静态图并允许重试。禁用 JavaScript 时只显示静态图。

仅保留旋转、整机／展开与复位，不接管滚轮、不自动播放。用户触发一次短动画，减少动态效果偏好下直接切换；方向键旋转，Home 复位。离屏或隐藏文档时停止动画，静止时不持续请求绘制帧。资源兼容 `/zqdelta`，查询参数提供初始语言、主题，同源消息同步后续主题。

## 重建与验证

后续直接在主站维护查看器。需要修改几何时，从归档恢复的工作目录重建并检查，再只更新上述资源；公开清单继续省略源文件路径、旧检查面板说明等私有字段，不覆盖主站现有字体。双主题预览图必须从修正后的精简查看器重新渲染，保持实际尺寸声明。归档内 `tools/render_compact_posters.cjs` 接受查看器 URL、输出目录和现有 Playwright 模块路径，可使用主站本地预览地址；无需恢复或启动旧项目服务。

```bash
./bin/dev check
./bin/dev bundle exec ruby test/personal_site_test.rb
PLAYWRIGHT_BROWSERS_PATH="$PWD/.dev-tools/browsers" node test/personal_site_voice_terminal.cjs
PLAYWRIGHT_BROWSERS_PATH="$PWD/.dev-tools/browsers" node test/personal_site_navigation.cjs
# 完成实际英文同步后再记录
./bin/dev translations --record
./bin/dev check --final
```

新增 HTML 是 iframe 运行文档，不是站点栏目。隔离构建测试将其与内容夹具页面分开检查；浏览器测试覆盖双语、375／768／1440px、明暗主题、按需加载、固定几何、键盘、滚动、主题同步、减少动态效果、失败重试及无 WebGL／无 JavaScript 回退。
