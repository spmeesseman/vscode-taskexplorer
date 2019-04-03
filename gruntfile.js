
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    aws: grunt.file.readJSON('config/grunt-aws.json'),
    datetime: Date.now(),
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        eqnull: true,
        browser: true,
        globals: {
          jQuery: true,
          $: true,
          console: true
        }
      },
      'myproject': {
        src: [ 'src/js/**/*.js' ]
      }
    },

    concat: {
      'myproject': {
        src: [ 'src/js/file1.js', 'src/js/file2.js' ],
        dest: 'build/fileoutput.js'
      }
    },

    uglify: {
      options: {
        banner: grunt.file.read('LICENCE'),
        mangle: {toplevel: false},  // Don't mangle as it seems to break on this
        squeeze: {dead_code: false},
        codegen: {quote_keys: true}
      },
      'myproject': {
        src: 'build/fileoutput.js',
        dest: 'build/fileoutput.min.js'
      }
    },

    jasmine: {
      'myproject': {
        src : 'build/**/*.min.js',
        options: {
          specs : 'spec/**/*.spec.js'
        }
      }
    },

    mincss: {
      'myproject': {
        files: {
          'build/cssoutput.min.css': [ 'src/css/file1.css', 'src/css/file2.css' ]
        }
      }
    },

    s3: {
      key: '<%= aws.key %>',
      secret: '<%= aws.secret %>',
      bucket: '<%= aws.bucket %>',
      access: 'public-read',
      upload: [{
        src: 'build/fileoutput.min.js',
        dest: 'website/javascript/fileoutput.<%= datetime %>.min.js',
        gzip: false
      },
      {
        src: 'build/cssoutput.min.css',
        dest: 'website/css/cssoutput.min.<%= datetime %>.min.css',
        gzip: false
      }]
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-mincss');
  grunt.loadNpmTasks('grunt-s3');

  // Default task.
  grunt.registerTask('default', ['jshint:myproject', 'concat:myproject', 'uglify:myproject', 'jasmine:myproject', 'mincss:myproject']);
  grunt.registerTask('upload', ['s3']);
};
