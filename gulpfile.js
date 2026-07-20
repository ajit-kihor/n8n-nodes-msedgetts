const gulp = require('gulp');

function copyIcons() {
  return gulp.src('nodes/**/*.svg')
    .pipe(gulp.dest('dist/nodes'));
}

function copyJson() {
  return gulp.src('nodes/**/*.json')
    .pipe(gulp.dest('dist/nodes'));
}

exports.default = gulp.series(copyIcons, copyJson);
