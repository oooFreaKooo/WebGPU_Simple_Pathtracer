import { defineConfig } from 'vite'
import path from 'path'
import vitePluginString from 'vite-plugin-string'

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
            '@models': path.resolve(__dirname, 'src/assets/models'),
            '@textures': path.resolve(__dirname, 'src/assets/textures'),
        },
        extensions: [ '.js', '.ts' ],
    },
})
