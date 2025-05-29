const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Handle import attributes for modern ES modules
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Configure Babel to handle import attributes properly
      webpackConfig.module.rules.forEach((rule) => {
        if (rule.oneOf) {
          rule.oneOf.forEach((oneOfRule) => {
            if (oneOfRule.use && oneOfRule.use.some(use => use.loader && use.loader.includes('babel-loader'))) {
              oneOfRule.use.forEach(use => {
                if (use.loader && use.loader.includes('babel-loader')) {
                  if (!use.options.plugins) {
                    use.options.plugins = [];
                  }
                  // Add babel plugin to handle import attributes
                  use.options.plugins.push([
                    '@babel/plugin-syntax-import-attributes',
                    { deprecatedAssertSyntax: true }
                  ]);
                  
                  // Configure generator options for import attributes
                  if (!use.options.generatorOpts) {
                    use.options.generatorOpts = {};
                  }
                  use.options.generatorOpts.importAttributesKeyword = 'with';
                }
              });
            }
          });
        }
      });

      // Fallback for Node.js modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
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
      };

      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      ['@babel/plugin-syntax-import-attributes', { deprecatedAssertSyntax: true }]
    ],
    generatorOpts: {
      importAttributesKeyword: 'with'
    }
  },
}; 