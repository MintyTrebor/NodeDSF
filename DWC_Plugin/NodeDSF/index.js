'use strict'

import { registerRoute } from '../../routes'

import NodeDSF from './NodeDSF.vue'

//<iframe class="NodeIFrame" src="http://localhost:1880/NodeDSF" scrolling="no" frameborder="0" allowtransparency="true" width="100%" height=auto></iframe>

// Register a route via Settings -> Object Model
registerRoute(NodeDSF, {
	Settings: {
		ObjectModel: {
			icon: 'mdi-file-tree',
			caption: 'NodeDSF',
			path: '/NodeDSF'
		}
	}
});
