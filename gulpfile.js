const gulp = require('gulp')
const uglify = require('gulp-uglify')
const path = require('path')
const through = require('through2')
const webpack = require('webpack-stream')
const JSZIP = require('jszip')
const File = require('vinyl')
const cleanDir = require('gulp-clean-dir')



function gulpPermission (permission) {
  return through.obj(function (file, enc, callback) {
    file.permission = permission
    this.push(file)
    callback()
  })
}


function packageWorkflow(name) {
  const zip = new JSZIP();
  return through.obj(async function (file, enc, callback) {

    const filePath = path.join(file.base, file.relative)
    let folderZip
    if (file.stat && file.stat.isDirectory()) {
      folderZip = zip.folder(file.relative);
    } else {
      walkDir(folderZip || zip, filePath, file)
    }
    const zipContent = await zip.generateAsync({
      type: 'nodebuffer',
      platform:'UNIX',
      compression: 'DEFLATE',
      compressionOptions: {
          level: 9,
      }
    });
    const newFile = new File({
      path: name,
      contents: zipContent
    })
    this.push(newFile)
    callback()
  })
}

function walkDir(zip, filePath, file) {
  const stat = file.stat;
  if (!stat || stat.isFile()) {
    const {base: fileName = 'unKnow'} = path.parse(filePath);
    zip.file(fileName, file.contents, { unixPermissions: (file.permission || stat.mode & 4095).toString(8)});
  } else {
    const folderZip = zip.folder(file.relative);
    walkDir(folderZip, filePath, file)
  }
}

function gulpShebang() {
  return through.obj(function (file, enc, callback) {
    if (file.isNull()) {
      callback(null, file)
      return
    }
    const content = file.contents.toString()
    if (!/^#!(.*)/.test(content)) {
      file.contents = Buffer.from('#!/usr/bin/env node\n' + file.contents.toString())
    }
    this.push(file)
    callback()
  })
}

function noop() {}


function gulpWebpack(dest) {
  return webpack({
    mode: 'production',
    target: 'node',
    output: {
      filename: dest
    }
  }, null, noop)
}



gulp.task('build', function() {
  return gulp.src('./src/index.js')
    .pipe(gulpWebpack('proxy'))
    .pipe(cleanDir('./dist'))
    .pipe(uglify())
    .pipe(gulpShebang())
    .pipe(gulpPermission(0o755))
    .pipe(gulp.src('./public/**/*'))
    .pipe(packageWorkflow('proxy.alfredworkflow'))
    .pipe(gulp.dest('./dist'))
})

