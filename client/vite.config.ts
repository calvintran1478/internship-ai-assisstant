import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    cors: true
  },
  base: "/internship-ai-assisstant",
  plugins: [solid(), tailwindcss()],
})
