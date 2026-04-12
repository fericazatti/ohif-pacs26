const ExtractCssChunksPlugin = require('extract-css-chunks-webpack-plugin');
function extractStyleChunks(isProdBuild) {
  return [
    {
      test: /\.(sa|sc|c)ss$/,
      use: [
        {
          loader: ExtractCssChunksPlugin.loader,
          options: {
            hot: !isProdBuild,
          },
        },
        {
          loader: 'css-loader',
          options: {
            url: false,
          },
        },
        'postcss-loader',
      ],
    },
  ];
}
module.exports = extractStyleChunks;
