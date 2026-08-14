import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import vitePluginString from 'vite-plugin-string'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    root: './', 
    build: {
        outDir: 'dist',
        sourcemap: true,
        assetsDir: 'assets',
    },
    plugins: [
        vitePluginString({
            include: [ '**/*.wgsl' ],   // Ensure WGSL files are included
            compress: false,
        }),
    ],
    server: {
        host: true,
        port: 3000,
    },
    resolve: {
        alias: {
            '@models': path.resolve(rootDir, 'src/assets/models'),
            '@textures': path.resolve(rootDir, 'src/assets/textures'),
        },
        extensions: [ '.js', '.ts' ],
    },
})
