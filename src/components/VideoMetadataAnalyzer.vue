<template>
  <div class="video-metadata-analyzer">
    <div class="analyzer-header">
      <h2>视频元信息分析器</h2>
      <p class="description">选择本地视频文件，自动解析并显示详细的元数据信息</p>
    </div>

    <div class="file-selector-section">
      <div class="file-selector">
        <!--    隐藏的文件输入框    -->
        <input
          type="file"
          @change="handleFileSelect"
          accept="video/*"
          ref="fileInput"
          class="file-input"
        >
        <button
          @click="selectFile"
          :disabled="analyzing"
          class="select-btn"
        >
          <span v-if="!analyzing">📹 选择视频文件</span>
          <span v-else>⏳ 分析中...</span>
        </button>
      </div>

      <div v-if="selectedFile && !analyzing" class="selected-file-info">
        <p><strong>已选择文件：</strong>{{ selectedFile.name }}</p>
      </div>
    </div>

    <div v-if="analyzing" class="analyzing-section">
      <div class="analyzing-animation">
        <div class="spinner"></div>
        <p>正在分析视频文件...</p>
        <p class="progress-info">{{ analyzingProgress }}</p>
      </div>
    </div>

    <div v-if="videoMetadata" class="metadata-display">
      <div class="metadata-header">
        <h3>📊 视频元信息</h3>
        <button @click="clearResult" class="clear-btn">清空结果</button>
      </div>

      <div class="metadata-grid">
        <!-- 文件基本信息 -->
        <div class="metadata-section">
          <h4>📁 文件信息</h4>
          <div class="metadata-items">
            <div class="metadata-item">
              <span class="label">文件名：</span>
              <span class="value">{{ videoMetadata.filename }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">文件大小：</span>
              <span class="value">{{ formatFileSize(videoMetadata.fileSize) }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">文件类型：</span>
              <span class="value">{{ getFileType(videoMetadata.filename) }}</span>
            </div>
          </div>
        </div>

        <!-- 视频基本信息 -->
        <div class="metadata-section">
          <h4>🎬 视频信息</h4>
          <div class="metadata-items">
            <div class="metadata-item">
              <span class="label">时长：</span>
              <span class="value">{{ formatDuration(videoMetadata.duration) }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">分辨率：</span>
              <span class="value">{{ videoMetadata.width }} × {{ videoMetadata.height }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">帧率：</span>
              <span class="value">{{ videoMetadata.fps }} fps</span>
            </div>
            <div class="metadata-item">
              <span class="label">视频编码：</span>
              <span class="value">{{ videoMetadata.videoCodec || '未知' }}</span>
            </div>
          </div>
        </div>

        <!-- 音频信息 -->
        <div class="metadata-section">
          <h4>🎵 音频信息</h4>
          <div class="metadata-items">
            <div class="metadata-item">
              <span class="label">音频编码：</span>
              <span class="value">{{ videoMetadata.audioCodec || '无音轨' }}</span>
            </div>
            <div class="metadata-item">
              <span class="label">码率：</span>
              <span class="value">{{ formatBitrate(videoMetadata.bitrate) }}</span>
            </div>
          </div>
        </div>

        <!-- 技术参数 -->
        <div class="metadata-section">
          <h4>⚙️ 技术参数</h4>
          <div class="metadata-items">
            <div class="metadata-item">
              <span class="label">总码率：</span>
              <span class="value">{{ formatBitrate(videoMetadata.bitrate) }}</span>
            </div>
            <div class="metadata-item" v-if="videoMetadata.aspectRatio">
              <span class="label">宽高比：</span>
              <span class="value">{{ videoMetadata.aspectRatio }}</span>
            </div>
            <div class="metadata-item" v-if="videoMetadata.videoTrackCount">
              <span class="label">视频轨道数：</span>
              <span class="value">{{ videoMetadata.videoTrackCount }}</span>
            </div>
            <div class="metadata-item" v-if="videoMetadata.audioTrackCount">
              <span class="label">音频轨道数：</span>
              <span class="value">{{ videoMetadata.audioTrackCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button @click="exportMetadata" class="export-btn">
          📥 导出元数据
        </button>
        <button @click="analyzeAgain" class="analyze-again-btn">
          🔄 重新分析
        </button>
      </div>
    </div>

    <!-- 错误信息显示 -->
    <div v-if="error" class="error-section">
      <div class="error-content">
        <h4>❌ 分析失败</h4>
        <p>{{ error }}</p>
        <button @click="clearError" class="retry-btn">重试</button>
      </div>
    </div>
  </div>
</template>

<script>
import * as MP4Box from 'mp4box'

export default {
  name: 'VideoMetadataAnalyzer',
  data () {
    return {
      selectedFile: null,
      videoMetadata: null,
      analyzing: false,
      analyzingProgress: '准备分析...',
      error: null
    }
  },
  methods: {
    selectFile () {
      this.$refs.fileInput.click()
    },

    async handleFileSelect (event) {
      const file = event.target.files[0]
      if (!file) return

      this.selectedFile = file
      this.error = null
      this.videoMetadata = null

      try {
        await this.analyzeVideo(file)
      } catch (error) {
        this.error = error.message || '视频分析失败'
        console.error('视频分析失败:', error)
      } finally {
        this.analyzing = false
        // 清空文件输入，允许重复选择同一文件
        event.target.value = ''
      }
    },

    async analyzeVideo (file) {
      this.analyzing = true
      this.analyzingProgress = '读取文件中...'

      return new Promise((resolve, reject) => {
        const fileReader = new FileReader()

        fileReader.onload = async (e) => {
          try {
            this.analyzingProgress = '解析文件格式...'
            const arrayBuffer = e.target.result
            const uint8Array = new Uint8Array(arrayBuffer)

            // 检查文件格式
            const fileType = this.detectFileType(uint8Array)
            if (fileType !== 'mp4') {
              throw new Error('目前仅支持 MP4 格式的视频文件')
            }

            this.analyzingProgress = '解析元数据...'
            const metadata = await this.parseMP4Metadata(arrayBuffer)

            this.videoMetadata = {
              filename: file.name,
              fileSize: file.size,
              ...metadata
            }

            resolve(metadata)
          } catch (error) {
            reject(error)
          }
        }

        fileReader.onerror = () => {
          reject(new Error('文件读取失败'))
        }

        fileReader.readAsArrayBuffer(file)
      })
    },

    detectFileType (uint8Array) {
      // 检查文件魔数
      if (uint8Array.length < 8) return 'unknown'

      // MP4 文件签名
      if (uint8Array[4] === 0x66 && uint8Array[5] === 0x74 && uint8Array[6] === 0x79 && uint8Array[7] === 0x70) {
        return 'mp4'
      }

      return 'unknown'
    },

    async parseMP4Metadata (arrayBuffer) {
      return new Promise((resolve, reject) => {
        try {
          const mp4boxfile = MP4Box.createFile()

          mp4boxfile.onError = (error) => {
            reject(new Error('MP4Box解析错误: ' + error))
          }

          mp4boxfile.onReady = (info) => {
            try {
              const videoTrack = info.videoTracks[0]
              const audioTrack = info.audioTracks[0]

              console.log('info', info)
              console.log('videoTrack', videoTrack)
              console.log('audioTrack', audioTrack)
              const metadata = {
                duration: info.duration / info.timescale,
                width: videoTrack ? videoTrack.width : 0,
                height: videoTrack ? videoTrack.height : 0,
                fps: this.calculateFPS(videoTrack),
                videoCodec: videoTrack ? this.getCodecString(videoTrack.codec) : '无',
                audioCodec: audioTrack ? this.getCodecString(audioTrack.codec) : '无',
                bitrate: this.calculateBitrate(arrayBuffer.byteLength, info.duration / info.timescale),
                aspectRatio: videoTrack ? this.calculateAspectRatio(videoTrack.width, videoTrack.height) : null,
                videoTrackCount: info.videoTracks.length,
                audioTrackCount: info.audioTracks.length
              }

              resolve(metadata)
            } catch (error) {
              reject(new Error('元数据提取失败: ' + error))
            }
          }

          // 设置文件数据
          const arrayBufferForMP4 = arrayBuffer.slice(0)
          arrayBufferForMP4.fileStart = 0
          mp4boxfile.appendBuffer(arrayBufferForMP4)
          mp4boxfile.flush()
        } catch (error) {
          reject(new Error('MP4解析初始化失败: ' + error))
        }
      })
    },

    calculateFPS (videoTrack) {
      if (!videoTrack) return 0

      // 尝试从track中获取帧率信息
      if (videoTrack.video_timescale && videoTrack.duration) {
        return Math.round(videoTrack.video_timescale / videoTrack.duration)
      }

      // 默认常见帧率
      return 30
    },

    getCodecString (codec) {
      if (!codec) return '未知'

      // 解码常见的MP4 codec字符串
      const codecMap = {
        avc1: 'H.264/AVC',
        hvc1: 'H.265/HEVC',
        hev1: 'H.265/HEVC',
        vp09: 'VP9',
        av01: 'AV1',
        mp4a: 'AAC',
        'ac-3': 'AC3',
        'ec-3': 'E-AC3'
      }

      const codecPrefix = codec.substring(0, 4)
      return codecMap[codecPrefix] || codec
    },

    calculateBitrate (fileSize, duration) {
      if (duration <= 0) return 0
      return Math.round((fileSize * 8) / duration)
    },

    calculateAspectRatio (width, height) {
      if (!width || !height) return null

      const gcd = this.calculateGCD(width, height)
      return `${width / gcd}:${height / gcd}`
    },

    calculateGCD (a, b) {
      return b === 0 ? a : this.calculateGCD(b, a % b)
    },

    formatFileSize (bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    formatDuration (seconds) {
      if (!seconds || seconds <= 0) return '00:00'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)

      if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
    },

    formatBitrate (bitsPerSecond) {
      if (bitsPerSecond === 0) return '0 bps'
      const k = 1000
      const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps']
      const i = Math.floor(Math.log(bitsPerSecond) / Math.log(k))
      return parseFloat((bitsPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },

    getFileType (filename) {
      const extension = filename.split('.').pop().toLowerCase()
      const typeMap = {
        mp4: 'MP4视频',
        mov: 'QuickTime视频',
        avi: 'AVI视频',
        mkv: 'MKV视频',
        webm: 'WebM视频'
      }
      return typeMap[extension] || '未知格式'
    },

    clearResult () {
      this.videoMetadata = null
      this.selectedFile = null
    },

    clearError () {
      this.error = null
      this.selectedFile = null
    },

    analyzeAgain () {
      this.clearResult()
      this.selectFile()
    },

    exportMetadata () {
      if (!this.videoMetadata) return

      const metadataText = JSON.stringify(this.videoMetadata, null, 2)
      const blob = new Blob([metadataText], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${this.videoMetadata.filename}_metadata.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style scoped>
.video-metadata-analyzer {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
}

.analyzer-header {
  text-align: center;
  margin-bottom: 30px;
}

.analyzer-header h2 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 28px;
}

.analyzer-header .description {
  color: #666;
  font-size: 14px;
  margin: 0;
}

.file-selector-section {
  text-align: center;
  margin-bottom: 30px;
}

.file-input {
  display: none;
}

.select-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #ff6060, #fa3b3b);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 96, 96, 0.3);
}

.select-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 96, 96, 0.4);
}

.select-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.selected-file-info {
  margin-top: 15px;
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 6px;
  color: #0369a1;
}

.analyzing-section {
  text-align: center;
  padding: 40px;
  background: linear-gradient(135deg, #f8f9fa, #e9ecef);
  border-radius: 12px;
  margin-bottom: 30px;
}

.analyzing-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #ff6060;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.progress-info {
  color: #666;
  font-size: 14px;
  margin-top: 10px;
}

.metadata-display {
  background: white;
  border-radius: 12px;
  padding: 25px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.metadata-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.metadata-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 22px;
}

.clear-btn {
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.clear-btn:hover {
  background-color: #5a6268;
}

.metadata-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.metadata-section {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #ff6060;
}

.metadata-section h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #2c3e50;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.metadata-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.metadata-item:last-child {
  border-bottom: none;
}

.metadata-item .label {
  font-weight: 600;
  color: #495057;
  min-width: 80px;
}

.metadata-item .value {
  color: #212529;
  font-weight: 500;
  word-break: break-all;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

.export-btn, .analyze-again-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;
}

.export-btn {
  background-color: #28a745;
  color: white;
}

.export-btn:hover {
  background-color: #218838;
}

.analyze-again-btn {
  background-color: #17a2b8;
  color: white;
}

.analyze-again-btn:hover {
  background-color: #138496;
}

.error-section {
  background-color: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.error-content {
  text-align: center;
}

.error-content h4 {
  color: #c53030;
  margin-bottom: 10px;
}

.error-content p {
  color: #742a2a;
  margin-bottom: 15px;
}

.retry-btn {
  padding: 8px 16px;
  background-color: #e53e3e;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.retry-btn:hover {
  background-color: #c53030;
}

@media all and (max-width: 768px) {
  .video-metadata-analyzer {
    padding: 15px;
  }

  .metadata-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .metadata-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }

  .action-buttons {
    flex-direction: column;
  }

  .metadata-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .metadata-item .label {
    min-width: auto;
  }
}
</style>
