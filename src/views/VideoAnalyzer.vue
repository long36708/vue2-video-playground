<template>
  <div class="video-analyzer-page">
    <div class="page-header">
      <h1>视频元信息分析</h1>
      <p class="page-description">
        上传本地视频文件，自动解析并显示详细的元数据信息，包括编码格式、分辨率、帧率等技术参数。
      </p>
    </div>

    <div class="content-container">
      <VideoMetadataAnalyzer />
    </div>

    <div class="page-footer">
      <div class="tips">
        <h3>💡 使用提示</h3>
        <ul>
          <li>支持常见视频格式：MP4、AVI、MOV、MKV等</li>
          <li>文件大小限制：建议不超过500MB</li>
          <li>分析过程在本地进行，不会上传到服务器</li>
          <li>可以导出分析结果为JSON格式</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import VideoMetadataAnalyzer from '../components/VideoMetadataAnalyzer.vue'

export default {
  name: 'VideoAnalyzer',
  components: {
    VideoMetadataAnalyzer
  }
}
</script>

<style scoped>
.video-analyzer-page {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
  color: white;
}

.page-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.page-description {
  font-size: 1.1rem;
  max-width: 600px;
  margin: 0 auto;
  opacity: 0.9;
  line-height: 1.6;
}

.content-container {
  max-width: 1200px;
  margin: 0 auto 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  overflow: hidden;
}

.page-footer {
  max-width: 1200px;
  margin: 0 auto;
}

.tips {
  background: rgba(255,255,255,0.95);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.tips h3 {
  margin-bottom: 15px;
  color: #333;
  font-size: 1.2rem;
}

.tips ul {
  list-style: none;
  padding: 0;
}

.tips li {
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
  color: #666;
  line-height: 1.5;
}

.tips li::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #667eea;
  font-weight: bold;
}

@media (max-width: 768px) {
  .video-analyzer-page {
    padding: 15px;
  }
  
  .page-header h1 {
    font-size: 2rem;
  }
  
  .page-description {
    font-size: 1rem;
  }
  
  .content-container {
    margin: 0 auto 20px;
  }
}
</style>