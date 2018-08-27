# code-metrics-loader

A webpack loader, computes complexity in JavaScript files.

### Install

npm i -D code-metrics-loader

### Usage

at webpack.config.js:
```js
{
  module: {
    rules: [{
      enforce: 'pre',
      test: /\.js$/,
      exclude: /node_modules/,
      use: [{
        loader: 'code-metrics-loader',
        options:{
          errorLimit: 20
        }
      }],
    }]
  }
}

```