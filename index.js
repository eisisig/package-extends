#!/usr/bin/env node
'use strict'

const path = require('path')

require('babel-register')({
	babelrc: false,
	only: [
		path.resolve(__dirname, '*.js'),
		path.resolve(__dirname, 'lib'),
	],
	plugins: [
		path.resolve(__dirname, 'node_modules', 'babel-plugin-add-module-exports'),
		path.resolve(__dirname, 'node_modules', 'babel-plugin-syntax-async-generators'),
		path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-async-to-generator'),
		path.resolve(__dirname, 'node_modules', 'babel-plugin-transform-es2015-modules-commonjs'),
	]
})

require('./lib')
