#!/usr/bin/env node
'use strict';

var path = require('path')
var semver = require('semver')
var uniq = require('lodash.uniq')
var values = require('lodash.values')
var reduce = require('lodash.reduce')
var isEmpty = require('lodash.isempty')
var isArray = require('lodash.isarray')
var mapValues = require('lodash.mapvalues')
var install = require('spawn-npm-install')

var pkg;

try {
	pkg = require(path.resolve(process.cwd(), 'package.json'))

	if ( validatePackage(pkg) ) {

		var defaultPackage = {
			dependencies: pkg.dependencies || {},
			devDependencies: pkg.devDependencies || {},
		}
		var files = getFiles(pkg.extends).concat(defaultPackage)
		var newPackage = reduce(files, function (results, currentFile) {

			reduce(currentFile.dependencies, function (res, itm, key) {
				if ( key in results.dependencies ) {
					if ( results.dependencies[key] === 'latest' ) {
						results.dependencies[key] = 'latest'
						return res
					}
					var oldValue = semver.clean(results.dependencies[key].replace('^', ''))
					var newVal = semver.clean(itm.replace('^', ''))
					results.dependencies[key] = semver.gt(oldValue, newVal) || oldValue === 'latest' ? oldValue : newVal
				} else {
					results.dependencies[key] = itm
				}
				return res
			}, {})

			reduce(currentFile.devDependencies, function (res, itm, key) {
				if ( key in results.devDependencies ) {
					if ( results.devDependencies[key] === 'latest' ) {
						results.devDependencies[key] = 'latest'
						return res
					}
					var oldValue = semver.clean(results.devDependencies[key].replace('^', ''))
					var newVal = semver.clean(itm.replace('^', ''))
					results.devDependencies[key] = semver.gt(oldValue, newVal) || oldValue === 'latest' ? oldValue : newVal
				} else {
					results.devDependencies[key] = itm
				}
				return res
			}, {})

			return results

		}, defaultPackage)

		var arr = []
			.concat(values(mapValues(newPackage.dependencies, function (val, key) {
				return key + '@' + val
			})))
			.concat(values(mapValues(newPackage.devDependencies, function (val, key) {
				return key + '@' + val
			})))

		arr = uniq(arr)

		console.log('npm install', arr.join(' '))

		install(arr, {}, function (err) {
			if ( err )
				console.error("Could not install:\n" + err.message)
			else
				console.log("Installed.")
		})

	} else {
		console.log('No extends found')
	}

} catch ( e ) {
	console.log('package.json not found', e)
}

function validatePackage (pkg) {
	return !isEmpty(pkg.extends) && isArray(pkg.extends)
}

function getFiles (paths) {
	return reduce(paths, function (res, item) {
		try {
			var pack = require(path.resolve(item, 'package.json'))
			res.push({
				dependencies: pack.dependencies || {},
				devDependencies: pack.devDependencies || {},
			})
			return res;
		} catch ( e ) {
			return res;
		}
	}, [])
}
