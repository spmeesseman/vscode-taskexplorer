const { series } = require('gulp');

// The `clean` function is not exported so it can be considered a private task.
// It can still be used within the `series()` composition.
function clean3(cb) {
  console.log('clean3!!!');
  cb();
}

// The `build` function is exported so it is public and can be run with the `gulp` command.
// It can also be used within the `series()` composition.
function build3(cb) {
  console.log('build3!!!');
  cb();
}

exports.build33 = build3;
exports.default33 = series(clean3, build3);
