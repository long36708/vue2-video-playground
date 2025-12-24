<template>
  <div class="mp4-analyzer">
    <div class="header">
      <h1>MP4 文件分析器</h1>
      <p>基于 MP4Box.js 的高效文件信息解析工具</p>
    </div>

    <div class="controls">
      <div class="file-input-section">
        <label for="fileInput">选择 MP4 文件:</label>
        <input 
          id="fileInput"
          type="file" 
          accept=".mp4,.m4v,.mov"
          @change="handleFileSelect"
          :disabled="analyzing"
        />
        <button 
          @click="analyzeFile" 
          :disabled="!selectedFile || analyzing"
          class="analyze-btn"
        >
          {{ analyzing ? '分析中...' : '开始分析' }}
        </button>
      </div>

      <div class="preset-files">
        <label>预设文件:</label>
        <button 
          v-for="(preset, index) in presetFiles" 
          :key="index"
          @click="loadPresetFile(preset)"
          :class="{ active: selectedFile?.name === preset.name }"
          class="preset-btn"
        >
          {{ preset.name }}
        </button>
      </div>

      <div class="options">
        <label>
          <input type="checkbox" v-model="showRawData" />
          显示原始数据
        </label>
        <label>
          <input type="checkbox" v-model="enableDebug" />
          调试模式
        </label>
        <label>
          <input type="checkbox" v-model="showChunkProgress" />
          显示分块进度
        </label>
      </div>
    </div>

    <div class="status-bar" v-if="status || error">
      <div v-if="error" class="error">{{ error }}</div>
      <div v-else-if="status" class="status">{{ status }}</div>
    </div>

    <div class="progress-section" v-if="analyzing">
      <h3>分析进度</h3>
      <div class="progress-info">
        <span>当前块: {{ currentChunk }}</span>
        <span>总块数: {{ totalChunks }}</span>
        <span>已读取: {{ formatBytes(bytesRead) }} / {{ formatBytes(totalBytes) }}</span>
      </div>
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
      <div v-if="showChunkProgress" class="chunk-details">
        <div 
          v-for="chunk in chunkProgress" 
          :key="chunk.index"
          class="chunk-item"
          :class="{ loaded: chunk.loaded }"
        >
          <span class="chunk-index">{{ chunk.index }}</span>
          <span class="chunk-info">
            {{ chunk.from }} - {{ chunk.to }} ({{ formatBytes(chunk.size) }})
          </span>
        </div>
      </div>
    </div>

    <div class="results-section" v-if="mp4Info">
      <h3>文件信息</h3>
      
      <!-- 基本信息 -->
      <div class="info-card">
        <h4>📁 基本信息</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>文件名:</label>
            <span>{{ selectedFile?.name || '未知' }}</span>
          </div>
          <div class="info-item">
            <label>文件大小:</label>
            <span>{{ formatBytes(selectedFile?.size || 0) }}</span>
          </div>
          <div class="info-item">
            <label>最大播放时长:</label>
            <span>{{ formatDuration(mp4Info.maxPlaybackPosition) }}</span>
          </div>
          <div class="info-item">
            <label>分析耗时:</label>
            <span>{{ analysisTime }}ms</span>
          </div>
        </div>
      </div>

      <!-- 音频轨道信息 -->
      <div class="info-card" v-if="mp4Info.audioTrackInfos.length">
        <h4>🎵 音频轨道 ({{ mp4Info.audioTrackInfos.length }})</h4>
        <div class="track-list">
          <div 
            v-for="(track, index) in mp4Info.audioTrackInfos" 
            :key="track.id"
            class="track-item"
          >
            <div class="track-header">
              <span class="track-title">轨道 {{ index + 1 }}</span>
              <span class="track-id">ID: {{ track.id }}</span>
            </div>
            <div class="track-details">
              <div class="detail-item">
                <label>编码格式:</label>
                <span class="codec-badge">{{ track.codec }}</span>
              </div>
              <div class="detail-item">
                <label>声道数:</label>
                <span>{{ track.channelCount }} 声道</span>
              </div>
              <div class="detail-item">
                <label>采样率:</label>
                <span>{{ formatFrequency(track.sampleRate) }}</span>
              </div>
              <div class="detail-item">
                <label>比特率估算:</label>
                <span>{{ estimateBitrate(track) }} kbps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无音频轨道 -->
      <div class="info-card" v-else>
        <h4>🎵 音频轨道</h4>
        <div class="no-tracks">
          <p>未检测到音频轨道</p>
          <p>这可能是纯视频文件或音频流有问题</p>
        </div>
      </div>

      <!-- 原始数据显示 -->
      <div class="info-card" v-if="showRawData && rawMp4Info">
        <h4>🔍 原始数据</h4>
        <div class="raw-data">
          <pre>{{ JSON.stringify(rawMp4Info, null, 2) }}</pre>
        </div>
      </div>
    </div>

    <!-- 性能统计 -->
    <div class="stats-section" v-if="performanceStats">
      <h3>性能统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <label>分块读取次数:</label>
          <span>{{ performanceStats.chunksRead }}</span>
        </div>
        <div class="stat-item">
          <label>平均读取速度:</label>
          <span>{{ formatBytes(performanceStats.avgReadSpeed) }}/s</span>
        </div>
        <div class="stat-item">
          <label>峰值内存使用:</label>
          <span>{{ formatBytes(performanceStats.peakMemory) }}</span>
        </div>
        <div class="stat-item">
          <label>解析效率:</label>
          <span>{{ performanceStats.efficiency }}%</span>
        </div>
      </div>
    </div>

    <!-- 调试日志 -->
    <div class="debug-section" v-if="enableDebug && debugLogs.length">
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
import { getMp4FileInfo, getMp4Info, toMp4ArrayBuffer } from '../utils/mp4box';
import * as MP4Box from 'mp4box';
import * as MP4Box from 'mp4box';

