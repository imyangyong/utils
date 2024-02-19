import imyangyong from '@imyangyong/eslint-config'

export default imyangyong({
  typescript: {
    overrides: {
      'ts/ban-ts-comment': 'off',
      'ts/prefer-ts-expect-error': 'off',
    },
  },
})
