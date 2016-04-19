'use strict';

const path = require('path')
const chalk = require('chalk')
const globby = require('globby')
const semver = require('semver')
const uniq = require('lodash.uniq')
const isEmpty = require('lodash.isempty')
const map = require('lodash.map')
const reduce = require('lodash.reduce')
const values = require('lodash.values')
const mapValues = require('lodash.mapvalues')
const mergeWith = require('lodash.mergewith')
const isArray = require('lodash.isarray')
const install = require('spawn-npm-install')
const argv = require('minimist')(process.argv.slice(2))

const defaultPkgPath = path.resolve(process.cwd(), 'package.json')

start();

async function start () {
	const defaultPkg = await getPackageFile(),
	      paths      = await getPaths(defaultPkg),
	      files      = await getFiles(paths),
	      merged     = await mergeFiles(files),
	      installed  = await installPackages(merged)
}

async function getPackageFile () {
	try {
		return require(defaultPkgPath)
	} catch ( e ) {
		console.log(e)
	}
}

async function getPaths (pkg) {

	if ( argv.glob ) return globby.sync(argv.glob)

	return !isEmpty(pkg.extends) && isArray(pkg.extends) ? globby.sync(pkg.extends) : console.log('Error')
}

async function getFiles (paths) {

	const pkgPaths = map(paths, p => path.resolve(p)).concat(defaultPkgPath)

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
		if ( srcValue === 'latest' || objValue === 'latest' ) return srcValue
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

async function installPackages (packages) {
	const packagesArray = await objectToString(packages)
	let installArray = packagesArray.dependencies

	if ( !argv.production ) installArray = installArray.concat(packagesArray.devDependencies)

	console.log('')
	if ( argv['dry-run'] ) {
		console.log(chalk.yellow('Install (dry run)'))
		console.log('')
		console.log(installArray.join(' '))
	} else {
		install(installArray, {}, function (err) {
			if ( err ) console.error(chalk.red('Could not install:\n' + err.message))
			else {
				console.log(chalk.green('Install'))
				console.log('')
				console.log(installArray.join(' '))
			}
		})
	}
	console.log('')

}
