'use strict';

const path = require('path')
const semver = require('semver')
const uniq = require('lodash.uniq')
const isEmpty = require('lodash.isempty')
const map = require('lodash.map')
const reduce = require('lodash.reduce')
const values = require('lodash.values')
const mapValues = require('lodash.mapvalues')
const mergeWith = require('lodash.mergewith')
const isArray = require('lodash.isarray')

const defaultPkgPath = path.resolve(process.cwd(), 'package.json')

start();

async function start () {
	console.log('start: start')
	const defaultPkg = await getPackageFile(),
	      paths      = await getPaths(defaultPkg),
	      files      = await getFiles(paths),
	      merged     = await mergeFiles(files),
	      installed  = await install(merged)

	console.log('installed', installed)
}

async function getPackageFile () {
	try {
		return require(defaultPkgPath)
	} catch ( e ) {
		console.log(e)
	}
}

async function getPaths (pkg) {
	return !isEmpty(pkg.extends) && isArray(pkg.extends) ? pkg.extends : console.log('Error')
}

async function getFiles (paths) {
	const pkgPaths = map(paths, p => path.resolve(p, 'package.json')).concat(defaultPkgPath)
	return reduce(pkgPaths, (res, file) => {
		try {
			const pkg = require(file)
			res.push({ dependencies: pkg.dependencies, devDependencies: pkg.devDependencies, })
		} catch ( e ) {}
		return res
	}, [])
}

async function mergeFiles (files) {

	if ( files.length === 1 ) return files[0]

	return reduce(files, (res, file) => {
		mergeWith(res.dependencies, file.dependencies, compareVersions)
		mergeWith(res.devDependencies, file.devDependencies, compareVersions)
		return res
	}, { dependencies: {}, devDependencies: {} })
}

function compareVersions (objValue, srcValue) {
	if ( objValue ) {
		if ( srcValue === 'latest' ) return srcValue
		const cleanObjValue = objValue.replace('^', '')
		const cleanSrcValue = objValue.replace('^', '')
		return semver.gt(cleanObjValue, cleanSrcValue) ? objValue : srcValue
	}
}

async function objectToString (object) {
	object.dependencies = await getObjValues(object, 'dependencies')
	object.devDependencies = await getObjValues(object, 'devDependencies')
	return object
}

async function getObjValues (obj, type) {
	return uniq(values(mapValues(obj[type], (val, key) => key + '@' + val)))
}

async function install (packages) {
	const installString = await objectToString(packages)
	console.log('install: install', installString)
}
