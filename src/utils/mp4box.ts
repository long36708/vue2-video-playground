/**
 * @Author: longmo
 * @Date: 2025-12-24 23:57:08
 * @LastEditTime: 2025-12-25 00:01:48
 * @FilePath: src/utils/mp4box.ts
 * @Description:
 */
import * as MP4Box from 'mp4box';
import { Mp4FileInfo } from '../typings';
import { chunkBlobFromBothEnds } from './misc';

export async function getMp4Info(
    blob: Blob,
    mp4boxFile = MP4Box.createFile(false),
) {
    let mp4InfoReady = false;
    const mp4Info = new Promise<any>((resolve) => {
        mp4boxFile.onReady = (mp4Info) => {
            mp4InfoReady = true;
            resolve(mp4Info);
        };
    });

    const chunkSize = 2**20;
    const chunks = chunkBlobFromBothEnds(blob, chunkSize);
    let chunk = chunks.next();
    while (!mp4InfoReady && !chunk.done) {
        const mp4ArrayBuffer = toMp4ArrayBuffer(
            await chunk.value.blob.arrayBuffer(),
            chunk.value.startIndex,
        );
        mp4boxFile.appendBuffer(mp4ArrayBuffer);
        chunk = chunks.next();
    }

    return mp4Info;
}

export async function getMp4FileInfo(
    blob: Blob,
    mp4boxFile = MP4Box.createFile(false),
): Promise<Mp4FileInfo> {
    const mp4Info = await getMp4Info(blob, mp4boxFile);
    return {
        maxPlaybackPosition: mp4Info.duration / mp4Info.timescale,
        audioTrackInfos: mp4Info.audioTracks.map((track) => ({
            id: track.id,
            codec: track.codec,
            channelCount: track.audio.channel_count,
            sampleRate: track.audio.sample_rate,
        })),
    };
}

export function toMp4ArrayBuffer(
    arrayBuffer: ArrayBuffer,
    fileStart: number,
) {
    (arrayBuffer as MP4Box.MP4ArrayBuffer).fileStart = fileStart;
    return arrayBuffer as MP4Box.MP4ArrayBuffer;
}
