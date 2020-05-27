/**
 * External dependencies
 */
import { keyBy, groupBy, sortBy } from 'lodash';

/**
 * WordPress dependencies
 */
import { createBlock, parse } from '@wordpress/blocks';
import { useState, useRef, useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { flattenBlocks } from './helpers';

export default function useNavigationBlocks( menuItems ) {
	const [ blocks, setBlocks ] = useState( [] );
	const menuItemsRef = useRef( {} );

	// Refresh our model whenever menuItems change
	useEffect( () => {
		const [ innerBlocks, clientIdToMenuItemMapping ] = menuItemsToBlocks(
			menuItems,
			blocks[ 0 ]?.innerBlocks,
			menuItemsRef.current
		);

		const navigationBlock = blocks[ 0 ]
			? { ...blocks[ 0 ], innerBlocks }
			: createBlock( 'core/navigation', {}, innerBlocks );

		setBlocks( [ navigationBlock ] );
		menuItemsRef.current = clientIdToMenuItemMapping;
	}, [ menuItems ] );

	return {
		blocks,
		setBlocks,
		menuItemsRef,
	};
}

const menuItemsToBlocks = (
	menuItems,
	prevBlocks = [],
	prevClientIdToMenuItemMapping = {}
) => {
	const blocksByMenuId = mapBlocksByMenuId(
		prevBlocks,
		prevClientIdToMenuItemMapping
	);

	const itemsByParentID = groupBy( menuItems, 'parent' );
	const clientIdToMenuItemMapping = {};
	const menuItemsToTreeOfBlocks = ( items ) => {
		const innerBlocks = [];
		if ( ! items ) {
			return;
		}

		const sortedItems = sortBy( items, 'menu_order' );
		for ( const item of sortedItems ) {
			let menuItemInnerBlocks = [];
			if ( itemsByParentID[ item.id ]?.length ) {
				menuItemInnerBlocks = menuItemsToTreeOfBlocks(
					itemsByParentID[ item.id ]
				);
			}
			const linkBlock = menuItemToLinkBlock(
				item,
				menuItemInnerBlocks,
				blocksByMenuId[ item.id ]
			);
			clientIdToMenuItemMapping[ linkBlock.clientId ] = item;
			innerBlocks.push( linkBlock );
		}
		return innerBlocks;
	};

	// menuItemsToTreeOfLinkBlocks takes an array of top-level menu items and recursively creates all their innerBlocks
	const blocks = menuItemsToTreeOfBlocks( itemsByParentID[ 0 ] || [] );
	return [ blocks, clientIdToMenuItemMapping ];
};

function menuItemToLinkBlock(
	menuItem,
	innerBlocks = [],
	existingBlock = null
) {
	let linkBlock;

	if ( menuItem.type === 'html' ) {
		const [ parsedBlock ] = parse( menuItem.content.raw ); // TODO: Handle multiple blocks?

		if ( parsedBlock ) {
			linkBlock = parsedBlock;
		} else {
			linkBlock = createBlock( 'core/freeform', {
				originalContent: menuItem.content.raw,
			} );
		}
	} else {
		linkBlock = createBlock(
			'core/navigation-link',
			{
				label: menuItem.title.rendered,
				url: menuItem.url,
			},
			innerBlocks
		);
	}

	if ( existingBlock ) {
		return {
			...existingBlock,
			name: linkBlock.name,
			attributes: linkBlock.attributes,
			innerBlocks: linkBlock.innerBlocks,
		};
	}

	return linkBlock;
}

const mapBlocksByMenuId = ( blocks, menuItemsByClientId ) => {
	const blocksByClientId = keyBy( flattenBlocks( blocks ), 'clientId' );
	const blocksByMenuId = {};
	for ( const clientId in menuItemsByClientId ) {
		const menuItem = menuItemsByClientId[ clientId ];
		blocksByMenuId[ menuItem.id ] = blocksByClientId[ clientId ];
	}
	return blocksByMenuId;
};
