const { series } = require('gulp');

// The `clean` function is not exported so it can be considered a private task.
// It can still be used within the `series()` composition.
function clean2(cb) {
  console.log('clean2!!!');
  cb();
}

// The `build` function is exported so it is public and can be run with the `gulp` command.
// It can also be used within the `series()` composition.
function build(cb) {
  console.log('build2!!!');
  cb();
}

exports.build2 = build;
exports.default2 = series(clean, build);
