module.exports = function(api) {
    const plugins = [
      '@babel/plugin-syntax-dynamic-import',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-proposal-export-default-from',
      '@babel/plugin-proposal-export-namespace-from',
      '@babel/plugin-proposal-object-rest-spread',
      '@babel/plugin-transform-runtime',
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator'
    ]
    const presets = [
      ['@babel/preset-env', { targets: { node: 10 } }],
      '@babel/preset-typescript',
    ]
  
    if (api.env('coverage')) {
      plugins.push('babel-plugin-istanbul')
    }
  
    return { plugins, presets }
  }
  