const { override, addWebpackModuleRule, addWebpackResolve } = require('customize-cra');

module.exports = override(
  // Handle import attributes by treating them as regular imports
  addWebpackModuleRule({
    test: /\.m?js$/,
    resolve: {
      fullySpecified: false,
    },
  }),
  
  // Add fallbacks for Node.js modules
  addWebpackResolve({
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "util": require.resolve("util"),
      "url": require.resolve("url"),
      "assert": require.resolve("assert"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "fs": false,
      "net": false,
      "tls": false,
    },
  }),
  
  // Custom webpack configuration to handle import attributes
  (config) => {
    // Add a custom loader to transform import attributes
    config.module.rules.unshift({
      test: /\.m?js$/,
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            // Transform import attributes to regular imports
            function() {
              return {
                visitor: {
                  ImportDeclaration(path) {
                    // Remove import attributes (with type: 'json')
                    if (path.node.attributes && path.node.attributes.length > 0) {
                      path.node.attributes = [];
                    }
                  }
                }
              };
            }
          ]
        }
      },
      include: /node_modules\/@lifi/,
    });
    
    return config;
  }
); 