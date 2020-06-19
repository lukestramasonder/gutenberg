/**
 * External dependencies
 */
const { promisify } = require( 'util' );
const fs = require( 'fs' );
const path = require( 'path' );
const babel = require( '@babel/core' );
const makeDir = require( 'make-dir' );
const postcss = require( 'postcss' );

/**
 * Internal dependencies
 */
const getBabelConfig = require( './get-babel-config' );

/**
 * Path to packages directory.
 *
 * @type {string}
 */
const PACKAGES_DIR = path.resolve( __dirname, '../../packages' );

/**
 * Mapping of JavaScript environments to corresponding build output.
 *
 * @type {Object}
 */
const JS_ENVIRONMENTS = {
	main: 'build',
	module: 'build-module',
};

/**
 * Promisified fs.readFile.
 *
 * @type {Function}
 */
const readFile = promisify( fs.readFile );

/**
 * Promisified fs.writeFile.
 *
 * @type {Function}
 */
const writeFile = promisify( fs.writeFile );

/**
 * Get the package name for a specified file
 *
 * @param  {string} file File name
 * @return {string}      Package name
 */
function getPackageName( file ) {
	return path.relative( PACKAGES_DIR, file ).split( path.sep )[ 0 ];
}

/**
 * Get Build Path for a specified file.
 *
 * @param  {string} file        File to build
 * @param  {string} buildFolder Output folder
 * @return {string}             Build path
 */
function getBuildPath( file, buildFolder ) {
	const pkgName = getPackageName( file );
	const pkgSrcPath = path.resolve( PACKAGES_DIR, pkgName, 'src' );
	const pkgBuildPath = path.resolve( PACKAGES_DIR, pkgName, buildFolder );
	const relativeToSrcPath = path.relative( pkgSrcPath, file );
	return path.resolve( pkgBuildPath, relativeToSrcPath );
}

/**
 * Object of build tasks per file extension.
 *
 * @type {Object<string,Function>}
 */
const BUILD_TASK_BY_EXTENSION = {
	async '.scss'( file ) {
		const outputFile = getBuildPath(
			file.replace( '.scss', '.css' ),
			'build-style'
		);
		const outputFileRTL = getBuildPath(
			file.replace( '.scss', '-rtl.css' ),
			'build-style'
		);

		const [ , contents ] = await Promise.all( [
			makeDir( path.dirname( outputFile ) ),
			readFile( file, 'utf8' ),
		] );

		const sourceCSS =
			[
				'_mixins',
				'_variables',
				'_colors',
				'_breakpoints',
				'_animations',
				'_z-index',
			]
				.map(
					( imported ) =>
						`@import "${ path.join(
							PACKAGES_DIR,
							'base-styles',
							imported + '.scss'
						) }";`
				)
				.join( ' ' ) + contents;

		const result = await postcss(
			require( '@wordpress/postcss-plugins-preset' )
		).process( sourceCSS, {
			from: 'src/app.css',
			to: 'dest/app.css',
			syntax: require( 'postcss-scss' ),
		} );

		const resultRTL = await postcss( [ require( 'rtlcss' )() ] ).process(
			result.css,
			{
				from: 'src/app.css',
				to: 'dest/app.css',
			}
		);

		await Promise.all( [
			writeFile( outputFile, result.css ),
			writeFile( outputFileRTL, resultRTL.css ),
		] );
	},

	async '.js'( file ) {
		for ( const [ environment, buildDir ] of Object.entries(
			JS_ENVIRONMENTS
		) ) {
			const destPath = getBuildPath( file, buildDir );
			const babelOptions = getBabelConfig(
				environment,
				file.replace( PACKAGES_DIR, '@wordpress' )
			);

			const [ , transformed ] = await Promise.all( [
				makeDir( path.dirname( destPath ) ),
				babel.transformFileAsync( file, babelOptions ),
			] );

			await Promise.all( [
				writeFile(
					destPath + '.map',
					JSON.stringify( transformed.map )
				),
				writeFile(
					destPath,
					transformed.code +
						'\n//# sourceMappingURL=' +
						path.basename( destPath ) +
						'.map'
				),
			] );
		}
	},
};

module.exports = async ( file, callback ) => {
	const extension = path.extname( file );
	const task = BUILD_TASK_BY_EXTENSION[ extension ];

	if ( ! task ) {
		return;
	}

	try {
		await task( file );
		callback();
	} catch ( error ) {
		callback( error );
	}
};