export default {
  name: 'Mp4AnalyzerPage',
  data() {
    return {
      // 文件相关
      selectedFile: null,
      analyzing: false,
      
      // 结果数据
      mp4Info: null,
      rawMp4Info: null,
      
      // 进度相关
      status: '',
      error: '',
      currentChunk: 0,
      totalChunks: 0,
      bytesRead: 0,
      totalBytes: 0,
      chunkProgress: [],
      
      // 选项
      showRawData: false,
      enableDebug: false,
      showChunkProgress: false,
      
      // 性能统计
      analysisTime: 0,
      performanceStats: null,
      
      // 调试日志
      debugLogs: [],
      
      // 预设文件
      presetFiles: [
        {
          name: '本地测试视频',
          url: '/石川由依翻唱MV中日歌词三笠亲自唱恶魔之子.mp4',
          type: 'remote'
        }
      ]
    };
  },
  
  computed: {
    progressPercentage() {
      return this.totalBytes > 0 ? (this.bytesRead / this.totalBytes) * 100 : 0;
    }
  },
  
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      if (file) {
        this.selectedFile = file;
        this.resetResults();
        this.addDebugLog(`选择文件: ${file.name} (${this.formatBytes(file.size)})`, 'info');
      }
    },
    
    async loadPresetFile(preset) {
      try {
        if (preset.type === 'remote') {
          const response = await fetch(preset.url);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const blob = await response.blob();
          this.selectedFile = new File([blob], preset.name, { type: 'video/mp4' });
          this.addDebugLog(`加载预设文件: ${preset.name}`, 'success');
        }
        this.resetResults();
      } catch (error) {
        this.error = `加载预设文件失败: ${error.message}`;
        this.addDebugLog(`预设文件加载失败: ${error.message}`, 'error');
      }
    },
    
    async analyzeFile() {
      if (!this.selectedFile) {
        this.error = '请先选择一个文件';
        return;
      }
      
      this.analyzing = true;
      this.error = '';
      this.status = '初始化 MP4Box...';
      this.addDebugLog('开始分析文件', 'info');
      
      const startTime = performance.now();
      
      try {
        // 创建增强的 MP4Box 实例，用于监控
        const mp4boxFile = this.createEnhancedMp4Box();
        
        this.status = '分析文件结构...';
        this.totalBytes = this.selectedFile.size;
        
        // 获取结构化信息
        this.mp4Info = await this.analyzeWithProgress(this.selectedFile, mp4boxFile);
        
        // 获取原始信息（如果需要）
        if (this.showRawData) {
          this.rawMp4Info = await getMp4Info(this.selectedFile);
        }
        
        this.analysisTime = Math.round(performance.now() - startTime);
        this.calculatePerformanceStats();
        
        this.status = '分析完成';
        this.addDebugLog(`文件分析完成，耗时 ${this.analysisTime}ms`, 'success');
        
      } catch (error) {
        this.error = `分析失败: ${error.message}`;
        this.status = '';
        this.addDebugLog(`分析失败: ${error.message}`, 'error');
        console.error('MP4 analysis error:', error);
      } finally {
        this.analyzing = false;
      }
    },
    
    createEnhancedMp4Box() {
      const mp4boxFile = MP4Box.createFile(false);
      
      // 监控解析过程
      const originalAppendBuffer = mp4boxFile.appendBuffer.bind(mp4boxFile);
      mp4boxFile.appendBuffer = (buffer) => {
        this.bytesRead += buffer.byteLength;
        this.currentChunk++;
        
        const progress = Math.round((this.bytesRead / this.totalBytes) * 100);
        this.status = `分析中... ${progress}%`;
        
        this.addDebugLog(
          `读取块 ${this.currentChunk}: ${this.formatBytes(buffer.byteLength)} (总计: ${this.formatBytes(this.bytesRead)})`,
          'debug'
        );
        
        return originalAppendBuffer(buffer);
      };
      
      return mp4boxFile;
    },
    
    async analyzeWithProgress(file, mp4boxFile) {
      // 模拟分块进度显示
      this.totalChunks = Math.ceil(file.size / (1024 * 1024)); // 1MB chunks
      this.generateChunkProgress(file.size);
      
      return new Promise((resolve, reject) => {
        mp4boxFile.onReady = (info) => {
          this.addDebugLog('MP4Box 准备就绪', 'success');
          
          // 转换为我们的格式
          const mp4FileInfo = {
            maxPlaybackPosition: info.duration / info.timescale,
            audioTrackInfos: info.audioTracks.map(track => ({
              id: track.id,
              codec: track.codec,
              channelCount: track.audio.channel_count,
              sampleRate: track.audio.sample_rate
            }))
          };
          
          resolve(mp4FileInfo);
        };
        
        mp4boxFile.onError = (error) => {
          this.addDebugLog(`MP4Box 错误: ${error}`, 'error');
          reject(new Error(`MP4Box parsing error: ${error}`));
        };
        
        // 开始解析
        this.readFileInChunks(file, mp4boxFile).catch(reject);
      });
    },
    
    async readFileInChunks(file, mp4boxFile) {
      const chunkSize = 1024 * 1024; // 1MB
      let offset = 0;
      
      while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const arrayBuffer = await chunk.arrayBuffer();
        
        // 设置 MP4Box 需要的属性
        (arrayBuffer).fileStart = offset;
        
        mp4boxFile.appendBuffer(arrayBuffer);
        offset += chunkSize;
      }
      
      mp4boxFile.flush();
    },
    
    generateChunkProgress(fileSize) {
      this.chunkProgress = [];
      const chunkSize = 1024 * 1024; // 1MB
      const numChunks = Math.ceil(fileSize / chunkSize);
      
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const size = end - start;
        
        this.chunkProgress.push({
          index: i + 1,
          from: start,
          to: end,
          size: size,
          loaded: false
        });
      }
    },
    
    calculatePerformanceStats() {
      const fileSize = this.selectedFile.size;
      const chunksRead = Math.ceil(fileSize / (1024 * 1024));
      const avgReadSpeed = fileSize / (this.analysisTime / 1000); // bytes per second
      const peakMemory = fileSize; // 简化估算
      const efficiency = Math.min(100, Math.round((this.currentChunk / this.totalChunks) * 100));
      
      this.performanceStats = {
        chunksRead,
        avgReadSpeed,
        peakMemory,
        efficiency
      };
    },
    
    resetResults() {
      this.mp4Info = null;
      this.rawMp4Info = null;
      this.error = '';
      this.status = '';
      this.currentChunk = 0;
      this.bytesRead = 0;
      this.chunkProgress = [];
      this.performanceStats = null;
      this.analysisTime = 0;
    },
    
    addDebugLog(message, type = 'info') {
      this.debugLogs.push({
        timestamp: new Date().toLocaleTimeString(),
        message,
        type
      });
      
      // 限制日志数量
      if (this.debugLogs.length > 50) {
        this.debugLogs.shift();
      }
    },
    
    // 格式化方法
    formatBytes(bytes) {
      if (!bytes) return '0 B';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    },
    
    formatDuration(seconds) {
      if (!seconds || seconds === Infinity) return '未知';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
    
    formatFrequency(hz) {
      if (hz >= 1000) {
        return `${(hz / 1000).toFixed(1)} kHz`;
      }
      return `${hz} Hz`;
    },
    
    estimateBitrate(track) {
      // 简化的比特率估算
      const typicalBitrates = {
        'mp4a.40.2': 128, // AAC-LC
        'mp4a.40.5': 192, // HE-AAC
        'mp4a.40.1': 96,  // AAC Main
        'mp4a.40.29': 96  // AAC-HE
      };
      
      return typicalBitrates[track.codec] || 128;
    }
  }
};
</script>

