self.onmessage = async e => {

    if (e.data.type !== 'start') return

    const { frames, width, height, fps, bitrate } = e.data

    const chunks = []

    const encoder = new VideoEncoder({
        output: chunk => chunks.push(chunk),
        error: err => self.postMessage({ type: 'error', error: err })
    })

    encoder.configure({
        codec: 'avc1.640028',
        width,
        height,
        bitrate,
        framerate: fps
    })

    const start = performance.now()

    for (let i = 0; i < frames.length; i++) {

        const frame = new VideoFrame(
            new ImageData(frames[i], width, height),
            { timestamp: (i / fps) * 1e6 }
        )

        encoder.encode(frame)
        frame.close()

        self.postMessage({
            type: 'progress',
            current: i + 1,
            start
        })
    }

    await encoder.flush()
    encoder.close()

    const buffers = chunks.map(c => {
        const arr = new Uint8Array(c.byteLength)
        c.copyTo(arr)
        return arr
    })

    self.postMessage({
        type: 'done',
        buffer: new Blob(buffers, { type: 'video/mp4' })
    })
}