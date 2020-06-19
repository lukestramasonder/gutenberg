/**
 * External dependencies
 */
import { isEmpty } from 'lodash';

/**
 * WordPress dependencies
 */
import { withSpokenMessages } from '@wordpress/components';
import { useMemo, useEffect } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

/**
 * Internal dependencies
 */
import BlockTypesList from '../block-types-list';
import __experimentalInserterMenuExtension from '../inserter-menu-extension';
import { searchBlockItems } from './search-items';
import InserterPanel from './panel';
import InserterNoResults from './no-results';
import useBlockTypesState from './hooks/use-block-types-state';

/**
 * List of reusable blocks shown in the "Reusable" tab of the inserter.
 *
 * @param {Object}   props                Component props.
 * @param {?string}  props.rootClientId   Client id of block to insert into.
 * @param {Function} props.onInsert       Callback to run when item is inserted.
 * @param {Function} props.onHover        Callback to run when item is hovered.
 * @param {?string}  props.filterValue    Search term.
 * @param {Function} props.debouncedSpeak Debounced speak function.
 *
 * @return {WPComponent} The component.
 */
export function InserterReusableBlockList( {
	rootClientId,
	onInsert,
	onHover,
	filterValue,
	debouncedSpeak,
} ) {
	const [ items, categories, collections, onSelectItem ] = useBlockTypesState(
		rootClientId,
		onInsert
	);

	const filteredItems = useMemo( () => {
		return searchBlockItems(
			items,
			categories,
			collections,
			filterValue
		).filter( ( { category } ) => category === 'reusable' );
	}, [ filterValue, items, categories, collections ] );

	// Announce search results on change.
	useEffect( () => {
		const resultsFoundMessage = sprintf(
			/* translators: %d: number of results. */
			_n( '%d result found.', '%d results found.', filteredItems.length ),
			filteredItems.length
		);
		debouncedSpeak( resultsFoundMessage );
	}, [ filterValue, debouncedSpeak ] );

	const hasItems = ! isEmpty( filteredItems );

	return (
		<div>
			{ filteredItems.length > 0 && (
				<InserterPanel className="block-editor-inserter__reusable-blocks-panel">
					<BlockTypesList
						items={ filteredItems }
						onSelect={ onSelectItem }
						onHover={ onHover }
					/>
					<a
						className="block-editor-inserter__manage-reusable-blocks"
						href={ addQueryArgs( 'edit.php', {
							post_type: 'wp_block',
						} ) }
					>
						{ __( 'Manage all reusable blocks' ) }
					</a>
				</InserterPanel>
			) }

			<__experimentalInserterMenuExtension.Slot
				fillProps={ {
					onSelect: onSelectItem,
					onHover,
					filterValue,
					hasItems,
				} }
			>
				{ ( fills ) => {
					if ( fills.length ) {
						return fills;
					}
					if ( ! hasItems ) {
						return <InserterNoResults />;
					}
					return null;
				} }
			</__experimentalInserterMenuExtension.Slot>
		</div>
	);
}

export default withSpokenMessages( InserterReusableBlockList );
