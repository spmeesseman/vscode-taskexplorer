import pkg from 'gulp';
const { task, series } = pkg;

// The `clean` function is not exported so it can be considered a private task.
// It can still be used within the `series()` composition.
function clean2(cb) {
  console.log('clean2!!!');
  cb();
}

// The `build` function is exported so it is public and can be run with the `gulp` command.
// It can also be used within the `series()` composition.
function build2(cb) {
  console.log('build2!!!');
  cb();
}

const _build2 = build2;
export { _build2 as build2 };
export const default2 = series(clean2, build2);
