module.exports = {
  presets: [
    [
      '@4c/4catalyzer',
      {
        target: 'web',
        modules: false,
      },
    ],
    '@babel/preset-typescript',
  ],
};
