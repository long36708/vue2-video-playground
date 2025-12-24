# MP4Box 工具类设计文档

## 概述

`mp4box.ts` 是一个专门用于解析 MP4 文件信息的工具类，基于 MP4Box.js 库构建。

该模块提供了高效的 MP4 文件元数据提取功能，特别针对大文件和流式处理进行了优化。

## 核心功能

### 主要特性

- **高效解析**：使用分块读取策略，快速定位 MP4 文件的关键信息
- **双向读取**：从文件两端交替读取，优先查找 `moov` atom
- **类型安全**：完整的 TypeScript 类型定义
- **内存优化**：按需加载，避免一次性读取整个文件
- **音频轨道支持**：专门提取音频轨道信息

### 工作原理

```
MP4 Blob → 分块读取 → MP4Box 解析 → 结构化信息输出
    ↓
从两端交替读取 1MB 块，快速定位 moov atom
```

## 架构设计

### 核心组件

#### 1. `getMp4Info` 函数
```typescript
async function getMp4Info(
    blob: Blob,
    mp4boxFile = MP4Box.createFile(false),
): Promise<any>
```
**职责**：获取 MP4 文件的原始信息，包括所有轨道的详细数据。

**参数**：
- `blob`: MP4 文件的 Blob 对象
- `mp4boxFile`: 可选的 MP4Box 文件实例，默认创建新实例

**返回**：Promise，解析为 MP4Box 原始信息对象

#### 2. `getMp4FileInfo` 函数
```typescript
export async function getMp4FileInfo(
    blob: Blob,
    mp4boxFile = MP4Box.createFile(false),
): Promise<Mp4FileInfo>
```
**职责**：获取结构化的 MP4 文件信息，提取常用的元数据。

**返回值**：
```typescript
interface Mp4FileInfo {
    maxPlaybackPosition: number;     // 最大播放位置（秒）
    audioTrackInfos: AudioTrackInfo[]; // 音频轨道信息数组
}
```

#### 3. `toMp4ArrayBuffer` 函数
```typescript
export function toMp4ArrayBuffer(
    arrayBuffer: ArrayBuffer,
    fileStart: number,
): MP4Box.MP4ArrayBuffer
```
**职责**：将标准 ArrayBuffer 转换为 MP4Box 兼容的 MP4ArrayBuffer。

## 数据结构

### Mp4FileInfo 类型

```typescript
interface Mp4FileInfo {
    // 最大播放位置（以秒为单位）
    maxPlaybackPosition: number;
    
    // 音频轨道信息数组
    audioTrackInfos: readonly AudioTrackInfo[];
}
```

### AudioTrackInfo 类型

```typescript
interface AudioTrackInfo {
    id: number;           // 轨道 ID
    codec: string;        // 编码格式（如 "mp4a.40.2"）
    channelCount: number;  // 声道数
    sampleRate: number;    // 采样率（Hz）
}
```

## 算法设计

### 分块读取算法

#### 1. 双向读取策略
```typescript
function* chunkBlobFromBothEnds(blob: Blob, chunkSize = 2**20)
```

**设计原理**：
- MP4 文件的 `moov` atom（包含元数据）通常位于文件开头或结尾
- 从两端交替读取可以更快地找到关键信息
- 避免读取整个文件，提高性能

**读取顺序**：
```
Chunk 0: [start, start+chunkSize]           // 从开头读取
Chunk 1: [end-chunkSize, end]             // 从结尾读取  
Chunk 2: [start+chunkSize, start+2*chunkSize] // 从开头继续
Chunk 3: [end-2*chunkSize, end-chunkSize]    // 从结尾继续
...
```

#### 2. 优化参数

- **默认块大小**: 1MB (2^20 bytes)
  - 平衡内存使用和 I/O 效率
  - 适合大多数网络和本地存储场景
- **读取策略**: 贪心算法
  - 交替读取直到找到 `moov` atom 或读取完整个文件
  - 早期终止机制，避免不必要的读取

### MP4Box 集成

#### 1. 文件实例管理
```typescript
const mp4boxFile = MP4Box.createFile(false);
```

- `false` 参数：不使用 ISO 文件抽象层，直接处理原始数据
- 每次调用创建新实例，避免状态污染

#### 2. 事件驱动解析
```typescript
mp4boxFile.onReady = (mp4Info) => {
    mp4InfoReady = true;
    resolve(mp4Info);
};
```

- 异步事件处理
- Promise 包装，提供现代 API 接口

## 使用示例

### 基本用法

```typescript
import { getMp4FileInfo } from './utils/mp4box';

async function analyzeVideo(file: File) {
    try {
        const info = await getMp4FileInfo(file);
        
        console.log('播放时长:', info.maxPlaybackPosition, '秒');
        console.log('音频轨道数:', info.audioTrackInfos.length);
        
        info.audioTrackInfos.forEach((track, index) => {
            console.log(`轨道 ${index + 1}:`);
            console.log(`  ID: ${track.id}`);
            console.log(`  编码: ${track.codec}`);
            console.log(`  声道数: ${track.channelCount}`);
            console.log(`  采样率: ${track.sampleRate} Hz`);
        });
    } catch (error) {
        console.error('解析失败:', error);
    }
}
```

### 高级用法

