import imyangyong from '@imyangyong/eslint-config'
import sortKeysPlugin from 'eslint-plugin-sort-keys'

export default imyangyong(
  {
    vue: true,
    typescript: true,
    ignores: [
      'dist',
      'public',
      'playground',
      'node_modules',
      '**/*.d.ts',
      'src/assets/iconfont',
      'packages/engine/src/assets/iconfont',
      'packages/renderer/sdk',
      'packages/copilot/examples',
    ],
  },
  {
    rules: {
      'vue/custom-event-name-casing': ['error', 'kebab-case'],
      'ts/ban-ts-comment': 'off',
      'ts/prefer-ts-expect-error': 'off',
      'eslint-filename/filename-naming-convention': [
        'error',
        {
          '!**/*.(vue|jsx|tsx)': ['KEBAB_CASE', 'CAMEL_CASE', 'SCREAMING_SNAKE_CASE'],
          '**/!(*.test).(vue|jsx|tsx)': 'PASCAL_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
      'eslint-filename/folder-naming-convention': [
        'error',
        {
          '**/!(__test__)': ['KEBAB_CASE', 'CAMEL_CASE', 'SCREAMING_SNAKE_CASE'],
        },
      ],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: {
      'sort-keys': sortKeysPlugin,
    },
    rules: {
      'sort-keys/sort-keys-fix': 'error',
    },
  },
)
