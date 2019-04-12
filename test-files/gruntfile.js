
module.exports = function(grunt) {

  // Default task.
  grunt.registerTask('default', ['jshint:myproject', 'concat:myproject', 'uglify:myproject', 'jasmine:myproject', 'mincss:myproject']);
  grunt.registerTask('upload', ['s3']);
};
