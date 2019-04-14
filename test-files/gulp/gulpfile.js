//构建目录
process.chdir(__dirname);

var pkg = require("./package.json");

var gulp = require("gulp");
var uglify = require("gulp-uglify");
var cssmin = require("gulp-minify-css");
var htmlmin= require("gulp-htmlmin");
var header = require("gulp-header");
var cheerio= require("gulp-cheerio");
var fs  = require("fs");
var del = require("del");
var path= require("path");
var plumber = require("gulp-plumber");
var util = require("gulp-util");
var gulpSequence = require("gulp-sequence");
var javascriptObfuscator = require('gulp-javascript-obfuscator');

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

/**
 * 递归创建多级目录
 * @param dirname 
 */
function mkdirsSync(dirname) {
    if (fs.existsSync(dirname)) {
        return true;
    } else {
        if (mkdirsSync(path.dirname(dirname))) {
            fs.mkdirSync(dirname);
            return true;
        }
    }
}

//获取参数
var  note = [
        "/** <%= pkg.name %>-v<%= pkg.version %> <%= pkg.license %> License By <%= pkg.homepage %> */\n <%= js %>",
        { pkg: pkg, js: ";" }
    ],
    destDir = "./dist", //构建的目标目录
    //任务
    task = {
        //压缩 HTML
        minHtml: function() {
            var src = ["./src/views/**/*.html"];
            
            return gulp
                .src(src)
                .pipe(plumber({errorHandler:errorHandler}))
                .pipe(
                    //提取 HTML 中的JS代码写入文件来加载
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
                        removeComments: true, //清除HTML注释
                        collapseWhitespace: true, //压缩HTML
                        minfyJS: true, //压缩JS
                        minfyCss: true //压缩CSS
                    }))
                .pipe(gulp.dest(destDir + "/views" ));
        },

        //压缩 CSS
        minCss: function() {
            var src = ["./src/**/*.css"],
                noteNew = JSON.parse(JSON.stringify(note));

            noteNew[1].js = "";

            return gulp
                .src(src)
                .pipe(plumber({errorHandler:errorHandler}))
                .pipe(cssmin({
                    advanced: false,        //类型：Boolean 默认：true [是否开启高级优化（合并选择器等）]
                    compatibility: 'ie7',   //保留ie7及以下兼容写法 类型：String 默认：''or'*' [启用兼容模式； 'ie7'：IE7兼容模式，'ie8'：IE8兼容模式，'*'：IE9+兼容模式]
                    keepBreaks: false,      //类型：Boolean 默认：false [是否保留换行]
                    keepSpecialComments: '*' //保留所有特殊前缀 当你用autoprefixer生成的浏览器前缀，如果不加这个参数，有可能将会删除你的部分前缀
                }))    
                //.pipe(header.apply(null, noteNew))
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
                    mangle: { except: ['require', 'exports', 'module', '$'] },//类型：Boolean 默认：true 是否修改变量名
                    compress: true,             //类型：Boolean 默认：true 是否完全压缩
                    preserveComments: 'false'   //保留所有注释
                }))
                //.pipe(header.apply(null, note))
                .pipe(gulp.dest(destDir));
        },

        //复制文件夹
        mv: function() {
            return gulp.src("./src/style/res/**/*").pipe(
                gulp.dest(destDir + "/style/res")
            );
        }
    };

//清理
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

//构建核心源文件
gulp.task(
    "default",
    [],
    gulpSequence("clear", "minHtml", "minJs", "minCss", "mv", function() {
        gulp.start("done");
    })
);