import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#FFB49A' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#FFB49A' } },
  },
  images: ['public/logo.svg'],
})
