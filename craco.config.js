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

      // Optimize bundle splitting for better caching and smaller initial load
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                if (!module.context) return 'vendors';
                const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)?.[1];
                if (!packageName) return 'vendors';
                if (packageName.startsWith('@solana') || packageName === 'bs58') return 'vendor-solana';
                if (packageName.startsWith('@mysten')) return 'vendor-sui';
                if (packageName === 'framer-motion') return 'vendor-framer';
                if (packageName === 'recharts' || packageName === 'd3-shape' || packageName === 'd3-scale') return 'vendor-charts';
                if (packageName.startsWith('@mui')) return 'vendor-mui';
                if (packageName === 'ethers' || packageName.startsWith('@ethersproject')) return 'vendor-ethers';
                return 'vendors';
              },
              priority: 10,
              reuseExistingChunk: true,
            },
            common: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
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