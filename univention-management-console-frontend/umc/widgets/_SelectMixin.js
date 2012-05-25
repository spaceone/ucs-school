/*
 * Copyright 2011-2012 Univention GmbH
 *
 * http://www.univention.de/
 *
 * All rights reserved.
 *
 * The source code of this program is made available
 * under the terms of the GNU Affero General Public License version 3
 * (GNU AGPL V3) as published by the Free Software Foundation.
 *
 * Binary versions of this program provided by Univention to you as
 * well as other copyrighted, protected or trademarked materials like
 * Logos, graphics, fonts, specific documentations and configurations,
 * cryptographic keys etc. are subject to a license agreement between
 * you and Univention and not subject to the GNU AGPL V3.
 *
 * In the case you use this program under the terms of the GNU AGPL V3,
 * the program is provided in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License with the Debian GNU/Linux or Univention distribution in file
 * /usr/share/common-licenses/AGPL-3; if not, see
 * <http://www.gnu.org/licenses/>.
 */
/*global dojo dijit dojox umc console */

dojo.provide("umc.widgets._SelectMixin");

dojo.require("dojo.data.ItemFileWriteStore");
dojo.require("dojo.Stateful");
dojo.require("umc.tools");

dojo.declare("umc.widgets._SelectMixin", dojo.Stateful, {
	// umcpCommand:
	//		Reference to the umcpCommand the widget should use.
	//		In order to make the widget send information such as module flavor
	//		etc., it can be necessary to specify a module specific umcpCommand
	//		method.
	umcpCommand: null,

	// dynamicValues: String|Function
	//		Either an UMCP command to query data from or a javascript function.
	//		The javascript function may return an array or a dojo.Deferred object.
	//		The format is in either case expected to have the same format as for
	//		staticValues. Dynamic values may be mixed with staticValues.
	dynamicValues: null,

	// dynamicOptions: Object?|Function?
	//		Reference to a dictionary containing options that are passed over to
	//		the UMCP command specified by `dynamicValues`. Can be a function that
	//		is expected to return a dictionary, it is called with a dict of all
	//		values of the widget's dependencies.
	dynamicOptions: null,

	// sortDynamicValues: Boolean
	//		Controls whether dynamic values are sorted automatically.
	sortDynamicValues: true,

	// staticValues: Object[]
	//		Array of id/label objects containing predefined values, e.g.
	//		[ { id: 'de', label: 'German' }, { id: 'en', label: 'English' } ].
	//		Can be mixed with dynamicValues with the predefined values being
	//		displayed first. May also be only an array with strings (i.e., id==label).
	staticValues: [],

	// sortStaticValues: Boolean
	//		Controls whether static values are sorted automatically.
	sortStaticValues: false,

	// depends: String?|String[]?
	//		Specifies that values need to be loaded dynamically depending on
	//		other form fields.
	depends: null,

	// searchAttr needs to specified, otherwise the values from the store will not be displayed.
	searchAttr: 'label',

	store: null,

	value: null,

	// internal variable to keep track of which ids have already been added
	_ids: {},

	_firstValueInList: null,

	_initialValue: null,

	//_isAutoValue: false,

	//_isInitialized: false,

	_valuesLoaded: false,

	_deferredOrValues: null,

	_createStore: function() {
		return new dojo.data.ItemFileWriteStore({
			data: {
				identifier: 'id',
				label: 'label',
				items: []
			},
			clearOnClose: true
		});
	},

	constructor: function() {
		// The store needs to be available already at construction time, otherwise an
		// error will be thrown. We need to define it here, in order to create a new
		// store for each instance.a
		this.umcpCommand = umc.tools.umcpCommand;
		this.store = this._createStore();
	},

	postMixInProperties: function() {
		this.inherited(arguments);

		this._saveInitialValue();
	},

	postCreate: function() {
		this.inherited(arguments);

		this.connect(this, 'onChange', function(newVal) {
			if (this.focused) {
				// the user has entered a value, use this value as initial value
				this._saveInitialValue();
			}
		});
	},

	startup: function() {
		this.inherited(arguments);

		this._loadValues();
	},

	item2object: function( item ) {
		// summary:
		//		Converts a store item to a "normal" dictionary
		var entry = {};

		umc.tools.forIn( item, function( attr, value ) {
			// make sure the following default internal store item properties are ignored
			// (as defined in dojo.data.ItemFileReadStore)
			var ignore = false;
			dojo.forEach(['_storeRefPropName', '_itemNumPropName', '_rootItemPropName', '_reverseRefMap'], function(ikey) {
				if (this.store[ikey] == attr) {
					ignore = true;
					return false;
				}
			}, this);
			if (ignore) {
				return true;
			}

			if ( dojo.isArray( value ) && value.length == 1 ) {
				entry[ attr ] = value[ 0 ];
			} else {
				entry[ attr ] = null;
			}
		}, this );

		return entry;
	},

	getAllItems: function() {
		// summary:
		//		Converts all store items to "normal" dictionaries
		return dojo.map( this.store._getItemsArray(), function ( item ) {
			return this.item2object( item );
		}, this );
	},

	getNumItems: function() {
		// summary:
		//		Returns number of items in combobox
		return this.store._getItemsArray().length;
	},

	_setValueAttr: function(newVal) {
		this.inherited(arguments);

		// store the value as intial value after the widget has been intialized
		//if (this._isInitialized) {
		//	this._saveInitialValue();
		//}
	},

	_saveInitialValue: function() {
		// rember the intial value since it will be overridden by the dojo
		// methods since at initialization time the store is empty
		try {
			this._initialValue = this.get('value');
		}
		catch (error) {
			// failed to access 'value', probably too early in the widget construction 
			// (e.g., DOM elements are not ready yet)
			this._initialValue = this.value;
		}
	},

	setInitialValue: function(value, setValue) {
		// summary:
		//		Forces to set this given initial value.
		setValue = undefined === setValue ? true : setValue;
		this._initialValue = value;
		if (setValue) {
			this.set('value', value);
		}
	},

	_setCustomValue: function() {
		if (null === this._initialValue || undefined === this._initialValue) {
			// no initial value is given, use the first value in the list
			this.set('value', this._firstValueInList);
			this._resetValue = this._firstValueInList;
		}
		else {
			// otherwise use the initial value
			this.set('value', this._initialValue);
			this._resetValue = this._initialValue;
		}
	},

	_clearValues: function() {
		this.store.fetch( { 
			onComplete: dojo.hitch( this, function( items ) {
				dojo.forEach( items, dojo.hitch( this, function( item ) {
					this.store.deleteItem( item );
				} ) )
			} )
		} );
		this.store.save();

		//if (this._isAutoValue) {
		//	// reset the _initialValue in case we chose it automatically
		//	this._initialValue = null;
		//}
		//this._isAutoValue = false;
		this._firstValueInList = null;
		this.set('value', this._initialValue);
	},

	_convertItems: function(_items) {
		// unify the items into the format:
		//   [{
		//       id: '...',
		//       label: '...'
		//   }, ... ]
		var items = [];

		if (dojo.isArray(_items)) {
			dojo.forEach(_items, function(iitem) {
				// string
				if (dojo.isString(iitem)) {
					items.push({
						id: iitem,
						label: iitem
					});
				}
				// array of dicts
				else if (dojo.isObject(iitem)) {
					if (!('id' in iitem && 'label' in iitem)) {
						console.log("WARNING: umc.widgets._SelectMixin: One of the entries specified does not have the properties 'id' and 'label', ignoring item: " + dojo.toJson(iitem));
					}
					else {
						items.push(iitem);
					}
				}
				// unknown format
				else {
					console.log("WARNING: umc.widgets._SelectMixin: Given items are in incorrect format, ignoring item: " + dojo.toJson(_items));
				}
			});
		}

		return items;
	},

	_setStaticValues: function() {
		// convert items to the correct format
		var staticValues = this._convertItems(this.staticValues);

		if (this.sortStaticValues) {
			// sort items according to their displayed name
			staticValues.sort(umc.tools.cmpObjects({
				attribute: 'label',
				ignoreCase: true
			}));
		}

		// add all static values to the store
		this._ids = {};
		dojo.forEach(staticValues, function(iitem) {
			// store the first value of the list
			if (null === this._firstValueInList) {
				this._firstValueInList = iitem.id;
			}

			// add item to store
			if (iitem.id in this._ids) {
				console.log("WARNING: umc.widgets._SelectMixin: Entry already previously defined, ignoring: " + dojo.toJson(iitem));
			}
			else {
				this.store.newItem(iitem);

				// cache the values in a dict
				this._ids[iitem.id] = iitem.label;
			}
		}, this);

		// save the store in order for the changes to take effect
		this.store.save();

		// set the user specified value if we don't have dynamic values
		if (!dojo.isString(this.dynamicValues) || !this.dynamicValues) {
			this._setCustomValue();
		}
	},

	_setDynamicValues: function(/*Object[]*/ values) {
		// convert items to the correct format
		var items = this._convertItems(values);

		if (this.sortDynamicValues) {
			// sort items according to their displayed name
			items.sort(umc.tools.cmpObjects({
				attribute: 'label',
				ignoreCase: true
			}));
		}

		// add items to the store
		dojo.forEach(items, function(iitem) {
			if (iitem) {
				// store the first value of the list
				if (null === this._firstValueInList) {
					this._firstValueInList = iitem.id;
				}

				// add item to store
				if (iitem.id in this._ids) {
					console.log("WARNING: umc.widgets._SelectMixin: Entry already previously defined, ignoring: " + dojo.toJson(iitem));
				}
				else {
					this.store.newItem(iitem);

					// cache the values in a dict
					this._ids[iitem.id] = iitem.label;

					// set pre-selected item
					if (iitem.preselected) {
						this._initialValue = iitem.id;
					}
				}
			}
		}, this);

		// save the store in order for the changes to take effect and set the value
		this.store.save();
		this._setCustomValue();
	},

	_loadValues: function(/*Object?*/ _dependValues) {
		this._valuesLoaded = true;

		// unify `depends` property to be an array
		var dependList = dojo.isArray(this.depends) ? this.depends :
			(this.depends && dojo.isString(this.depends)) ? [ this.depends ] : [];

		// check whether all necessary values are specified
		var params = {};
		var nDepValues = 0;
		if (dependList.length && dojo.isObject(_dependValues) && _dependValues) {
			// check whether all necessary values are specified
			for (var i = 0; i < dependList.length; ++i) {
				if (_dependValues[dependList[i]]) {
					params[dependList[i]] = _dependValues[dependList[i]];
					++nDepValues;
				}
			}
		}

		// only load dynamic values in case all dependencies are fullfilled
		if (dependList.length != nDepValues) {
			return;
		}

		// mixin additional options for the UMCP command
		if (this.dynamicOptions) {
			if (dojo.isFunction(this.dynamicOptions)) {
				dojo.mixin(params, this.dynamicOptions(params));
			}
			else if (dojo.isObject(this.dynamicOptions)) {
				dojo.mixin(params, this.dynamicOptions);
			}
		}

		// block concurrent events for value loading
		if (this._deferredOrValues) {
			// another request is pending
			return;
		}

		// get dynamic values
		var func = umc.tools.stringOrFunction(this.dynamicValues, this.umcpCommand);
		var deferredOrValues = func(params);
		this._deferredOrValues = deferredOrValues;

		// make sure we have an array or a dojo.Deferred object
		if (deferredOrValues &&
				(dojo.isArray(deferredOrValues) ||
				(dojo.isObject(deferredOrValues) && 'then' in deferredOrValues && 'cancel' in deferredOrValues))) {
			this.onLoadDynamicValues();
			dojo.when(deferredOrValues, dojo.hitch(this, function(res) {
				// callback handler
				// update dynamic and static values
				this._clearValues();
				this._setStaticValues();
				this._setDynamicValues(res);
				this.onDynamicValuesLoaded(res);

				// values have been loaded
				this.onValuesLoaded(this.getAllItems());

				// unblock value loading
				this._deferredOrValues = null;
			}), dojo.hitch(this, function() {
				// set only the static values
				this._clearValues();
				this._setStaticValues();

				// error handler
				this.onDynamicValuesLoaded([]);
				this.onValuesLoaded(this.getAllItems());

				// unblock value loading
				this._deferredOrValues = null;
			}));
		}
		else {
			// set only the static values
			this._clearValues();
			this._setStaticValues();

			// values have been loaded
			this.onValuesLoaded(this.getAllItems());

			// unblock value loading
			this._deferredOrValues = null;
		}
	},

	onLoadDynamicValues: function() {
		// summary:
		//		This event is triggered when a query is set to load the dynamic values (and
		//		only the dynamic values).
	},

	onDynamicValuesLoaded: function(values) {
		// summary:
		//		This event is triggered when the dynamic values (and only the dynamic values)
		//		have been loaded.
		// values:
		//		Array containing all dynamic values.
	},

	onValuesLoaded: function(values) {
		// summary:
		//		This event is triggered when all values (static and dynamic) have been loaded.
		// values:
		//		Array containing all dynamic and static values.

		// if we can (data grid), perform a refresh
		//if (dojo.isFunction(this._refresh)) {
		//	this._refresh();
		//}

		// if the value is not set (undefined/null), automatically choose the first element in the list
		if (null === this.get('value') || undefined === this.get('value')) {
			this.set('value', this._firstValueInList);
		}
	},

	// setter for staticValues
	_setDynamicValuesAttr: function(newVals) {
		this.dynamicValues = newVals;

		// we only need to call _loadValues() if it has been called before
		if (this._valuesLoaded) {
			this._loadValues();
		}
	},

	// setter for staticValues
	_setDynamicOptionsAttr: function(newOpts) {
		this.dynamicOptions = newOpts;

		// we only need to call _loadValues() if it has been called before
		if (this._valuesLoaded) {
			this._loadValues();
		}
	},

	// setter for staticValues
	_setStaticValuesAttr: function(newVals) {
		this.staticValues = newVals;

		// we only need to call _loadValues() if it has been called before
		if (this._valuesLoaded) {
			this._loadValues();
		}
	},

	reloadDynamicValues: function() {
		if (this._valuesLoaded) {
			this._loadValues();
		}
	}
});


