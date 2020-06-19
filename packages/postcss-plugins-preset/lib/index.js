module.exports = [
	require( 'postcss-import' )(),
	require( 'postcss-mixins' ),
	require( 'postcss-nested' ),
	require( 'postcss-simple-vars' ),
	require( 'postcss-color-function' ),
	require( 'postcss-custom-properties' )(),
	require( 'autoprefixer' )( { grid: true } ),
];
