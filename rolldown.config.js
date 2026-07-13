import { defineConfig } from 'rolldown';

export default defineConfig({
    input: 'src/server.js',
    platform: "node",
    output: {
        dir: 'dist',
        format: 'esm',
        //inlineDynamicImports: true
    },
});