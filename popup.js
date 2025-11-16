// Popup 脚本
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  
  // 检查当前标签页是否是扇贝单词页面
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url && tabs[0].url.includes('shanbay.com')) {
      statusDiv.textContent = '✅ 已在扇贝单词页面，可以使用！';
      statusDiv.className = 'status active';
    } else {
      statusDiv.textContent = '⚠️ 请先打开扇贝单词学习页面';
      statusDiv.className = 'status inactive';
    }
  });
});

