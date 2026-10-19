// babel-preset-expo adds the react-native-worklets plugin automatically when the
// package is installed, so Reanimated needs no explicit plugin entry here.
module.exports = function (api) {
  api.cache(true);
  return {presets: ['babel-preset-expo']};
};
