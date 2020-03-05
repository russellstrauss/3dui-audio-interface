var gulp = require('gulp');
var watch = require('gulp-watch');
var sourcemaps = require('gulp-sourcemaps');
var browserify = require('browserify');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream'); // required to dest() for browserify
var browserSync = require('browser-sync').create();
var babel = require('gulp-babel');
var notifier = require('node-notifier');


gulp.task('sync', function() {
	browserSync.init({
		open: true,
		server: {
			baseDir: "./",
		}
	});
});

gulp.task('javascript', function() {
		
	var bundleStream = browserify('./src/js/main.js')
		.transform("babelify", {presets: ["@babel/preset-env"]})
		.bundle()
		.on('error', function(err) {
			console.log(err.stack);
			notifier.notify({
				'title': 'Browserify Compilation Error',
				'message': err.message
			});
			this.emit('end');
		});

	return bundleStream
		.pipe(source('main.js'))
		.pipe(rename('main.bundle.js'))
		.pipe(gulp.dest('./src/js/'))
		.pipe(browserSync.stream());
});

gulp.task('watch', function() {

	watch(['./src/js/**/*.js', '!./src/js/main.bundle.js'], function() {
		gulp.start('javascript');
	});
});

// Default Task
gulp.task('default', ['javascript', 'watch', 'sync']);