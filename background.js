// 监听热键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === "show-word-image") {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // 向 content script 发送消息
        chrome.tabs.sendMessage(tabs[0].id, { action: "triggerImageSearch" });
      }
    });
  }
});

// 监听来自 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 检查是否是有效的消息
  if (!request || !request.action) {
    sendResponse({ success: false, error: 'Invalid request' });
    return false;
  }

  if (request.action === "getGoogleImages") {
    // 获取 Google 图片搜索结果
    const word = request.word || '';
    
    // 检查配置是否已加载
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      sendResponse({ 
        success: false, 
        error: 'API 配置未加载，请检查 config.js 文件是否存在并包含正确的密钥' 
      });
      return false;
    }
    
    // 立即返回 true 以保持消息通道开放
    getGoogleImageUrls(word)
      .then(imageUrls => {
        try {
          sendResponse({ success: true, imageUrls: imageUrls });
        } catch (e) {
          console.error("发送响应失败:", e);
        }
      })
      .catch(error => {
        console.error("获取 Google 图片失败:", error);
        try {
          sendResponse({ success: false, error: error.message || '未知错误' });
        } catch (e) {
          console.error("发送错误响应失败:", e);
        }
      });
    
    return true; // 保持消息通道开放以支持异步响应
  }
  
  return false;
});

// ============================================
// 配置加载（手动解析 config.js）
// ============================================
// 
// 注意：config.js 不会被提交到 Git，包含真实的 API 密钥
// 请复制 config.example.js 为 config.js 并填入你的真实密钥
//
// 使用简单的字符串解析来避免 eval 问题
// ============================================

let GOOGLE_API_KEY;
let GOOGLE_CX;

// 手动解析配置文件内容
function parseConfig(content) {
  const apiKeyMatch = content.match(/const GOOGLE_API_KEY = ['"]([^'"]*)['"]/);
  const cxMatch = content.match(/const GOOGLE_CX = ['"]([^'"]*)['"]/);
  
  if (apiKeyMatch && apiKeyMatch[1]) {
    GOOGLE_API_KEY = apiKeyMatch[1];
  }
  if (cxMatch && cxMatch[1]) {
    GOOGLE_CX = cxMatch[1];
  }
}

// 加载配置
(async function loadConfig() {
  try {
    // 使用 fetch 获取配置文件内容
    const response = await fetch(chrome.runtime.getURL('config.js'));
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    const configContent = await response.text();
    
    // 手动解析配置文件内容
    parseConfig(configContent);
    
    // 验证配置是否正确加载
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      console.error('❌ 配置错误：config.js 中未定义 GOOGLE_API_KEY 或 GOOGLE_CX');
      throw new Error('API 配置未加载');
    }
    
    // 验证配置不是示例值
    if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY_HERE' || 
        GOOGLE_CX === 'YOUR_CX_ID_HERE') {
      console.error('❌ 配置错误：请复制 config.example.js 为 config.js 并填入真实的 API 密钥');
      throw new Error('API 配置使用的是示例值或为空');
    }
    
    console.log('✅ 配置加载成功');
  } catch (error) {
    console.error('❌ 加载配置文件失败:', error);
    console.error('请确保已创建 config.js 文件并填入真实的 API 密钥');
    // 不抛出错误，允许扩展加载，但功能会失败
  }
})();

// 获取 Google 图片搜索结果（使用 Custom Search API）
async function getGoogleImageUrls(word) {
  try {
    console.log('开始使用 Google Custom Search API 获取图片:', word);
    
    // 使用 Google Custom Search API
    const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(word)}&searchType=image&num=10&safe=active`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-cache'
    });
    
    if (!response || !response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('API 请求失败:', response.status, errorText);
      throw new Error(`Google API 请求失败: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log('📡 API 响应状态:', response.status, response.statusText);
    console.log('📦 API 返回数据结构:', {
      hasItems: !!data.items,
      itemsCount: data.items ? data.items.length : 0,
      hasError: !!data.error,
      searchInformation: data.searchInformation
    });
    
    // 检查 API 返回的错误
    if (data.error) {
      console.error('❌ Google API 错误:', JSON.stringify(data.error, null, 2));
      throw new Error(`Google API 错误: ${data.error.message || JSON.stringify(data.error)}`);
    }
    
    // 提取图片 URL
    // Google Custom Search API 返回的图片数据结构：
    // item.link - 图片的 URL
    // item.image.thumbnailLink - 缩略图 URL
    // item.image.contextLink - 来源页面
    const imageUrls = [];
    if (data.items && Array.isArray(data.items)) {
      console.log('API 返回的项目数量:', data.items.length);
      data.items.forEach((item, index) => {
        // 优先使用 link（完整图片 URL），如果没有则使用 thumbnailLink
        const imageUrl = item.link || (item.image && item.image.thumbnailLink) || null;
        if (imageUrl) {
          imageUrls.push(imageUrl);
          console.log(`图片 ${index + 1}: ${imageUrl}`);
        } else {
          console.warn(`项目 ${index + 1} 没有有效的图片 URL:`, item);
        }
      });
    } else {
      console.warn('API 返回数据中没有 items 字段:', data);
    }
    
    console.log('✅ Google API 成功返回', imageUrls.length, '张图片');
    console.log('图片 URL 列表:', imageUrls);
    
    if (imageUrls.length === 0) {
      console.error('❌ 未找到图片，API 返回数据:', JSON.stringify(data, null, 2));
      throw new Error('未找到相关图片');
    }
    
    // 返回前 6 张图片
    const result = imageUrls.slice(0, 6);
    console.log('🎯 最终返回', result.length, '张图片用于显示');
    return result;
    
  } catch (error) {
    console.error("获取 Google 图片失败:", error);
    
    // 如果 API 调用失败（比如 CX 无效），提供清晰的错误信息
    if (error.message.includes('invalid') || error.message.includes('400')) {
      throw new Error(`Google API 配置错误：可能需要创建自定义搜索引擎 (CX)。错误: ${error.message}`);
    }
    
    throw new Error(`无法获取 Google 图片: ${error.message}`);
  }
}

// Service Worker 不支持 XMLHttpRequest，已移除
// 现在只使用 fetch API

