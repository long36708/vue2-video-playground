/**
 * @Author: longmo
 * @Date: 2025-12-24 23:58:06
 * @LastEditTime: 2025-12-24 23:58:15
 * @FilePath: src/typings/mp4-file-info.type.ts
 * @Description:
 */
import { AudioTrackInfo } from './audio-track-info.type';

export type Mp4FileInfo = Readonly<{
    // duration: number,
    // timescale: number,
    maxPlaybackPosition: number,
    audioTrackInfos: readonly AudioTrackInfo[],
}>;
