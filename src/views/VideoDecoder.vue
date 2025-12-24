<template>
  <div class="video-decoder">
    <div class="header">
      <h1>视频解码器演示</h1>
      <p>基于 WebCodecs API 的 MP4 视频实时解码</p>
    </div>

    <div class="controls">
      <div class="input-group">
        <label for="videoUrl">视频URL:</label>
        <input 
          id="videoUrl"
          v-model="videoUrl" 
          type="text" 
          placeholder="输入MP4视频文件URL"
          @keyup.enter="loadVideo"
        />
        <button @click="loadVideo" :disabled="loading">
          {{ loading ? '加载中...' : '加载视频' }}
        </button>
      </div>

      <div class="file-input-group">
        <label for="videoFile">或选择本地视频:</label>
        <input 
          id="videoFile"
          type="file" 
          accept="video/mp4"
          @change="handleFileSelect"
        />
        <button @click="loadLocalFile" :disabled="!selectedFile || loading">
          {{ loading ? '加载中...' : '加载本地视频' }}
        </button>
      </div>

      <div class="preset-videos">
        <label>预设视频:</label>
        <button 
          v-for="(url, index) in presetVideos" 
          :key="index"
          @click="selectPresetVideo(url)"
          :class="{ active: videoUrl === url }"
        >
          {{ presetVideos[index].name }}
        </button>
      </div>

      <div class="controls-row">
        <label>
          <input type="checkbox" v-model="debugMode" />
          调试模式
        </label>
        <label>
          <input type="checkbox" v-model="showStats" />
          显示统计信息
        </label>
        <label>
          <input type="checkbox" v-model="playAutomatically" />
          自动播放
        </label>
      </div>
    </div>

    <div class="status-bar" v-if="status || error">
      <div v-if="error" class="error">{{ error }}</div>
      <div v-else-if="status" class="status">{{ status }}</div>
    </div>

    <div class="main-content">
      <div class="video-section">
        <h3>解码输出</h3>
        <div class="canvas-container">
          <canvas 
            ref="canvas"
            :width="canvasWidth"
            :height="canvasHeight"
            @click="togglePlay"
          ></canvas>
          <div v-if="!isWebCodecsSupported" class="unsupported-overlay">
            <div class="unsupported-content">
              <h4>浏览器不支持 WebCodecs API</h4>
              <p>请使用 Chrome 94+, Edge 94+, 或 Opera 80+</p>
            </div>
          </div>
          <div v-if="!hasVideo && !loading" class="placeholder">
            <p>请加载视频文件</p>
          </div>
        </div>
        
        <div class="playback-controls" v-if="hasVideo">
          <button @click="togglePlay">
            {{ isPlaying ? '暂停' : '播放' }}
          </button>
          <button @click="resetVideo">重置</button>
          <button @click="captureFrame">截图</button>
        </div>
      </div>

      <div class="info-section">
        <h3>视频信息</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>编码格式:</label>
            <span>{{ videoInfo.codec || '未知' }}</span>
          </div>
          <div class="info-item">
            <label>帧率:</label>
            <span>{{ videoInfo.fps || '未知' }} FPS</span>
          </div>
          <div class="info-item">
            <label>分辨率:</label>
            <span>{{ canvasWidth }} × {{ canvasHeight }}</span>
          </div>
          <div class="info-item">
            <label>总帧数:</label>
            <span>{{ frameCount }}</span>
          </div>
          <div class="info-item">
            <label>当前帧:</label>
            <span>{{ currentFrame }}</span>
          </div>
          <div class="info-item">
            <label>解码状态:</label>
            <span :class="decoderState">{{ decoderState }}</span>
          </div>
        </div>

        <div v-if="showStats" class="stats">
          <h4>性能统计</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <label>解码速度:</label>
              <span>{{ decodeSpeed.toFixed(2) }} FPS</span>
            </div>
            <div class="stat-item">
              <label>平均帧时间:</label>
              <span>{{ averageFrameTime.toFixed(2) }} ms</span>
            </div>
            <div class="stat-item">
              <label>缓冲区大小:</label>
              <span>{{ bufferSize }} 帧</span>
            </div>
            <div class="stat-item">
              <label>内存使用:</label>
              <span>{{ memoryUsage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="debug-section" v-if="debugMode && debugLogs.length">
      <h3>调试日志</h3>
      <div class="debug-log">
        <div 
          v-for="(log, index) in debugLogs" 
          :key="index"
          :class="['log-entry', log.type]"
        >
          <span class="timestamp">{{ log.timestamp }}</span>
          <span class="message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import decodeVideo from '../utils/videoDecoder.js';

export default {
  name: 'VideoDecoderPage',
  data() {
    return {
      videoUrl: '',
      loading: false,
      hasVideo: false,
      isPlaying: false,
      currentFrame: 0,
      frameCount: 0,
      videoInfo: {
        codec: '',
        fps: 0,
        duration: 0
      },
      status: '',
      error: '',
      debugMode: false,
      showStats: false,
      playAutomatically: false,
      debugLogs: [],
      
      // Canvas相关
      canvasWidth: 640,
      canvasHeight: 360,
      canvasContext: null,
      
      // 解码器状态
      decoderState: '未初始化',
      isWebCodecsSupported: true,
      
      // 帧缓冲
      frameBuffer: [],
      maxBufferSize: 30,
      
      // 性能统计
      decodeSpeed: 0,
      averageFrameTime: 0,
      frameTimestamps: [],
      bufferSize: 0,
      memoryUsage: '0 MB',
      
 // 预设视频URL（使用支持CORS的公开示例视频）
      presetVideos: [
        { 
          url: 'https://www.w3schools.com/html/mov_bbb.mp4', 
          name: 'Big Buck Bunny (小)' 
        },
        { 
          url: '/石川由依翻唱MV中日歌词三笠亲自唱恶魔之子.mp4', 
          name: '本地测试视频' 
        },
        { 
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', 
          name: 'Sample Video' 
        }
      ],
      
      // 本地文件相关
      selectedFile: null,
      localFileUrl: null,
      
      // 动画相关
      animationId: null,
      lastFrameTime: 0
    };
  },
  
  mounted() {
    this.initCanvas();
    this.checkWebCodecsSupport();
  },
  
  beforeDestroy() {
    this.cleanup();
  },
  
  methods: {
    initCanvas() {
      const canvas = this.$refs.canvas;
      if (canvas) {
        this.canvasContext = canvas.getContext('2d');
        // 设置黑色背景
        this.canvasContext.fillStyle = '#000';
        this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
    },
    
    checkWebCodecsSupport() {
      this.isWebCodecsSupported = !!(typeof VideoDecoder === 'function' && 
                                     typeof EncodedVideoChunk === 'function');
      if (!this.isWebCodecsSupported) {
        this.error = '当前浏览器不支持 WebCodecs API';
        this.decoderState = '不支持';
        this.addDebugLog('浏览器不支持 WebCodecs API', 'error');
      } else {
        this.addDebugLog('WebCodecs API 支持检测通过', 'success');
      }
    },
    
    selectPresetVideo(preset) {
      const url = typeof preset === 'string' ? preset : preset.url;
      this.videoUrl = url;
      this.loadVideo();
    },
    
    handleFileSelect(event) {
      const file = event.target.files[0];
      
      if (!file) {
        this.selectedFile = null;
        return;
      }
      
      // 验证文件类型
      if (file.type !== 'video/mp4') {
        this.error = `不支持的文件格式: ${file.type}，请选择MP4视频文件`;
        this.addDebugLog(`文件格式错误: ${file.type}`, 'error');
        this.selectedFile = null;
        return;
      }
      
      // 验证文件大小（建议不超过 500MB）
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        this.error = `文件过大: ${(file.size / (1024 * 1024)).toFixed(2)}MB，请选择小于500MB的文件`;
        this.addDebugLog(`文件过大: ${(file.size / (1024 * 1024)).toFixed(2)}MB`, 'error');
        this.selectedFile = null;
        return;
      }
      
      this.selectedFile = file;
      this.error = ''; // 清除之前的错误
      
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      this.addDebugLog(`选择本地文件: ${file.name} (${fileSizeMB}MB)`, 'success');
    },
    
    loadLocalFile() {
      if (!this.selectedFile) {
        this.error = '请先选择一个视频文件';
        return;
      }
      
      try {
        // 清理之前的本地文件URL
        if (this.localFileUrl) {
          URL.revokeObjectURL(this.localFileUrl);
        }
        
        // 创建新的本地文件URL
        this.localFileUrl = URL.createObjectURL(this.selectedFile);
        this.videoUrl = this.localFileUrl;
        
        // 验证文件大小（建议不超过 200MB）
        const fileSizeMB = this.selectedFile.size / (1024 * 1024);
        if (fileSizeMB > 200) {
          this.addDebugLog(`文件较大: ${fileSizeMB.toFixed(2)}MB，解码可能较慢`, 'warn');
        }
        
        this.addDebugLog(`创建本地URL: ${this.selectedFile.name} (${fileSizeMB.toFixed(2)}MB)`, 'info');
        this.loadVideo();
      } catch (err) {
        this.error = `创建本地文件URL失败: ${err.message}`;
        this.addDebugLog(`本地文件处理失败: ${err.message}`, 'error');
      }
    },
    
    async loadVideo() {
      if (!this.videoUrl.trim()) {
        this.error = '请输入有效的视频URL或选择本地文件';
        return;
      }
      
      this.resetVideo();
      this.loading = true;
      this.status = '正在加载视频...';
      this.error = '';
      this.addDebugLog(`开始加载视频: ${this.videoUrl}`, 'info');
      
      try {
        // 预检查视频URL是否可访问
        await this.validateVideoUrl();
        await this.startDecoding();
        this.hasVideo = true;
        this.status = '视频加载完成';
        this.addDebugLog('视频加载成功', 'success');
        
        if (this.playAutomatically) {
          this.startPlayback();
        }
      } catch (err) {
        this.error = `加载失败: ${err.message}`;
        this.status = '';
        this.addDebugLog(`加载失败: ${err.message}`, 'error');
        console.error('Video loading error:', err);
        
        // 根据错误类型提供用户友好的建议
        if (err.message.includes('AVC/H.264')) {
          this.error = '不支持的视频编码格式，请使用 H.264/AVC 编码的 MP4 文件';
        } else if (err.message.includes('Invalid MP4 structure')) {
          this.error = '无效的 MP4 文件格式，请确认文件完整性';
        } else if (err.message.includes('SPS') || err.message.includes('PPS')) {
          this.error = '视频编码参数缺失，请尝试其他 MP4 文件';
        } else if (err.message.includes('Failed to fetch')) {
          this.error = '网络获取失败，请检查 URL 或使用本地文件';
        }
      } finally {
        this.loading = false;
      }
    },
    
    async validateVideoUrl() {
      try {
        // 检查是否为本地 blob URL 或 data URL
        if (this.videoUrl.startsWith('blob:') || this.videoUrl.startsWith('data:')) {
          this.addDebugLog('检测到本地文件，跳过URL验证', 'info');
          return; // 本地文件不需要验证
        }
        
        // 检查是否为相对路径（本地资源）
        if (this.videoUrl.startsWith('/') && !this.videoUrl.startsWith('//')) {
          this.addDebugLog('检测到本地资源，跳过URL验证', 'info');
          return; // 本地资源不需要验证
        }
        
        const response = await fetch(this.videoUrl, { 
          method: 'HEAD',
          mode: 'cors' 
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('video/mp4')) {
          throw new Error('URL不指向MP4视频文件');
        }
        
        this.addDebugLog(`视频验证通过: ${contentType}`, 'success');
      } catch (err) {
        if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
          throw new Error('CORS错误或网络无法访问该URL，请尝试本地文件或其他URL');
        }
        throw err;
      }
    },
    
    async startDecoding() {
      return new Promise((resolve, reject) => {
        this.decoderState = '初始化中';
        let frameIndex = 0;
        
        const frameCallback = (bitmap) => {
          this.frameBuffer.push({
            bitmap,
            index: frameIndex++,
            timestamp: performance.now()
          });
          
          // 限制缓冲区大小
          if (this.frameBuffer.length > this.maxBufferSize) {
            const oldFrame = this.frameBuffer.shift();
            oldFrame.bitmap.close();
          }
          
          this.frameCount = frameIndex;
          this.bufferSize = this.frameBuffer.length;
          this.updateStats();
          
          // 如果是第一帧，更新画布大小
          if (frameIndex === 1) {
            this.canvasWidth = bitmap.width;
            this.canvasHeight = bitmap.height;
            this.initCanvas();
            this.addDebugLog(`视频分辨率: ${bitmap.width}x${bitmap.height}`, 'info');
          }
        };
        
        decodeVideo(this.videoUrl, frameCallback, this.debugMode)
          .then(() => {
            this.decoderState = '已完成';
            this.addDebugLog('视频解码完成', 'success');
            resolve();
          })
          .catch((err) => {
            this.decoderState = '错误';
            reject(err);
          });
      });
    },
    
    togglePlay() {
      if (this.isPlaying) {
        this.pausePlayback();
      } else {
        this.startPlayback();
      }
    },
    
    startPlayback() {
      if (!this.hasVideo || this.frameBuffer.length === 0) {
        this.error = '没有可播放的视频帧';
        return;
      }
      
      this.isPlaying = true;
      this.decoderState = '播放中';
      this.addDebugLog('开始播放', 'info');
      this.renderLoop();
    },
    
    pausePlayback() {
      this.isPlaying = false;
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.decoderState = '已暂停';
      this.addDebugLog('暂停播放', 'info');
    },
    
    renderLoop(timestamp = 0) {
      if (!this.isPlaying) return;
      
      // 控制帧率（假设目标30fps）
      const targetFrameTime = 1000 / 30;
      const deltaTime = timestamp - this.lastFrameTime;
      
      if (deltaTime >= targetFrameTime && this.frameBuffer.length > 0) {
        // 获取当前帧
        const frameIndex = this.currentFrame % this.frameBuffer.length;
        const frame = this.frameBuffer[frameIndex];
        
        // 渲染到画布
        this.canvasContext.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.canvasContext.drawImage(frame.bitmap, 0, 0, this.canvasWidth, this.canvasHeight);
        
        this.currentFrame++;
        this.lastFrameTime = timestamp;
        
        // 更新性能统计
        this.updatePerformanceStats(deltaTime);
      }
      
      this.animationId = requestAnimationFrame(this.renderLoop.bind(this));
    },
    
    updatePerformanceStats(frameTime) {
      this.frameTimestamps.push(frameTime);
      if (this.frameTimestamps.length > 30) {
        this.frameTimestamps.shift();
      }
      
      if (this.frameTimestamps.length > 0) {
        const avgTime = this.frameTimestamps.reduce((a, b) => a + b) / this.frameTimestamps.length;
        this.averageFrameTime = avgTime;
        this.decodeSpeed = 1000 / avgTime;
      }
      
      // 估算内存使用（简化计算）
      this.memoryUsage = `${(this.frameBuffer.length * 2.5).toFixed(1)} MB`;
    },
    
    updateStats() {
      // 可以在这里添加更多的统计信息更新
    },
    
    resetVideo() {
      this.pausePlayback();
      this.frameBuffer.forEach(frame => frame.bitmap.close());
      this.frameBuffer = [];
      this.currentFrame = 0;
      this.frameCount = 0;
      this.hasVideo = false;
      this.decoderState = '未初始化';
      this.status = '';
      this.error = '';
      
      // 清空画布
      if (this.canvasContext) {
        this.canvasContext.fillStyle = '#000';
        this.canvasContext.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      }
      
      this.addDebugLog('视频已重置', 'info');
    },
    
    captureFrame() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `frame_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        this.addDebugLog('截图已保存', 'success');
      });
    },
    
    addDebugLog(message, type = 'info') {
      this.debugLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      });
      
      // 限制日志数量
      if (this.debugLogs.length > 100) {
        this.debugLogs.shift();
      }
    },
    
    cleanup() {
      // 停止播放
      this.pausePlayback();
      
      // 释放所有帧资源
      this.frameBuffer.forEach(frame => {
        if (frame.bitmap) {
          frame.bitmap.close();
        }
      });
      this.frameBuffer = [];
      
      // 清理本地文件URL
      if (this.localFileUrl) {
        URL.revokeObjectURL(this.localFileUrl);
        this.localFileUrl = null;
      }
      
      // 清理选中文件
      this.selectedFile = null;
      
      this.addDebugLog('资源已清理', 'info');
    }
  }
};
</script>

<style scoped>
.video-decoder {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
}

.header p {
  color: #7f8c8d;
  font-size: 14px;
}

.controls {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.input-group, .file-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
}

.input-group label, .file-input-group label {
  font-weight: 500;
  min-width: 80px;
}

.input-group input, .file-input-group input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.file-input-group input[type="file"] {
  flex: 1;
  padding: 6px 0;
  font-size: 14px;
}

.input-group button, .file-input-group button {
  padding: 8px 16px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.input-group button:disabled, .file-input-group button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.preset-videos {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.preset-videos label {
  font-weight: 500;
  margin-right: 10px;
}

.preset-videos button {
  padding: 6px 12px;
  background: #e9ecef;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.preset-videos button:hover {
  background: #dee2e6;
}

.preset-videos button.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.controls-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.controls-row label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
}

.status-bar {
  margin-bottom: 20px;
}

.status {
  background: #d4edda;
  color: #155724;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #c3e6cb;
}

.error {
  background: #f8d7da;
  color: #721c24;
  padding: 10px 15px;
  border-radius: 4px;
  border: 1px solid #f5c6cb;
}

.main-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

.video-section, .info-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.canvas-container {
  position: relative;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.canvas-container canvas {
  display: block;
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: contain;
}

.unsupported-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.unsupported-content {
  text-align: center;
}

.placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #666;
  font-size: 16px;
}

.playback-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.playback-controls button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.playback-controls button:hover {
  background: #0056b3;
}

.info-grid {
  display: grid;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.info-item label {
  font-weight: 500;
  color: #666;
}

.stats {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
}

.stats h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #495057;
}

.stats-grid {
  display: grid;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.stat-item label {
  color: #666;
}

.decoder-state {
  font-weight: bold;
}

.decoder-state.未初始化 { color: #6c757d; }
.decoder-state.初始化中 { color: #ffc107; }
.decoder-state.播放中 { color: #28a745; }
.decoder-state.已暂停 { color: #fd7e14; }
.decoder-state.已完成 { color: #17a2b8; }
.decoder-state.错误 { color: #dc3545; }
.decoder-state.不支持 { color: #dc3545; }

.debug-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.debug-section h3 {
  margin-top: 0;
  color: #495057;
}

.debug-log {
  max-height: 300px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 4px 0;
  border-bottom: 1px solid #f1f3f4;
  font-family: monospace;
  font-size: 12px;
}

.log-entry:last-child {
  border-bottom: none;
}

.timestamp {
  color: #6c757d;
  min-width: 80px;
}

.message {
  flex: 1;
}

.log-entry.info .message { color: #495057; }
.log-entry.success .message { color: #28a745; }
.log-entry.error .message { color: #dc3545; }
</style>