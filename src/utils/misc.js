/**
 * @Author: longmo
 * @Date: 2025-12-24 23:55:52
 * @LastEditTime: 2025-12-24 23:56:17
 * @FilePath: src/utils/misc.js
 * @Description:
 */
/**
 * Extracts chunks from the given blob outside-in, i.e. alternating
 * from the front and back of the blob toward the middle.
 *
 * Use to find the MP4 moov atom, which is located only at either end
 * of an MP4 file.
 */
export function* chunkBlobFromBothEnds(blob: Blob, chunkSize = 2**20) {
    const maxNumChunks = Math.ceil(blob.size / chunkSize);
    const paddedBlobSize = (blob.size % chunkSize > 0)
        ? maxNumChunks * chunkSize
        : blob.size;

    let numChunkedFront = 0;
    let numChunkedBack = 0;
    while (numChunkedFront + numChunkedBack < maxNumChunks) {
        let chunkStart: number
        let chunkEnd: number;
        if (numChunkedFront <= numChunkedBack) {
            // chunk from front
            chunkStart = numChunkedFront * chunkSize;
            chunkEnd = chunkStart + chunkSize;
            numChunkedFront += 1;
        } else {
            // chunk from back
            chunkEnd = paddedBlobSize - numChunkedBack * chunkSize;
            chunkStart = chunkEnd - chunkSize;
            numChunkedBack += 1;
        }
        yield {
            blob: blob.slice(chunkStart, chunkEnd),
            startIndex: chunkStart,
            endIndex: chunkEnd,
        };
    }
}