```typescript
import { getMp4Info, toMp4ArrayBuffer } from './utils/mp4box';

async function detailedAnalysis(file: File) {
    // 获取完整信息
    const rawInfo = await getMp4Info(file);
    
    // 访问原始数据
    console.log('原始信息:', rawInfo);
    
    // 手动转换 ArrayBuffer
    const arrayBuffer = await file.slice(0, 1024).arrayBuffer();
    const mp4Buffer = toMp4ArrayBuffer(arrayBuffer, 0);
    console.log('MP4 缓冲区:', mp4Buffer);
}
```

## 性能特性

### 时间复杂度

- **最佳情况**: O(1) - 当 moov atom 在文件开头时
- **最坏情况**: O(n) - 需要读取整个文件
- **平均情况**: O(n/2) - 大多数情况下只需读取一半文件

### 空间复杂度

- **内存使用**: O(1) - 每次只保存一个块在内存中
- **临时存储**: O(chunkSize) - 通常为 1MB

### 性能优化

1. **早期终止**: 找到 `moov` atom 后立即停止读取
2. **块大小优化**: 1MB 平衡了 I/O 效率和内存使用
3. **异步处理**: 使用 Promise 和 async/await，避免阻塞主线程

## 错误处理

### 常见错误类型

1. **文件格式错误**
   ```typescript
   // 不是有效的 MP4 文件
   throw new Error('Invalid MP4 format');
   ```

2. **文件损坏**
   ```typescript
   // moov atom 损坏或缺失
   throw new Error('Corrupted MP4 file: missing moov atom');
   ```

3. **网络错误**
   ```typescript
   // Blob 读取失败
   throw new Error('Failed to read blob: network error');
   ```

### 错误处理策略

```typescript
async function safeGetMp4Info(file: File) {
    try {
        return await getMp4FileInfo(file);
    } catch (error) {
        if (error.message.includes('Invalid MP4')) {
            console.warn('文件格式不支持');
        } else if (error.message.includes('network')) {
            console.warn('网络连接问题');
        }
        throw error; // 重新抛出，由上层处理
    }
}
```

## 依赖关系

### 外部依赖

- **MP4Box.js**: 核心解析引擎
  ```typescript
  import * as MP4Box from 'mp4box';
  ```

### 内部依赖

- **`chunkBlobFromBothEnds`**: 分块读取工具
  ```typescript
  import { chunkBlobFromBothEnds } from './misc';
  ```

- **类型定义**: TypeScript 接口
  ```typescript
  import { Mp4FileInfo } from '../typings';
  ```

## 扩展建议

### 短期改进

1. **视频轨道支持**
   ```typescript
   interface Mp4FileInfo {
       // ... 现有字段
       videoTrackInfos: VideoTrackInfo[];
   }
   ```

2. **更多元数据**
   ```typescript
   interface Mp4FileInfo {
       // ... 现有字段
       fileSize: number;
       bitrate: number;
       creationTime: Date;
   }
   ```

### 长期扩展

1. **流式处理**
   ```typescript
   async function streamMp4Info(
       stream: ReadableStream,
       options?: ParsingOptions
   ): Promise<Mp4FileInfo>
   ```

2. **并发处理**
   ```typescript
   async function getMultipleMp4Info(
       blobs: Blob[]
   ): Promise<Mp4FileInfo[]>
   ```

3. **缓存机制**
   ```typescript
   class Mp4InfoCache {
       get(key: string): Mp4FileInfo | undefined;
       set(key: string, info: Mp4FileInfo): void;
   }
   ```

## 最佳实践

### 1. 文件大小管理
```typescript
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
if (file.size > MAX_FILE_SIZE) {
    console.warn('文件过大，解析可能需要较长时间');
}
```

### 2. 内存管理
```typescript
// 及时清理 MP4Box 实例
const mp4boxFile = MP4Box.createFile(false);
try {
    const info = await getMp4Info(file, mp4boxFile);
    return info;
} finally {
    // 清理资源（如果 MP4Box 提供）
}
```

### 3. 错误恢复
```typescript
async function robustGetMp4Info(file: File): Promise<Mp4FileInfo | null> {
    try {
        return await getMp4FileInfo(file);
    } catch (error) {
        console.error('解析失败，尝试降级方案');
        return null; // 或返回默认值
    }
}
```

## 测试策略

### 单元测试

```typescript
describe('mp4box utils', () => {
    it('should extract audio info correctly', async () => {
        const mockBlob = createMockMp4Blob();
        const info = await getMp4FileInfo(mockBlob);
        expect(info.audioTrackInfos).toHaveLength(1);
    });
    
    it('should handle corrupted files', async () => {
        const corruptedBlob = createCorruptedMp4Blob();
        await expect(getMp4FileInfo(corruptedBlob))
            .rejects.toThrow('Invalid MP4');
    });
});
```

### 集成测试

```typescript
describe('integration tests', () => {
    it('should work with real MP4 files', async () => {
        const realFile = new File(['...'], 'test.mp4');
        const info = await getMp4FileInfo(realFile);
        expect(info.maxPlaybackPosition).toBeGreaterThan(0);
    });
});
```

---

**注意**：此工具类专门针对 MP4 文件解析优化，不适用于其他容器格式。使用时请确保文件格式正确。
