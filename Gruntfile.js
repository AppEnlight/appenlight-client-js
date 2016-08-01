module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    bumpup: {
      files: ['bower.json', 'package.json']
    },
    concat: {
      options: {
        separator: '\n',
        // Interpolate grunt template tags (e.g. <%= pkg.version %>)
        process: true
      },
      dist: {
        src: [
          'src/appenlight-client.js',
          'src/tracekit.js',
        ],
        dest: 'appenlight-client.js'
      }
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc',
      },
      appenlight: {
        src: ['src/appenlight-client.js']
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          '<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    watch: {
      files: ['<%= concat.dist.src %>'],
      tasks: ['jshint', 'concat']
    }
  });

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-bumpup');

  grunt.registerTask('test', ['jshint']);

  grunt.registerTask('default', ['jshint', 'concat', 'uglify']);

};
