# 视频解码器错误处理指南

## 常见错误及解决方案

### 1. 🚫 AVC/H.264 编码错误

**错误信息**：
```
Video codec not supported or not AVC/H.264
```

**原因**：视频文件不是使用 H.264/AVC 编码，可能使用了 H.265/HEVC、VP9 等其他编码格式。

**解决方案**：
- ✅ 使用 H.264/AVC 编码的 MP4 文件
- ✅ 转换视频格式：
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
  ```

### 2. 📂 MP4 结构错误

**错误信息**：
```
Invalid MP4 structure: missing required boxes
```

**原因**：MP4 文件结构不完整或损坏。

**解决方案**：
- ✅ 确认文件完整性
- ✅ 重新下载或转换文件
- ✅ 使用工具修复 MP4 文件：
  ```bash
  ffmpeg -i input.mp4 -c copy output.mp4
  ```

### 3. 📺 SPS/PPS 参数缺失

**错误信息**：
```
SPS (Sequence Parameter Set) not found in AVCC box
PPS (Picture Parameter Set) not found in AVCC box
```

**原因**：视频编码参数不完整，通常出现在：
- 不完整的 MP4 文件
- 某些特殊编码配置
- 损坏的视频文件

**解决方案**：
- ✅ 重新编码视频文件
- ✅ 使用标准编码参数：
  ```bash
  ffmpeg -i input.mp4 -c:v libx264 -profile:v baseline -level 3.0 output.mp4
  ```

### 4. 🌐 网络获取错误

**错误信息**：
```
Failed to fetch video: HTTP 404: Not Found
Failed to fetch video: CORS error
```

**原因**：
- URL 不存在或无法访问
- CORS 策略阻止访问
- 网络连接问题

**解决方案**：
- ✅ 使用本地文件功能
- ✅ 检查 URL 正确性
- ✅ 使用支持 CORS 的视频源

### 5. 📏 文件格式错误

**错误信息**：
```
URL provided is not a valid mp4 video file
```

**原因**：
- 文件不是 MP4 格式
- 文件扩展名错误
- 文件内容损坏

**解决方案**：
- ✅ 确认文件格式为 MP4
- ✅ 检查文件扩展名
- ✅ 使用视频格式转换工具

## 支持的视频格式

### ✅ 完全支持
- **编码格式**：H.264/AVC
- **容器格式**：MP4
- **音频格式**：AAC（可选）
- **分辨率**：任意
- **帧率**：任意

### ⚠️ 部分支持
- **编码格式**：H.265/HEVC（需要浏览器支持）
- **音频格式**：MP3、AC3（可能需要额外处理）

### ❌ 不支持
- **容器格式**：AVI、MKV、MOV、WMV
- **编码格式**：VP9、AV1、RMVB
- **流媒体格式**：HLS、DASH、RTMP

## 视频转换指南

### 推荐的 FFmpeg 命令

#### 基本转换
```bash
ffmpeg -i input.mp4 -c:v libx264 -c:a aac output.mp4
```

#### 高兼容性转换
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -profile:v baseline \
  -level 3.0 \
  -pix_fmt yuv420p \
  -c:a aac \
  -ar 44100 \
  output.mp4
```

#### 小文件优化
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -crf 28 \
  -preset veryfast \
  -c:a aac \
  -b:a 128k \
  output.mp4
```

#### 高质量转换
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 \
  -crf 18 \
  -preset slow \
  -c:a aac \
  -b:a 192k \
  output.mp4
```

## 测试视频推荐

### 在线测试视频
1. **Big Buck Bunny**：
   - URL: `https://www.w3schools.com/html/mov_bbb.mp4`
   - 编码: H.264
   - 分辨率: 320x176

2. **Sample Videos**：
   - URL: `https://sample-videos.com/zip/10/mp4/`
   - 多种分辨率和大小可选

### 本地测试视频
- 使用项目中已提供的测试视频
- 转换自己的视频文件为标准格式

## 调试技巧

### 1. 使用浏览器开发者工具
```javascript
// 检查 WebCodecs 支持
console.log('VideoDecoder:', typeof VideoDecoder);
console.log('EncodedVideoChunk:', typeof EncodedVideoChunk);

// 检查视频信息
const video = document.createElement('video');
video.src = 'your-video.mp4';
video.addEventListener('loadedmetadata', () => {
  console.log('Duration:', video.duration);
  console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
});
```

### 2. 验证 MP4 文件
```bash
# 检查视频信息
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4

# 检查编码格式
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name input.mp4
```

### 3. 使用调试模式
在视频解码器页面中：
- ✅ 启用"调试模式"复选框
- ✅ 查看详细的解码日志
- ✅ 监控错误和警告信息

## 性能优化建议

### 1. 文件大小
- 📁 **推荐**: < 100MB 用于流畅播放
- ⚠️ **可接受**: 100-500MB 可能有延迟
- ❌ **不推荐**: > 500MB 可能导致内存问题

### 2. 分辨率
- ✅ **推荐**: 1920x1080 或更小
- ⚠️ **可接受**: 3840x2160 (4K) 需要强大设备
- ❌ **不推荐**: 8K+ 可能有性能问题

### 3. 比特率
- 📁 **推荐**: 2-10 Mbps
- ⚠️ **可接受**: 10-25 Mbps
- ❌ **不推荐**: > 25 Mbps

## 常见问题 FAQ

### Q: 为什么我的 MP4 文件无法解码？
A: 检查编码格式，确认是 H.264/AVC 编码。使用 FFmpeg 转换格式。

### Q: 如何批量转换视频文件？
A: 使用 shell 脚本批量处理：
```bash
for file in *.avi; do
  ffmpeg -i "$file" -c:v libx264 -c:a aac "${file%.avi}.mp4"
done
```

### Q: 解码速度很慢怎么办？
A: 
- 降低视频分辨率和比特率
- 使用更快的设备
- 关闭其他消耗资源的应用

### Q: 如何处理音频？
A: 当前版本主要处理视频流，音频播放需要额外实现。