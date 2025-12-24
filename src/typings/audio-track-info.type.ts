/**
 * @Author: longmo
 * @Date: 2025-12-24 23:58:27
 * @LastEditTime: 2025-12-24 23:58:46
 * @FilePath: src/typings/audio-track-info.type.ts
 * @Description:
 */
export type AudioTrackInfo = Readonly<{
    id: number,
    codec: string,
    channelCount: number,
    sampleRate: number,
}>;
