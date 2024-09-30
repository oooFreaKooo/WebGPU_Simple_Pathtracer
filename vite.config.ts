import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: './', // Vite expects the root of the project to contain index.html
    build: {
        outDir: 'dist', // Vite places output in `dist` by default
        sourcemap: true, // Generates source maps
        rollupOptions: {
            input: {
                main: path.resolve(__dirname, 'index.html'), // Entry point for the HTML file
            },
            output: {
                entryFileNames: '[name].bundle.js',
                assetFileNames: '[name].[ext]',
                dir: path.resolve(__dirname, 'dist'),
            },
        },
    },
    server: {
        host: true, // Expose to the network
        port: 3000, // Use port 3000 for the dev server
    },
    resolve: {
        extensions: ['.js', '.ts'], // Resolve JS and TS files
    },
});
