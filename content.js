// 扇贝单词图片助手 Content Script

class WordImageHelper {
  constructor() {
    this.imageContainer = null;
    this.currentWord = null;
    this.isVisible = false;
    this.init();
  }

  init() {
    // 创建图片展示容器
    this.createImageContainer();
    
    // 监听来自 background 的消息
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "triggerImageSearch") {
          // 检查扩展上下文是否有效
          if (!this.isExtensionContextValid()) {
            console.warn('扩展上下文无效，无法处理消息');
            sendResponse({ success: false, error: 'Extension context invalidated' });
            return false;
          }
          
          this.handleImageSearch();
          sendResponse({ success: true });
        }
        return true;
      });
    } catch (error) {
      console.error('注册消息监听器失败:', error);
    }

    // 监听键盘快捷键（备用方案）
    document.addEventListener("keydown", (e) => {
      // Ctrl+Shift+I 或 Cmd+Shift+I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        this.handleImageSearch();
      }
    });
  }

  // 识别当前显示的单词
  detectCurrentWord() {
    // 扇贝单词页面可能的单词显示位置
    const selectors = [
      '.word-text',           // 常见单词文本选择器
      '.word',                // 单词类
      '.vocabulary-word',     // 词汇单词
      '.study-word',          // 学习单词
      '.current-word',        // 当前单词
      '.word-content',        // 单词内容
      'h1.word',              // h1 标签中的单词
      '.card-word',           // 卡片单词
      '[data-word]',          // 数据属性
      '.word-title',          // 单词标题
    ];

    let word = null;

    // 尝试从常见选择器获取
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        word = element.textContent.trim();
        if (word && word.length > 0 && /^[a-zA-Z]+$/.test(word)) {
          return word;
        }
      }
    }

    // 如果没找到，尝试从页面中提取最明显的英文单词
    const allText = document.body.innerText;
    const words = allText.match(/\b[A-Z][a-z]+|[a-z]+[A-Z][a-z]*|\b[a-z]{3,}\b/g);
    if (words && words.length > 0) {
      // 过滤掉太短或太长的单词，优先选择中间的
      const filteredWords = words.filter(w => w.length >= 3 && w.length <= 20);
      if (filteredWords.length > 0) {
        // 获取页面上最显眼的单词（通常在前几个）
        word = filteredWords[0];
        return word;
      }
    }

    return null;
  }

  // 处理图片搜索
  async handleImageSearch() {
    // 首先检查扩展上下文
    if (!this.isExtensionContextValid()) {
      this.showError("扩展已重新加载，请刷新页面后重试");
      return;
    }

    const word = this.detectCurrentWord();
    
    if (!word) {
      this.showError("未找到单词，请确保在扇贝单词学习页面");
      return;
    }

    this.currentWord = word;
    this.showLoading(word);

    try {
      // 使用 Google 图片搜索
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(word)}&tbm=isch&safe=active`;
      
      // 由于跨域限制，我们使用 iframe 嵌入搜索结果
      // 或者使用代理 API（需要后端支持）
      // 这里先使用简单的 iframe 方式
      this.displayImages(word, searchUrl);
    } catch (error) {
      console.error("搜索图片失败:", error);
      
      // 检查是否是扩展上下文错误
      if (error.message && error.message.includes('Extension context')) {
        this.showError("扩展已重新加载，请刷新页面后重试");
      } else {
        this.showError("搜索图片失败，请稍后重试");
      }
    }
  }

  // 显示图片
  displayImages(word, searchUrl) {
    // 创建一个包含 Google 图片搜索结果的 iframe
    // 注意：由于 Google 的 X-Frame-Options，可能无法直接嵌入
    // 我们需要使用其他方法，比如提取图片 URL

    // 方案：使用 Unsplash API 或其他免费图片 API
    // 或者创建自己的图片搜索代理
    this.fetchImagesFromAPI(word);
  }

  // 从 API 获取图片（使用 Unsplash 作为备选）
  async fetchImagesFromAPI(word) {
    try {
      const container = this.imageContainer;
      container.innerHTML = `
        <div class="image-header">
          <h3><strong>${word}</strong></h3>
          <button class="close-btn" onclick="this.closest('.word-image-container').style.display='none'">×</button>
        </div>
        <div class="image-content">
          <div class="image-preview">
            <div class="loading-text">正在加载图片...</div>
          </div>
        </div>
      `;

      // 直接加载多张图片
      this.loadMoreImages(word, container);
    } catch (error) {
      console.error("加载图片失败:", error);
      this.showError("加载图片失败");
    }
  }

  // 生成图片 URL（使用多个备用源，优先与单词相关）
  getImageUrl(word, index) {
    // 使用基于单词的哈希值来生成稳定的图片索引
    const hash = this.simpleHash(word + index);
    const imageId = (hash % 1000) + 1;
    
    // 方案1: 尝试使用 Unsplash（与单词相关，可能不稳定）
    // 方案2: 使用 Picsum Photos（稳定但不相关）
    const timestamp = Date.now();
    const sources = [
      // 尝试 Unsplash 根据单词搜索（最相关）
      `https://source.unsplash.com/600x400/?${encodeURIComponent(word)}&sig=${hash}`,
      // Picsum 作为备用（稳定可靠）
      `https://picsum.photos/id/${imageId}/600/400?t=${timestamp}_${index}`,
      // 另一个 Picsum 源
      `https://picsum.photos/600/400?random=${timestamp}_${index}_${hash}`,
    ];
    
    // 优先使用 Unsplash（相关图片），如果失败会自动回退到 Picsum
    return sources[Math.min(index, sources.length - 1)];
  }

  // 简单的哈希函数
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash);
  }

  // 备用图片加载方案（当 Google 无法访问时，只使用 Unsplash）
  loadFallbackImages(word, container) {
    const preview = container.querySelector('.image-preview');
    if (!preview) return;

    const loadingText = preview.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = '正在加载备用图片源...';
    }

    const imageGrid = document.createElement('div');
    imageGrid.className = 'image-grid';
    
    const totalImages = 6;
    let loadedCount = 0;
    let successCount = 0;

    // 清空预览区域并添加加载文本和网格
    if (loadingText) {
      preview.innerHTML = '';
      preview.appendChild(loadingText);
    }
    preview.appendChild(imageGrid);

    for (let i = 0; i < totalImages; i++) {
      const imgWrapper = document.createElement('div');
      imgWrapper.className = 'image-item';
      
      const img = document.createElement('img');
      img.alt = `${word} - ${i + 1}`;
      img.loading = 'lazy';
      img.style.display = 'none';
      
      img.onload = () => {
        img.style.display = 'block';
        successCount++;
        loadedCount++;
        
        // 至少有一张图片加载成功后，隐藏加载文本
        if (successCount >= 1 && loadingText) {
          loadingText.style.display = 'none';
        }
        
        // 检查是否所有图片都加载完成
        if (loadedCount === totalImages) {
          if (successCount === 0 && loadingText) {
            loadingText.textContent = '图片加载失败，请检查网络连接';
            loadingText.style.display = 'block';
            loadingText.style.color = '#d32f2f';
          }
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        imgWrapper.style.display = 'none';
        
        // 检查是否所有图片都失败
        if (loadedCount === totalImages) {
          if (successCount === 0 && loadingText) {
            loadingText.textContent = '图片加载失败，请检查网络连接';
            loadingText.style.display = 'block';
            loadingText.style.color = '#d32f2f';
          } else if (successCount > 0 && loadingText) {
            // 至少有一张成功，隐藏加载文本
            loadingText.style.display = 'none';
          }
        }
      };
      
      // 只使用 Unsplash 作为备用源（与单词相关）
      img.src = `https://source.unsplash.com/600x400/?${encodeURIComponent(word)}&sig=${Date.now()}_${i}`;
      
      imgWrapper.appendChild(img);
      imageGrid.appendChild(img);
    }
  }

  // 通过 background 获取图片 URL（如果 content script 无法直接访问）
  async getImageUrlFromBackground(word, index) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'getImageUrl', word: word, index: index },
        (response) => {
          if (response && response.imageUrl) {
            resolve(response.imageUrl);
          } else {
            // 如果 background 返回失败，使用本地生成的 URL
            resolve(this.getImageUrl(word, index));
          }
        }
      );
    });
  }

  // 检查扩展上下文是否有效
  isExtensionContextValid() {
    try {
      return chrome.runtime && chrome.runtime.id;
    } catch (e) {
      return false;
    }
  }

  // 从 Google 获取图片 URL（直接在 content script 中获取，绕过 Service Worker 限制）
  async getGoogleImages(word) {
    try {
      console.log('开始在 content script 中获取 Google 图片:', word);
      
      // 方法1: 尝试通过 background script 获取
      if (this.isExtensionContextValid()) {
        try {
          const result = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage(
              { action: 'getGoogleImages', word: word },
              (response) => {
                if (chrome.runtime.lastError) {
                  const errorMsg = chrome.runtime.lastError.message;
                  if (errorMsg.includes('Extension context invalidated') || 
                      errorMsg.includes('The message port closed') ||
                      errorMsg.includes('Receiving end does not exist')) {
                    reject(new Error('扩展已重新加载，请刷新页面后重试'));
                    return;
                  }
                  reject(new Error(errorMsg));
                  return;
                }
                
                if (!response) {
                  reject(new Error('未收到响应，扩展可能已重新加载'));
                  return;
                }
                
                if (response && response.success && response.imageUrls) {
                  console.log('✅ 从 background script 获取到图片:', response.imageUrls);
                  resolve(response.imageUrls);
                } else {
                  console.error('❌ Background script 返回失败:', response);
                  reject(new Error(response?.error || '获取图片失败'));
                }
              }
            );
          });
          
          if (result && result.length > 0) {
            console.log('通过 background script 获取到', result.length, '张图片');
            return result;
          }
        } catch (bgError) {
          console.warn('Background script 获取失败，尝试直接获取:', bgError);
        }
      }
      
      // 方法2: 直接在 content script 中获取（在页面上下文中，可能有更好的权限）
      console.log('尝试在 content script 中直接获取 Google 图片');
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(word)}&tbm=isch&safe=active&ijn=0`;
      
      try {
        const response = await fetch(searchUrl, {
          method: 'GET',
          credentials: 'include', // 包含 credentials
          cache: 'no-cache',
          redirect: 'follow'
        });
        
        if (!response || !response.ok) {
          throw new Error(`Fetch failed with status: ${response?.status || 'unknown'}`);
        }
        
        const html = await response.text();
        console.log('Content script 获取到 Google 搜索结果，HTML 长度:', html.length);
        
        // 提取图片 URL
        const imageUrls = this.extractImageUrlsFromHtml(html);
        
        if (imageUrls && imageUrls.length > 0) {
          console.log('提取到', imageUrls.length, '张图片 URL');
          return imageUrls.slice(0, 6);
        } else {
          throw new Error('未能从搜索结果中提取图片 URL');
        }
        
      } catch (fetchError) {
        console.error('Content script fetch 失败:', fetchError);
        throw new Error(`无法获取 Google 图片: ${fetchError.message}`);
      }
      
    } catch (error) {
      console.error('获取 Google 图片失败:', error);
      throw error;
    }
  }

  // 从 HTML 中提取图片 URL
  extractImageUrlsFromHtml(html) {
    const imageUrls = [];
    
    // 方法1: 提取 "ou" 字段（原始图片 URL）
    const ouPattern = /"(?:ou|ow)":"([^"]+)"/g;
    let match;
    while ((match = ouPattern.exec(html)) !== null && imageUrls.length < 20) {
      let url = match[1];
      // 解码 Unicode 转义
      try {
        url = url.replace(/\\u([0-9a-fA-F]{4})/g, (m, code) => String.fromCharCode(parseInt(code, 16)));
        url = url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\\\/g, '\\');
        url = decodeURIComponent(url);
        
        if (url.startsWith('http') && !imageUrls.includes(url)) {
          // 过滤掉 Google 代理图片，优先使用原始图片
          if (!url.includes('googleusercontent.com') || url.includes('gstatic.com')) {
            imageUrls.push(url);
          }
        }
      } catch (e) {
        // 忽略解码错误
      }
    }
    
    // 方法2: 提取更多字段
    if (imageUrls.length < 6) {
      const imgUrlPattern = /"(?:imgurl|img_ref_url|ru)":"([^"]+)"/g;
      while ((match = imgUrlPattern.exec(html)) !== null && imageUrls.length < 20) {
        let url = match[1];
        try {
          url = url.replace(/\\u([0-9a-fA-F]{4})/g, (m, code) => String.fromCharCode(parseInt(code, 16)));
          url = url.replace(/\\u003d/g, '=').replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\\\/g, '\\');
          url = decodeURIComponent(url);
          
          if (url.startsWith('http') && !imageUrls.includes(url)) {
            if (!url.includes('googleusercontent.com') || url.includes('gstatic.com')) {
              imageUrls.push(url);
            }
          }
        } catch (e) {
          // 忽略解码错误
        }
      }
    }
    
    return imageUrls;
  }

  // 加载更多图片（使用 Google 图片源）
  async loadMoreImages(word, container) {
    const preview = container.querySelector('.image-preview');
    if (!preview) return;

    const loadingText = preview.querySelector('.loading-text');
    
    try {
      // 从 Google 获取图片 URL
      if (loadingText) {
        loadingText.textContent = '正在从 Google 搜索图片...';
      }
      
      console.log('🔍 开始获取图片 URL...');
      const imageUrls = await this.getGoogleImages(word);
      
      console.log('📥 收到图片 URL 列表:', imageUrls);
      
      if (!imageUrls || imageUrls.length === 0) {
        console.error('❌ 未获取到图片 URL');
        throw new Error('未找到图片');
      }

      console.log(`✅ 成功获取 ${imageUrls.length} 张图片 URL，开始加载图片...`);

      // 先不清除加载文本，等第一张图片加载成功后再隐藏

      const imageGrid = document.createElement('div');
      imageGrid.className = 'image-grid';
      
      const totalImages = Math.min(imageUrls.length, 6);
      let loadedCount = 0;
      let successCount = 0;

      // 创建图片网格
      for (let i = 0; i < totalImages; i++) {
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'image-item loading';
        
        const img = document.createElement('img');
        img.alt = `${word} - ${i + 1}`;
        // 移除 loading='lazy'，可能导致延迟加载问题
        // 直接显示，不要初始隐藏
        img.referrerPolicy = 'no-referrer-when-downgrade';
        img.decoding = 'async';
        
        const imageUrl = imageUrls[i];
        console.log(`🖼️ 准备加载图片 ${i + 1}/${totalImages}: ${imageUrl}`);
        
        // 设置超时检测（8秒超时）
        let loadTimeout = setTimeout(() => {
          if (!img.complete || !img.naturalWidth) {
            console.warn(`⏱️ 图片 ${i + 1} 加载超时: ${imageUrl.substring(0, 60)}...`);
            loadedCount++;
            if (loadedCount === totalImages && successCount === 0 && loadingText) {
              loadingText.textContent = '图片加载超时，请检查网络';
              loadingText.style.display = 'block';
              loadingText.style.color = '#d32f2f';
            }
          }
        }, 8000);
        
        img.onload = () => {
          clearTimeout(loadTimeout);
          console.log(`✅ 图片 ${i + 1} 加载成功！`);
          
          // 移除加载动画
          imgWrapper.classList.remove('loading');
          
          successCount++;
          loadedCount++;
          
          // 立即隐藏加载文本（第一张成功时）
          if (successCount === 1 && loadingText) {
            loadingText.style.display = 'none';
          }
          
          // 检查是否所有图片都加载完成
          if (loadedCount === totalImages) {
            console.log(`📊 图片加载统计: 成功 ${successCount}/${totalImages}`);
            if (successCount === 0 && loadingText) {
              loadingText.textContent = '所有图片加载失败，请检查网络连接';
              loadingText.style.display = 'block';
              loadingText.style.color = '#d32f2f';
            } else if (loadingText) {
              loadingText.style.display = 'none';
            }
          }
        };
        
        img.onerror = (error) => {
          clearTimeout(loadTimeout);
          console.error(`❌ 图片 ${i + 1} 加载失败`);
          console.error(`URL: ${imageUrl}`);
          console.error(`错误:`, error);
          
          // 加载失败时，隐藏这个图片容器，但不要完全移除
          imgWrapper.style.opacity = '0.3';
          imgWrapper.style.background = '#f0f0f0';
          
          // 尝试显示错误图标或占位符
          if (!imgWrapper.querySelector('.error-icon')) {
            const errorIcon = document.createElement('div');
            errorIcon.className = 'error-icon';
            errorIcon.textContent = '✕';
            errorIcon.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #999; font-size: 24px;';
            imgWrapper.style.position = 'relative';
            imgWrapper.appendChild(errorIcon);
          }
          
          loadedCount++;
          
          // 检查是否所有图片都失败
          if (loadedCount === totalImages) {
            console.log(`📊 所有图片加载完成: 成功 ${successCount}/${totalImages}`);
            if (successCount === 0 && loadingText) {
              loadingText.textContent = `所有图片加载失败（可能是 CORS 限制），尝试刷新或检查网络`;
              loadingText.style.display = 'block';
              loadingText.style.color = '#d32f2f';
            } else if (successCount > 0 && loadingText) {
              loadingText.style.display = 'none';
              console.log(`✅ 成功显示 ${successCount} 张图片`);
            }
          }
        };
        
        // 先将元素添加到 DOM
        imgWrapper.appendChild(img);
        imageGrid.appendChild(imgWrapper);
        
        // 然后设置图片 URL（立即加载，不延迟）
        img.src = imageUrl;
      }

      // 清空预览区域并添加网格
      if (loadingText) {
        preview.innerHTML = '';
        preview.appendChild(loadingText);
      }
      preview.appendChild(imageGrid);
      
      // 立即显示网格容器，即使图片还在加载
      console.log('📦 图片网格已添加到 DOM，等待图片加载...');
      
    } catch (error) {
      console.error("加载 Google 图片失败:", error);
      if (loadingText) {
        let errorMessage = '图片加载失败：' + error.message;
        
        // 如果是扩展上下文失效，给出更明确的提示
        if (error.message.includes('扩展') || error.message.includes('Extension context')) {
          errorMessage = '扩展已重新加载，请刷新页面后重试';
          // 2秒后显示刷新按钮
          setTimeout(() => {
            if (loadingText) {
              loadingText.innerHTML = `
                <div style="text-align: center;">
                  <p style="color: #d32f2f; margin-bottom: 12px;">${errorMessage}</p>
                  <button onclick="location.reload()" style="
                    padding: 8px 16px;
                    background: #4CAF50;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                  ">刷新页面</button>
                </div>
              `;
            }
          }, 2000);
        } 
        // 如果是无法获取 Google 搜索结果的错误，尝试备用方案
        else if (error.message.includes('无法') || error.message.includes('Failed to fetch') || error.message.includes('无法获取')) {
          errorMessage = '无法连接 Google，尝试使用备用图片源（Unsplash）...';
          loadingText.textContent = errorMessage;
          loadingText.style.display = 'block';
          
          // 使用备用图片源（只使用 Unsplash）
          setTimeout(() => {
            this.loadFallbackImages(word, container);
          }, 500);
          return;
        }
        
        loadingText.textContent = errorMessage;
        loadingText.style.display = 'block';
        loadingText.style.color = '#d32f2f';
      }
    }
  }

  // 创建图片展示容器
  createImageContainer() {
    const container = document.createElement('div');
    container.className = 'word-image-container';
    container.style.display = 'none';
    document.body.appendChild(container);
    this.imageContainer = container;
  }

  // 显示加载状态
  showLoading(word) {
    this.imageContainer.innerHTML = `
      <div class="image-header">
        <h3><strong>${word}</strong></h3>
        <button class="close-btn" onclick="this.closest('.word-image-container').style.display='none'">×</button>
      </div>
      <div class="image-content">
        <div class="loading-text">加载中...</div>
      </div>
    `;
    this.imageContainer.style.display = 'block';
    this.isVisible = true;
  }

  // 显示错误信息
  showError(message) {
    this.imageContainer.innerHTML = `
      <div class="image-header">
        <h3>提示</h3>
        <button class="close-btn" onclick="this.closest('.word-image-container').style.display='none'">×</button>
      </div>
      <div class="image-content">
        <div class="error">${message}</div>
      </div>
    `;
    this.imageContainer.style.display = 'block';
    this.isVisible = true;
  }
}

// 初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new WordImageHelper();
  });
} else {
  new WordImageHelper();
}

