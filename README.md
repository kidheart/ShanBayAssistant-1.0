# 扇贝单词图片助手

一个 Chrome 浏览器扩展，帮助你在扇贝单词背单词时，通过热键快速查看当前单词的图片，增强记忆效果。

## 功能特点

- 🔥 **自定义热键**：按下 `Ctrl + Shift + I`（Mac: `Cmd + Shift + I`）快速触发
- 🔍 **自动识别单词**：智能识别扇贝单词页面当前显示的单词
- 🖼️ **图片展示**：自动搜索并显示单词相关图片
- 🎨 **优雅界面**：美观的浮动窗口，不影响正常学习

## ⚠️ 首次使用：配置 API 密钥

**重要**：在使用扩展之前，必须先配置 Google API 密钥。

### 快速配置步骤

1. **复制示例配置文件**
   ```bash
   cp config.example.js config.js
   ```

2. **编辑 config.js**
   打开 `config.js`，将以下占位符替换为你的真实密钥：
   ```javascript
   const GOOGLE_API_KEY = '你的真实 API 密钥';
   const GOOGLE_CX = '你的真实 CX ID';
   ```

3. **获取 API 密钥**
   - 访问 [Google Cloud Console](https://console.cloud.google.com/)
   - 启用 Custom Search API
   - 创建 API 密钥
   - 访问 [Programmable Search Engine](https://programmablesearchengine.google.com/)
   - 创建自定义搜索引擎并获取 CX ID

详细步骤请查看 [README-配置说明.md](./README-配置说明.md)

## 安装步骤

### 方法一：开发者模式安装（推荐）

1. **下载或克隆项目**
   ```bash
   git clone <your-repo-url>
   cd CURSORenglish
   ```

2. **打开 Chrome 扩展管理页面**
   - 在 Chrome 浏览器中输入 `chrome://extensions/`
   - 或者：菜单 → 更多工具 → 扩展程序

3. **启用开发者模式**
   - 在扩展管理页面右上角，打开"开发者模式"开关

4. **加载扩展**
   - 点击"加载已解压的扩展程序"
   - 选择项目文件夹（`CURSORenglish`）

5. **完成**
   - 扩展安装成功后，图标会出现在浏览器工具栏
   - 打开扇贝单词学习页面即可使用

### 方法二：打包安装

1. 在扩展管理页面点击"打包扩展程序"
2. 选择项目文件夹，生成 `.crx` 文件
3. 将 `.crx` 文件拖拽到扩展管理页面完成安装

## 使用方法

1. **打开扇贝单词学习页面**
   - 访问 https://www.shanbay.com 并进入学习页面

2. **按下热键**
   - Windows/Linux: `Ctrl + Shift + I`
   - Mac: `Cmd + Shift + I`

3. **查看图片**
   - 扩展会自动识别当前单词
   - 在页面右侧显示图片搜索结果
   - 可以点击链接在新标签页打开 Google 图片搜索

4. **关闭图片窗口**
   - 点击右上角的 `×` 按钮关闭

## 技术实现

- **Manifest V3**：使用最新的 Chrome 扩展 API
- **Content Script**：注入到扇贝单词页面，识别单词并显示图片
- **Background Service Worker**：处理热键命令和消息传递
- **Unsplash API**：获取高质量图片（免费、无需 API key）
- **Google 图片搜索**：提供完整搜索结果链接

## 自定义配置

### 修改热键

在 `manifest.json` 中修改 `commands` 部分：

```json
"commands": {
  "show-word-image": {
    "suggested_key": {
      "default": "Ctrl+Shift+I",  // 修改这里
      "mac": "Command+Shift+I"    // Mac 版本
    }
  }
}
```

### 修改单词识别选择器

在 `content.js` 的 `detectCurrentWord()` 方法中添加或修改选择器：

```javascript
const selectors = [
  '.word-text',        // 添加扇贝单词的具体选择器
  '.your-custom-class', // 自定义选择器
];
```

### 修改图片展示位置

在 `content.css` 中修改 `.word-image-container` 的样式：

```css
.word-image-container {
  top: 20px;    /* 修改上边距 */
  right: 20px;  /* 修改右边距 */
  width: 450px; /* 修改宽度 */
}
```

## 注意事项

1. **首次使用**：扩展只会在扇贝单词域名（`shanbay.com`）下工作
2. **网络要求**：需要能够访问 Google 和 Unsplash 图片服务
3. **隐私**：所有图片搜索均在浏览器本地完成，不会上传数据
4. **兼容性**：需要 Chrome 88+ 或基于 Chromium 的浏览器

## 故障排除

### 热键不工作？

1. 检查是否在扇贝单词页面
2. 尝试刷新页面后重试
3. 检查扩展是否已启用
4. 查看浏览器控制台是否有错误信息

### 无法识别单词？

1. 打开浏览器开发者工具（F12）
2. 在 Console 中查看错误信息
3. 检查扇贝单词页面的 HTML 结构
4. 可能需要更新 `detectCurrentWord()` 中的选择器

### 图片无法显示？

1. 检查网络连接
2. 确认能访问 Google 和 Unsplash
3. 尝试点击"在 Google 图片中搜索"链接手动查看

## 开发计划

- [ ] 支持更多图片源（Bing、Pixabay 等）
- [ ] 添加图片缓存功能
- [ ] 支持自定义图片数量
- [ ] 添加单词发音功能
- [ ] 支持其他背单词网站（百词斩、墨墨背单词等）

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-01-XX)
- ✨ 初始版本发布
- 🔥 热键触发功能
- 🔍 自动单词识别
- 🖼️ 图片搜索和展示