<style scoped>
.mp4-analyzer {
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

.file-input-section {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.file-input-section label {
  font-weight: 500;
  min-width: 100px;
}

.file-input-section input[type="file"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.analyze-btn {
  padding: 8px 20px;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

.analyze-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.preset-files {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
}

.preset-files label {
  font-weight: 500;
  margin-right: 10px;
}

.preset-btn {
  padding: 6px 12px;
  background: #e9ecef;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.preset-btn:hover {
  background: #dee2e6;
}

.preset-btn.active {
  background: #42b983;
  color: white;
  border-color: #42b983;
}

.options {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.options label {
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

.progress-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.progress-info {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  flex-wrap: wrap;
  font-size: 14px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 15px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #42b983, #28a745);
  transition: width 0.3s ease;
}

.chunk-details {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px;
}

.chunk-item {
  display: flex;
  gap: 15px;
  padding: 5px 0;
  border-bottom: 1px solid #f1f3f4;
  font-size: 12px;
}

.chunk-item:last-child {
  border-bottom: none;
}

.chunk-item.loaded {
  color: #28a745;
  font-weight: 500;
}

.chunk-index {
  min-width: 30px;
  font-weight: bold;
}

.chunk-info {
  flex: 1;
}

.results-section {
  margin-bottom: 20px;
}

.info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.info-card h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #495057;
  border-bottom: 2px solid #42b983;
  padding-bottom: 8px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
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

.track-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.track-item {
  border: 1px solid #e9ecef;
  border-radius: 6px;
  padding: 15px;
  background: #f8f9fa;
}

.track-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-weight: bold;
}

.track-id {
  color: #6c757d;
  font-size: 12px;
  font-weight: normal;
}

.track-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.detail-item label {
  font-size: 13px;
  color: #666;
}

.codec-badge {
  background: #007bff;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-family: monospace;
}

.no-tracks {
  text-align: center;
  color: #6c757d;
  padding: 20px;
  font-style: italic;
}

.raw-data {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 10px;
}

.raw-data pre {
  margin: 0;
  font-size: 12px;
  font-family: 'Courier New', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

.stats-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.stat-item label {
  font-weight: 500;
  color: #666;
}

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
.log-entry.debug .message { color: #6c757d; }

@media (max-width: 768px) {
  .file-input-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .file-input-section label {
    min-width: auto;
  }
  
  .info-grid,
  .track-details,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .progress-info {
    flex-direction: column;
    gap: 5px;
  }
}
</style>