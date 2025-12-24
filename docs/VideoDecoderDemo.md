# 视频解码器演示页面

## 概述

`VideoDecoder.vue` 是一个完整的视频解码器演示页面，展示了如何使用 `videoDecoder.js` 工具类进行 MP4 视频的实时解码和渲染。

## 访问方式

通过导航菜单中的"视频解码器"链接访问，或直接访问 `/video-decoder` 路径。

## 功能特性

### 🎥 视频加载与播放
- **URL输入**: 支持手动输入任意有效的 MP4 视频文件 URL
- **预设视频**: 提供3个公开的示例视频供快速测试
- **流式解码**: 使用 WebCodecs API 进行高效的硬件加速解码
- **帧缓冲**: 智能帧缓冲管理，支持流畅播放

### 🎮 播放控制
- **播放/暂停**: 随时控制视频播放状态
- **重置功能**: 一键重置到初始状态
- **截图功能**: 保存当前帧为 PNG 图片
- **自动播放**: 可选择加载完成后自动开始播放

### 📊 实时监控
- **视频信息**: 显示编码格式、分辨率、帧数等基本信息
- **性能统计**: 实时显示解码速度、帧时间、内存使用等性能指标
- **解码器状态**: 监控解码器的运行状态（初始化、播放中、暂停等）

### 🛠️ 调试功能
- **调试模式**: 可开启详细的调试日志
- **日志查看**: 实时显示操作日志和错误信息
- **兼容性检测**: 自动检测浏览器对 WebCodecs API 的支持情况

## 使用说明

### 基本使用流程

1. **选择视频源**:
   - 点击"预设视频"按钮快速加载示例
   - 或在输入框中输入自定义视频URL

2. **加载视频**:
   - 点击"加载视频"按钮开始解码
   - 等待加载完成（状态栏会显示进度）

3. **控制播放**:
   - 使用播放/暂停按钮控制视频
   - 点击画布也可以切换播放状态
   - 使用截图按钮保存当前画面

### 高级功能

1. **调试模式**:
   ```
   勾选"调试模式" → 查看详细日志信息
   ```

2. **性能监控**:
   ```
   勾选"显示统计信息" → 实时查看性能数据
   ```

3. **自动播放**:
   ```
   勾选"自动播放" → 加载完成后自动开始播放
   ```

## 技术实现

### 核心技术栈
- **Vue.js 2**: 页面框架和组件化开发
- **WebCodecs API**: 原生视频解码
- **MP4Box.js**: MP4 容器解析
- **Canvas API**: 视频帧渲染

### 关键组件

#### 1. 视频解码模块
```javascript
import decodeVideo from '../utils/videoDecoder.js';

// 解码回调处理
const frameCallback = (bitmap) => {
  this.frameBuffer.push({ bitmap, index: frameIndex++ });
  // 缓冲区管理
  if (this.frameBuffer.length > this.maxBufferSize) {
    const oldFrame = this.frameBuffer.shift();
    oldFrame.bitmap.close();
  }
};
```

#### 2. 渲染循环
```javascript
renderLoop(timestamp = 0) {
  if (!this.isPlaying) return;
  
  // 帧率控制
  const targetFrameTime = 1000 / 30;
  const deltaTime = timestamp - this.lastFrameTime;
  
  if (deltaTime >= targetFrameTime && this.frameBuffer.length > 0) {
    // 渲染当前帧
    this.canvasContext.drawImage(frame.bitmap, 0, 0);
    this.currentFrame++;
    this.lastFrameTime = timestamp;
  }
  
  this.animationId = requestAnimationFrame(this.renderLoop.bind(this));
}
```

#### 3. 性能监控
```javascript
updatePerformanceStats(frameTime) {
  this.frameTimestamps.push(frameTime);
  if (this.frameTimestamps.length > 30) {
    this.frameTimestamps.shift();
  }
  
  const avgTime = this.frameTimestamps.reduce((a, b) => a + b) / this.frameTimestamps.length;
  this.averageFrameTime = avgTime;
  this.decodeSpeed = 1000 / avgTime;
}
```

### 内存管理

- **帧缓冲限制**: 最多缓存30帧，避免内存溢出
- **及时释放**: 使用 `bitmap.close()` 释放不再使用的帧
- **资源清理**: 组件销毁时自动清理所有资源

## 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 94+
- ✅ Edge 94+
- ✅ Opera 80+

### 不支持的浏览器
- ❌ Safari（截至文档编写时间）
- ❌ Firefox（需要启用实验性功能）

### 降级处理
当浏览器不支持 WebCodecs API 时，页面会显示友好的提示信息，并提供相关建议。

## 性能优化

### 1. 硬件加速
- 使用 GPU 加速的视频解码
- Canvas 2D 渲染优化

### 2. 内存管理
- 智能帧缓冲策略
- 及时释放不用的资源

### 3. 渲染优化
- 控制目标帧率（30 FPS）
- 避免不必要的重绘

## 常见问题

### Q: 为什么视频无法加载？
A: 请检查以下几点：
- 视频URL是否有效
- 视频格式是否为 MP4
- 是否存在跨域访问问题

### Q: 为什么播放卡顿？
A: 可能的原因：
- 视频分辨率过高
- 网络带宽不足
- 设备性能限制

### Q: 如何使用本地视频文件？
A: 当前版本仅支持通过URL加载视频。如需支持本地文件，需要添加文件上传功能。

## 扩展建议

### 1. 功能扩展
- 支持更多视频格式（WebM、AVI等）
- 添加音轨解码支持
- 实现视频剪辑功能
- 添加滤镜和特效

### 2. 用户体验优化
- 拖拽上传本地文件
- 播放进度条控制
- 音量控制
- 全屏播放模式

### 3. 性能优化
- WebWorker 解码
- SIMD 优化
- 更高效的缓冲策略

## 相关文档

- [videoDecoder.js 设计文档](./videoDecoder.md)
- [WebCodecs API 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [MP4Box.js 文档](https://gpac.github.io/mp4box.js/)

## 开发注意事项

1. **内存泄漏**: 确保所有 ImageBitmap 对象都被正确释放
2. **错误处理**: 完善的错误捕获和用户提示
3. **性能监控**: 实时监控解码性能和内存使用
4. **兼容性**: 提供合理的降级方案
5. **用户体验**: 加载状态、进度提示等细节处理