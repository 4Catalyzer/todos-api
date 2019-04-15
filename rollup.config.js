import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

const plugins = [
  resolve({
    extensions: ['.js', '.ts', '.tsx'],
  }),
  commonjs(),
  babel({
    exclude: 'node_modules/**', // only transpile our source code
    extensions: ['.js', '.ts', '.tsx'],
  }),
];

export default [
  {
    input: 'src/index.ts',
    output: {
      file: 'lib/todos-api.js',
      format: 'esm',
    },
    plugins,
  },
  {
    input: 'src/service-worker.ts',
    output: {
      file: 'lib/service-worker.js',
      format: 'esm',
    },
    plugins,
  },

  {
    input: 'src/service-worker.ts',
    output: {
      file: 'sw-test/service-worker.js',
      format: 'esm',
    },
    plugins,
  },
];
