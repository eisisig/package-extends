'use strict';

const fs = require('fs')
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
	      installed  = argv.save ? await savePackages(merged) : await installPackages(merged)
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

	console.log('')
	console.log(chalk.blue('Files used'))
	console.log('')
	console.log(pkgPaths.join('\n'))
	console.log('')

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
		if ( srcValue === 'latest' || objValue === 'latest' || ~srcValue.indexOf('file:') ) return srcValue
		const cleanObjValue = objValue.replace('^', '')
		const cleanSrcValue = objValue.replace('^', '')
		try {
			return semver.gt(cleanObjValue, cleanSrcValue) ? objValue : srcValue
		} catch ( e ) {
			console.log('Error in semver compare', e)
		}
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

async function savePackages (packages) {

	const defaultPackageFile = await getPackageFile()
	const newPackageFile = Object.assign({}, defaultPackageFile, packages)

	fs.writeFile(defaultPkgPath, JSON.stringify(newPackageFile, null, 4), 'utf8', (err) => {
		if ( err ) {
			return console.log(chalk.red(err))
		}
		console.log('')
		console.log(chalk.green('New package.json file written'))
		console.log('')
	})
}

async function installPackages (packages) {
	const packagesArray = await objectToString(packages)
	let installArray = packagesArray.dependencies

	if ( !argv.production ) installArray = installArray.concat(packagesArray.devDependencies)

	installArray.sort((a, b) => a.localeCompare(b))

	console.log('')
	if ( argv['dry-run'] ) {
		console.log(chalk.yellow('Install (dry run)'))
		console.log('')
		console.log(installArray.join('\n'))
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
