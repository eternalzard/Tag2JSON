# Tag2JSON

> 当前版本：**v1.2.0**

一个轻量的 Figma 插件，用于批量给选中的组件 / 组件集的 **Description（说明）** 添加自定义字段（Tag），方便后续将组件说明按结构化方式解析为 JSON 使用；并支持按 Description 中的 `ID` 字段批量导出 PNG。

## 功能介绍

- ✅ 批量给选中的组件添加自定义字段
- ✅ 新字段始终写入 Description 的 **第一行**
- ✅ 原有描述内容不会被覆盖，会自动整体下移到第二行及以后
- ✅ 仅作用于 `Component` 与 `Component Set`，避免误改普通图层
- ✅ 应用后插件窗口不会自动关闭，可连续对不同选区执行
- ✅ **批量导出选中组件为 PNG**，文件名取 Description 中 `ID：xxx` 后面的字段

## 适用场景

- 为设计系统中的组件批量打标签（如所属业务线、负责人、版本、用途等）
- 在组件说明中写入结构化字段，供下游工具解析成 JSON
- 统一批量补齐缺失的标记字段，避免手动逐个修改

## 安装

1. 克隆或下载本仓库到本地。
2. 打开 Figma 桌面端。
3. 顶部菜单：`Plugins` → `Development` → `Import plugin from manifest...`
4. 选择本项目根目录下的 [`manifest.json`](manifest.json)。
5. 完成后即可在插件列表中看到 **Tag2JSON**。

## 使用方法

1. 在画布上选中一个或多个组件 / 组件集。
2. 运行插件：`Plugins` → `Development` → `Tag2JSON`。
3. 在输入框中填写要添加的字段，例如：
   - `@owner=design-system`
   - `type: button`
   - `version=1.2.0`
4. 点击 **立即应用**（或按回车）。
5. 插件会提示 `已更新 N 个组件的 Description 首行`，可继续重新选择组件再次应用。

## 行为说明

给定输入字段 `@owner=ds`，对一个组件 Description 的处理如下：

| 原 Description | 应用后 |
|---|---|
| `(空)` | `@owner=ds` |
| `这是一个按钮组件` | `@owner=ds`<br>`这是一个按钮组件` |
| `@version=1.0`<br>`主按钮` | `@owner=ds`<br>`@version=1.0`<br>`主按钮` |

规则总结：

- 原描述为空 → 新字段直接作为第一行
- 原描述非空 → 新字段写入第一行，原全部内容整体下移一行

## 导出选中组件为 PNG

1. 在画布上选中一个或多个组件 / 组件集。
2. 在插件面板下方点击 **导出选中组件**。
3. 插件会逐个解析每个组件的 Description，提取形如 `ID：xxx` 或 `ID:xxx`（中英文冒号均可，不区分大小写）的那一行，把冒号后面的内容作为 PNG 文件名。
4. 导出结果：
   - **仅一个组件** → 直接下载对应的 `xxx.png`（1x）。
   - **多个组件** → 自动打包成一个 ZIP（`tag2json-export.zip`），一次下载，内部每个文件仍是 `xxx.png`。

文件名规则：

- Description 中存在 `ID：xxx` → 文件名为 `xxx.png`
- 未找到 `ID` 字段 → 使用组件名作为文件名兜底
- 文件名中的非法字符（`\ / : * ? " < > |`）会被替换为 `_`
- 同一批中出现重复文件名时，自动追加 `-2`、`-3` 等后缀

## 文件结构

```
Tag2JSON/
├── manifest.json   # 插件清单（名称、入口等）
├── code.js         # 插件主逻辑（运行在 Figma 沙箱中）
├── ui.html         # 插件 UI 界面
└── README.md       # 当前文件
```

核心文件：

- [`manifest.json`](manifest.json) — 插件配置
- [`code.js`](code.js) — 处理选区 & 写入 Description
- [`ui.html`](ui.html) — 输入框与应用按钮

## 开发说明

- 仅使用 Figma Plugin API `1.0.0`，无构建依赖，直接修改后在 Figma 中重新运行即可。
- 仅处理节点类型为 `COMPONENT` / `COMPONENT_SET`，其他节点类型会被自动忽略。
- 如需修改匹配规则或新增字段格式化逻辑，修改 [`code.js`](code.js) 中的 `addFieldToFirstLine` 函数即可。

## 常见问题

**Q: 为什么我选中了图层，插件却提示“请先选中至少一个组件或组件集”？**
A: 插件仅处理 `Component` 和 `Component Set`，Frame / Group / Instance 不会被修改。

**Q: 多次应用同一个字段会怎样？**
A: 每次都会在第一行新增一条，不做去重。如果需要“已存在则跳过/覆盖”的行为，可以在 `addFieldToFirstLine` 中扩展。

**Q: 修改代码后没生效？**
A: 请在 Figma 中关闭插件窗口并重新运行，Figma 会重新加载 `code.js`。

## License

MIT

## 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| v1.2.0 | 2026-05-08 | 优化：导出改为 1x PNG；多张图片自动打包为 ZIP 一次下载；面板高度增大、不再出现滚动条 |
| v1.1.0 | 2026-05-08 | 新增：批量导出选中组件为 PNG，文件名取 Description 中 `ID：` 后面的字段 |
| v1.0.0 | 2026-05-07 | 首个正式版本：批量为选中组件的 Description 首行添加自定义字段 |