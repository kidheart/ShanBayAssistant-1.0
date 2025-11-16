# 配置文件说明

## 🔐 安全配置步骤

### 第一步：创建配置文件

1. **复制示例文件**
   ```bash
   cp config.example.js config.js
   ```

2. **编辑 config.js**
   打开 `config.js` 文件，将以下占位符替换为你的真实密钥：
   ```javascript
   const GOOGLE_API_KEY = '你的真实 API 密钥';
   const GOOGLE_CX = '你的真实 CX ID';
   ```

### 第二步：获取 API 密钥

#### 获取 Google API Key

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 **Custom Search API**
4. 转到 **凭据** → **创建凭据** → **API 密钥**
5. 复制生成的 API 密钥

#### 获取 CX (Custom Search Engine ID)

1. 访问 [Programmable Search Engine](https://programmablesearchengine.google.com/)
2. 点击 **添加** 创建新的搜索引擎
3. 设置搜索引擎：
   - **搜索整个网络**：选择此选项
   - 给搜索引擎命名（任意名称）
4. 创建后，在控制台中可以看到你的 **搜索引擎 ID (CX)**
5. 复制 CX ID

### 第三步：验证配置

1. 确保 `config.js` 文件存在且包含真实密钥
2. 重新加载扩展
3. 测试功能是否正常

## ⚠️ 重要提示

1. **不要提交 config.js**
   - `config.js` 已在 `.gitignore` 中被排除
   - 永远不会被提交到 Git

2. **示例文件是安全的**
   - `config.example.js` 只包含占位符
   - 可以安全地提交到 Git

3. **保护你的密钥**
   - 不要在公开场合分享 `config.js`
   - 如果密钥泄露，立即在 Google Cloud Console 中重新生成

## 📝 文件说明

- **config.example.js** - 示例配置文件（可提交到 Git）
- **config.js** - 真实配置文件（**不提交到 Git**）
- **.gitignore** - Git 忽略配置，已排除 `config.js`

## 🔍 故障排除

### 问题：扩展报错 "API 配置未加载"

**解决方案：**
1. 检查 `config.js` 文件是否存在
2. 检查文件中的密钥是否正确填写
3. 确保密钥不是示例值（`YOUR_GOOGLE_API_KEY_HERE`）

### 问题：API 调用失败

**解决方案：**
1. 验证 API 密钥是否有效
2. 检查 Custom Search API 是否已启用
3. 确认 CX ID 是否正确
4. 检查 API 配额是否已用完（免费额度：100次/天）

