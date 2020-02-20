
process.chdir(__dirname);

var pkg = require("../../package.json");

var gulp = require("gulp");
// var uglify = require("gulp-uglify");
// var cssmin = require("gulp-minify-css");
// var htmlmin= require("gulp-htmlmin");
// var header = require("gulp-header");
// var cheerio= require("gulp-cheerio");
// var fs  = require("fs");
// var del = require("del");
// var path= require("path");
// var plumber = require("gulp-plumber");
// var util = require("gulp-util");
// var gulpSequence = require("gulp-sequence");
// var javascriptObfuscator = require('gulp-javascript-obfuscator');

function errorHandler(e) {
    util.beep();
    util.log(e);
    this.emit("end");
}

function randomString(len) {
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    let text = "";
    for (let i = 0; i < len; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}


function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    }
    if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname);
        return true;
    }
}


var  note = [
        "/** <%= pkg.name %>-v<%= pkg.version %> <%= pkg.license %> License By <%= pkg.homepage %> */\n <%= js %>",
        { pkg: pkg, js: ";" }
    ],
    destDir = "./dist",
    task = {
        minHtml: function() {
            var src = ["./src/views/**/*.html"];
            
            return gulp
                .src(src)
                .pipe(plumber({errorHandler:errorHandler}))
                .pipe(
                    cheerio(function($) {
                        var filePath =  "./temp/js/";
                        var fileName = randomString(8) + '.js';
                        $("script").each(function(i, ele) {
                            if ($(ele).attr("src")) {
                                return;
                            }
                            if ($(ele).attr("type") != "text/html") {
                                var code = $(ele).html();
                                mkdirsSync(filePath);
                                fs.appendFileSync(filePath + fileName, code);
                                $(ele).remove();
                            }
                        });
                        if (fs.existsSync(filePath + fileName)) {
                            $.root().append(`<script type="text/html" template><script type="text/javascript" src="{{ layui.setter.base }}js/${fileName}"></script></script>`);
                        }
                    })
                )
                .pipe(htmlmin({
                        removeComments: true,
                        collapseWhitespace: true,
                        minfyJS: true,
                        minfyCss: true
                    }))
                .pipe(gulp.dest(destDir + "/views" ));
        },

        minCss: function() {
            var src = ["./src/**/*.css"],
                noteNew = JSON.parse(JSON.stringify(note));

            noteNew[1].js = "";

            return gulp
                .src(src)
                .pipe(plumber({errorHandler:errorHandler}))
                .pipe(cssmin({
                    advanced: false,
                    compatibility: 'ie7',
                    keepBreaks: false,
                    keepSpecialComments: '*'
                }))
                .pipe(gulp.dest(destDir));
        },

        //压缩 JS
        minJs: function() {
            var src = [
                "./src/**/*.js",
                "./temp/**/*.js",
            ];

            return gulp
                .src(src)
                .pipe(plumber({errorHandler:errorHandler}))
                .pipe(javascriptObfuscator({
                    compact:true,
                    sourceMap: false,
                    debugProtection: true,
                    renameGlobals: true,
                    stringArrayEncoding: "rc4",
                }))
                .pipe(uglify({
                    mangle: { except: ['require', 'exports', 'module', '$'] },
                    compress: true,
                    preserveComments: 'false'
                }))
                .pipe(gulp.dest(destDir));
        },

        mv: function() {
            return gulp.src("./src/style/res/**/*").pipe(
                gulp.dest(destDir + "/style/res")
            );
        }
    };

gulp.task("clear", function(cb) {
    return del(["./dist/*", "./temp/*"], cb);
});

gulp.task("done", function(cb) {
    return del(["./temp/*"], cb);
});

gulp.task("minHtml", task.minHtml);
gulp.task("minJs", task.minJs);
gulp.task("minCss", task.minCss);
gulp.task("mv", task.mv);

gulp.task(
    "default",
    //[],
    (done) => {
        console.log('why is this task always ran?');
        done();
    }
);

gulp.task('test', (done) => {
    console.log('test gulp subdir task!');
    done();
});
