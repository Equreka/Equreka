const 
	categories = [
		'universal', 'mathematics', 'physics', 'chemistry'
	],
	menu = [
		{ slug: 'home', to: '/', icon: 'bi-house' },
		{ slug: 'search', to: '/search', icon: 'bi-search' },
		//{ slug: 'calculator', to: '/calculator', icon: 'bi-plus-square' },
		{ slug: 'favorites', to: '/favorites', icon: 'bi-heart' },
		{ slug: 'settings', to: '/settings', icon: 'bi-gear' }
	],
	types = [
		'equations', 'formulas', 'constants', 'magnitudes', 'variables', 'units', 'prefixes'
	],
	themes = {
		'light':  'Light',
		'dark':   'Dark',
		'system': 'System default'
	}
;

export default {
	categories,
	menu,
	types,
	themes
}