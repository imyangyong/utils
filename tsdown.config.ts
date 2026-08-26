import { defineConfig } from 'tsdown'

export default defineConfig({
  target: 'es2020',
  entry: 'src/index.ts',
  dts: true,
  clean: true,
  deps: {
    alwaysBundle: [/.*/],
  },
})
