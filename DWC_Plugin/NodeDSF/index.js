'use strict'

import { registerRoute } from '../../routes'

import NodeDSF from './NodeDSF.vue'

// Register a route via Settings -> Object Model
registerRoute(NodeDSF, {
	Settings: {
		ObjectModel: {
			icon: 'mdi-resistor-nodes',
			caption: 'NodeDSF',
			path: '/NodeDSF'
		}
	}
});
