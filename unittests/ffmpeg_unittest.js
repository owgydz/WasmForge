/*
FFMpeg_unittest.js
Local FFmpeg validation.
*/

class FFMpegUnitTest {
    constructor() {
        this.basePath = '/third_party/ffmpeg'
        this.ffmpeg = null
    }

    log(msg) {
        console.log('[FFMPEG TEST]', msg)
    }

    async loadScript() {
        if (window.FFmpegWASM || window.FFmpeg) {
            this.log('FFmpeg script already loaded.')
            return
        }

        this.log('Loading local ffmpeg.js...')

        await new Promise((resolve, reject) => {
            const s = document.createElement('script')
            s.src = `${this.basePath}/ffmpeg.js`
            s.onload = resolve
            s.onerror = reject
            document.head.appendChild(s)
        })

        this.log('ffmpeg.js loaded.')
    }

    async loadCore() {
        const { FFmpeg } = window.FFmpegWASM || window
        if (!FFmpeg) throw new Error('FFmpeg global missing')

        this.ffmpeg = new FFmpeg()

        this.ffmpeg.on('log', ({ message }) => {
            console.log('[FFMPEG LOG]', message)
        })

        this.log('Loading local core...')

        await this.ffmpeg.load({
            coreURL: `${this.basePath}/ffmpeg-core.js`,
            wasmURL: `${this.basePath}/ffmpeg-core.wasm`
        })

        this.log('Core loaded.')
    }

    async testWriteRead() {
        this.log('Testing write/read...')

        await this.ffmpeg.writeFile(
            'test.txt',
            new TextEncoder().encode('hello')
        )

        const data = await this.ffmpeg.readFile('test.txt')
        const text = new TextDecoder().decode(data)

        if (text !== 'hello')
            throw new Error('Write/read failed')

        await this.ffmpeg.deleteFile('test.txt')

        this.log('Write/read OK.')
    }

    async testEncodePNGtoMP4() {
        this.log('Testing tiny encode...')

        // Create valid 2x2 PNG dynamically
        const canvas = document.createElement('canvas')
        canvas.width = 2
        canvas.height = 2

        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ff0000'
        ctx.fillRect(0, 0, 2, 2)

        const blob = await new Promise(resolve =>
            canvas.toBlob(resolve, 'image/png')
        )

        if (!blob)
            throw new Error('Failed to create PNG blob')

        const buf = new Uint8Array(await blob.arrayBuffer())

        await this.ffmpeg.writeFile('f000000.png', buf)

        await this.ffmpeg.exec([
            '-framerate', '1',
            '-i', 'f%06d.png',
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-y',
            'out.mp4'
        ])

        const result = await this.ffmpeg.readFile('out.mp4')

        if (!result || result.length === 0)
            throw new Error('Encoding failed')

        this.log('Encode OK. Size: ' + result.length + ' bytes')

        // Cleanup safely
        try { await this.ffmpeg.deleteFile('f000000.png') } catch {}
        try { await this.ffmpeg.deleteFile('out.mp4') } catch {}
    }

    async run() {
        console.clear()
        this.log('Starting local FFmpeg unit test...')

        if (location.protocol === 'file:')
            throw new Error('Cannot run under file:// — use http server')

        await this.loadScript()
        await this.loadCore()
        await this.testWriteRead()
        await this.testEncodePNGtoMP4()

        this.log('ALL TESTS PASSED.')
        alert('FFmpeg unit test PASSED.')
    }
}