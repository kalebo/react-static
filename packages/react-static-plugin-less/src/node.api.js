import ExtractCssChunks from 'extract-css-chunks-webpack-plugin'
import autoprefixer from 'autoprefixer'
import postcssFlexbugsFixes from 'postcss-flexbugs-fixes'
import semver from 'semver'
import browserslist from 'browserslist'

function fetchBrowsersList() {
  const path = process.env.REACT_STATIC_ROOT_PATH_READ_ONLY
  return browserslist(undefined, { path, env: process.env.NODE_ENV || 'production' })
}

export default ({ includePaths = [], ...rest }) => ({
  webpack: (config, { stage }) => {
    let loaders = []
    const lessLoaderPath = require.resolve('less-loader')

    const lessLoader = {
      loader: lessLoaderPath,
      options: { includePaths: ['src/', ...includePaths], ...rest },
    }
    const cssLoader = {
      loader: 'css-loader',
      options: {
        importLoaders: 1,
        sourceMap: false,
      },
    }
    const postCssLoader = {
      loader: 'postcss-loader',
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebookincubator/create-react-app/issues/2677
        sourceMap: true,
        ident: 'postcss',
        plugins: () => [
          postcssFlexbugsFixes,
          // TODO: remove in 8.0.0, enforcing browserslist in the root via a config file
          autoprefixer({ overrideBrowserslist: fetchBrowsersList(), flexbox: 'no-2009' })
        ],
      },
    }

    if (stage === 'dev') {
      // Dev
      loaders = [
        {
          loader: ExtractCssChunks.loader,
          options: {
            hot: true,
          },
        },
        cssLoader,
        postCssLoader,
        lessLoader,
      ]
    } else if (stage === 'node') {
      // Node
      // Don't extract css to file during node build process
      loaders = [cssLoader, postCssLoader, lessLoader]
    } else {
      // Prod

      // for legacy css-loader version (<2.0) we need to add "minimize" to minify css code
      // for >2.0 it is handled with https://github.com/NMFR/optimize-css-assets-webpack-plugin
      const cssLoaderVersion = require('css-loader/package.json').version
      if (semver.satisfies(cssLoaderVersion, '<2') === true) {
        cssLoader.options.minimize = true
      }

      loaders = [ExtractCssChunks.loader, cssLoader, postCssLoader, lessLoader]
    }

    config.module.rules[0].oneOf.unshift({
      test: /\.less$/,
      use: loaders,
    })

    return config
  },
})
