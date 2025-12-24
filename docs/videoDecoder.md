# Video Decoder 设计文档

## 概述

`videoDecoder.js` 是一个基于 WebCodecs API 的视频解码器模块，用于将 MP4 视频文件解码为可渲染的图像帧。

该模块使用 MP4Box.js 进行视频解复用，并结合浏览器的原生 VideoDecoder 进行硬件加速解码。

## 核心功能

### 主要特性

- **MP4 视频解码**：支持标准 MP4 格式的视频文件解码
- **硬件加速**：利用 WebCodecs API 实现硬件加速解码
- **流式处理**：支持大文件的流式读取和解码
- **帧输出**：将解码后的视频帧转换为 ImageBitmap 对象，便于 Canvas 渲染
- **兼容性检测**：自动检测浏览器对 WebCodecs 的支持情况

### 工作流程

```
视频文件 → 流式读取 → MP4解复用 → 帧提取 → VideoDecoder解码 → ImageBitmap输出
```

## 架构设计

### 核心组件

#### 1. Writer 类
```javascript
class Writer {
    constructor(size)
    getData()
    writeUint8(value)
    writeUint16(value)
    writeUint8Array(value)
}
```
**职责**：二进制数据写入工具，用于构建 AVCC 格式的额外数据（extradata）。

#### 2. getExtradata 函数
```javascript
const getExtradata = (avccBox) => { ... }
```
**职责**：从 MP4 的 AVCC 盒中提取解码器所需的配置数据，包括：
- AVC 配置版本
- Profile 和 Level 信息
- SPS（Sequence Parameter Set）
- PPS（Picture Parameter Set）

#### 3. decodeVideo 函数
```javascript
const decodeVideo = (src, emitFrame, { VideoDecoder, EncodedVideoChunk, debug })
```
**职责**：核心解码逻辑，包含以下步骤：
1. **初始化 MP4Box**：创建解复用器实例
2. **配置解码器**：根据视频编码格式设置 VideoDecoder
3. **流式读取**：使用 Fetch API 和 ReadableStream 逐块读取视频文件
4. **解复用**：将 MP4 数据分解为独立的视频样本
5. **解码**：将样本送入 VideoDecoder 进行解码
6. **帧输出**：将解码后的帧转换为 ImageBitmap 并回调

#### 4. 主导出函数
```javascript
export default (src, emitFrame, debug) => { ... }
```
**职责**：入口函数，处理兼容性检测和 API 降级。

## API 接口

### 主函数
```javascript
decodeVideo(src, emitFrame, debug)
```

#### 参数

| 参数名 | 类型 | 描述 |
|--------|------|------|
| `src` | string | 视频文件的 URL 路径 |
| `emitFrame` | function | 帧输出回调函数，接收 ImageBitmap 对象 |
| `debug` | boolean | 是否启用调试日志 |

#### 返回值
- `Promise<void>`：解码完成时 resolve
- 如果浏览器不支持 WebCodecs，返回 `Promise.resolve()`

### 回调函数
```javascript
emitFrame(bitmap: ImageBitmap): void
```
- `bitmap`：解码后的视频帧图像，可直接用于 Canvas 渲染

## 依赖项

### 外部依赖
- **MP4Box.js**：用于 MP4 文件的解复用操作
  ```javascript
  import * as MP4Box from 'mp4box';
  ```

### 浏览器 API
- **WebCodecs API**：
  - `VideoDecoder`：视频解码器
  - `EncodedVideoChunk`：编码视频块
- **Fetch API**：用于文件流式读取
- **Canvas API**：`createImageBitmap` 用于帧转换

## 使用示例

```javascript
import decodeVideo from './utils/videoDecoder.js';

// 解码视频并渲染到 Canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

decodeVideo(
    'path/to/video.mp4',
    (frame) => {
        // 将帧绘制到 Canvas
        ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
        frame.close(); // 释放资源
    },
    true // 启用调试日志
).then(() => {
    console.log('视频解码完成');
}).catch(error => {
    console.error('解码失败:', error);
});
```

## 技术细节

### 解码流程详解

1. **文件读取阶段**
   - 使用 Fetch API 获取视频文件
   - 通过 ReadableStream 逐块读取数据
   - 为每个数据块设置 `fileStart` 偏移量

2. **解复用阶段**
   - MP4Box 解析 MP4 容器格式
   - 提取视频轨道信息（编码格式、时长等）
   - 将视频流分解为独立的样本（samples）

3. **解码器配置**
   - 从 AVCC 盒提取 extradata
   - 配置 VideoDecoder 的编码参数
   - 设置输出和错误处理回调

4. **解码阶段**
   - 将样本分类为关键帧（key）和增量帧（delta）
   - 创建 EncodedVideoChunk 对象
   - 送入 VideoDecoder 进行解码

5. **帧输出阶段**
   - 接收解码后的 VideoFrame 对象
   - 转换为 ImageBitmap 以优化渲染性能
   - 通过回调函数传递给调用方
   - 自动释放 VideoFrame 资源

### 性能优化

- **流式处理**：避免大文件一次性加载到内存
- **硬件加速**：利用 GPU 进行视频解码
- **资源管理**：及时释放 VideoFrame 和 ImageBitmap
- **低质量转换**：`resizeQuality: 'low'` 提高转换速度

### 错误处理

- **兼容性检测**：自动检测 WebCodecs 支持
- **文件验证**：检查是否为有效的 MP4 视频文件
- **解码错误**：捕获并传递解码器错误
- **资源清理**：确保解码器正确关闭

## 浏览器兼容性

### 支持的浏览器
- Chrome 94+
- Edge 94+
- Opera 80+

### 不支持的浏览器
- Safari（截至文档编写时间）
- Firefox（需要启用实验性功能）

### 降级策略
- 检测到不支持 WebCodecs 时，函数返回 resolved Promise
- 可结合其他视频播放方案作为降级选项

## 注意事项

1. **资源管理**：调用方必须及时释放 ImageBitmap 对象
2. **内存使用**：大视频文件可能消耗较多内存
3. **网络依赖**：需要能够访问指定的视频文件 URL
4. **调试模式**：生产环境建议关闭 debug 以提升性能
5. **同源策略**：受浏览器同源策略限制

## 扩展建议

1. **格式支持**：可扩展支持 WebM、AVI 等其他视频格式
2. **音频解码**：添加音频轨道解码支持
3. **错误恢复**：增强错误处理和重试机制
4. **性能监控**：添加解码性能统计功能
5. **预加载策略**：实现智能预加载和缓冲机制
