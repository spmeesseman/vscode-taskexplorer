var gulp = require('gulp');

gulp.task('hello', (done) => {
    console.log('Hello Code!');
    done();
});

function test(cb)
{
    console.log('Test!');
    cb();
}

exports['build:test'] = test;

