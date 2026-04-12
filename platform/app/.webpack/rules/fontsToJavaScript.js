const fontsToJavaScript = {
  test: /\.(ttf|eot|woff|woff2)$/i,
  type: 'asset/resource',
  generator: {
    filename: '[name][ext]',
  },
};
module.exports = fontsToJavaScript;
