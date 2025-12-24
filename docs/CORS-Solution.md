# 视频解码器 CORS 问题解决方案

## 问题描述

在使用视频解码器时遇到了以下错误：
```
Uncaught (in promise) TypeError: Failed to fetch at videoDecoder.js:179
```

这是一个典型的 **CORS（跨域资源共享）** 错误，当浏览器尝试从一个域名请求资源，而该资源没有正确配置 CORS 头时就会出现。

## 解决方案

### 1. ✅ 已实现的功能改进

#### 🔧 本地文件支持
- 新增了本地视频文件上传功能
- 完全避免了 CORS 问题
- 支持 `.mp4` 格式文件
- 智能文件验证（类型、大小检查）
- 自动内存管理和 URL 清理
- blob URL 特殊处理（跳过 CORS 验证）

#### 🌐 改进的预设视频
- 更换了支持 CORS 的公开视频 URL
- 添加了本地测试视频选项
- 每个预设视频都有清晰的名称标识

#### 🛡️ 更好的错误处理
- 添加了 URL 验证功能
- 提供了详细的错误信息
- 智能识别 CORS 错误

### 2. 🎯 使用方法

#### 方法一：本地视频文件（推荐）
1. 点击"选择本地视频"按钮
2. 选择一个 MP4 文件
3. 点击"加载本地视频"

#### 方法二：支持 CORS 的在线视频
1. 使用预设视频中的"本地测试视频"（已在项目中）
2. 或使用其他支持 CORS 的视频 URL

#### 方法三：开发服务器配置
如果你需要使用特定的在线视频，可以配置开发服务器：

```javascript
// 在 rsbuild.config.js 中添加代理
export default defineConfig({
  server: {
    proxy: {
      '/proxy-video': {
        target: 'https://your-video-source.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-video/, '')
      }
    }
  }
});
```

### 3. 🔍 智能错误检测

现在视频解码器会自动检测并区分不同类型的错误：

- **网络错误**：无法连接到服务器
- **CORS 错误**：跨域访问被阻止
- **格式错误**：不是有效的 MP4 文件
- **HTTP 错误**：服务器返回错误状态码
- **本地文件**：自动跳过 blob URL 和本地资源的 CORS 验证

### 3.1 🎯 本地文件特殊处理

对于以下 URL 类型，会自动跳过 CORS 验证：
- `blob:` 开头的 URL（File API 生成的本地文件）
- `data:` 开头的 URL（Base64 编码的数据）
- `/` 开头的相对路径（本地静态资源）

### 4. 📋 支持的视频源

#### ✅ 已验证的源
- 本地 MP4 文件
- `public` 目录中的视频文件
- 配置了 CORS 头的在线视频

#### ❌ 不支持的源
- 没有 CORS 头的外部视频
- 某些 CDN 的视频文件
- 需要 API Key 的视频服务

### 5. 🛠️ 开发者指南

#### 如何判断一个视频 URL 是否支持 CORS

```javascript
// 使用此代码测试
async function testCORS(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
    console.log('CORS 支持:', response.ok);
  } catch (error) {
    console.log('CORS 不支持:', error.message);
  }
}
```

#### 推荐的免费视频源

1. **W3Schools**: `https://www.w3schools.com/html/mov_bbb.mp4`
2. **Sample Videos**: `https://sample-videos.com/zip/10/mp4/`
3. **Google Test Videos**: `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/`

### 6. 🚀 性能优化

#### 本地文件优势
- ✅ 无网络延迟
- ✅ 无 CORS 限制
- ✅ 完全控制
- ✅ 更好的隐私保护

#### 内存管理
- 自动清理文件 URL
- 限制帧缓冲区大小
- 及时释放资源

## 快速测试

1. 打开视频解码器页面
2. 点击"本地测试视频"预设按钮
3. 或选择本地的 MP4 文件
4. 观察控制台日志和错误提示

## 故障排除

### 问题：仍然出现 CORS 错误
**解决方案**：
- 使用本地文件功能
- 检查视频 URL 是否正确
- 尝试其他预设视频

### 问题：本地文件无法加载
**解决方案**：
- 确认文件格式是 MP4
- 检查文件大小（建议 < 100MB）
- 尝试刷新页面重新选择

### 问题：视频加载慢
**解决方案**：
- 使用本地文件
- 选择较小的测试视频
- 检查网络连接

---

**注意**：CORS 是浏览器的安全特性，旨在保护用户数据。某些视频源可能故意不允许跨域访问。