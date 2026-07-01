# MAM Castle / WG 查询系统部署说明

本目录是纯静态网站发布包，可直接部署到 EdgeOne Pages、Cloudflare Pages、GitHub Pages 或任何静态网站托管服务。

## 文件结构

```text
dist/
├── index.html
├── app.js
├── styles.css
├── data/
│   └── works.json
├── assets/
│   ├── mam_logo_transparent.png
│   ├── artworks/
│   └── supplement/
└── DEPLOY.md
```

## 静态部署参数

- 构建命令：留空
- 输出目录：`dist`
- Node.js 后端：不需要
- 数据库：不需要
- 运行时服务：不需要
- 首页文件：`index.html`
- 数据文件：`data/works.json`

## EdgeOne Pages 部署

### 方式 A：控制台上传

1. 进入 EdgeOne Pages 控制台。
2. 新建 Pages 项目。
3. 选择静态网站 / 上传目录。
4. 上传本 `dist/` 目录内的全部文件。
5. 发布后访问 EdgeOne Pages 提供的域名。

### 方式 B：Git 仓库部署

1. 将项目推送到 GitHub / GitLab / Gitee 等 EdgeOne Pages 支持的仓库。
2. 在 EdgeOne Pages 中连接该仓库。
3. 构建命令留空。
4. 输出目录填写 `dist`。
5. 保存并部署。

## Cloudflare Pages 部署

- Framework preset：None
- Build command：留空
- Build output directory：`dist`

## GitHub Pages 部署

可将 `dist/` 内容发布到 `gh-pages` 分支根目录，或在仓库设置中选择 GitHub Pages 发布目录。

## 本地预览

可直接双击 `dist/index.html` 查看页面框架。部分浏览器会限制本地文件读取 `data/works.json`，因此双击时可能只显示基本页面和提示。

如需完整本地预览，可在 `dist/` 目录运行：

```bash
python3 -m http.server 8765
```

然后访问：

```text
http://127.0.0.1:8765/
```

## 注意事项

- 所有图片均使用相对路径。
- 价格为内部参考，不等于报价方案。
- 官方零售价、二级挂牌价、拍卖成交价应继续分开使用。
- 标记为待人工确认的资料不得直接作为最终对外承诺。
