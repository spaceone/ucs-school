/*
 * Copyright 2012 Univention GmbH
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

/*global console MyError dojo dojox dijit umc */

dojo.provide("umc.modules._schoolwizards.UserWizard");

dojo.require("umc.dialog");
dojo.require("umc.i18n");

dojo.require("umc.modules._schoolwizards.Wizard");

dojo.declare("umc.modules._schoolwizards.UserWizard", [ umc.modules._schoolwizards.Wizard, umc.i18n.Mixin ], {

	createObjectCommand: 'schoolwizards/users/create',

	constructor: function() {
		this.pages = [{
			name: 'general',
			headerText: this._('General information'),
			helpText: this._('Here\'s a simple helpText'),
			widgets: [{
				type: 'ComboBox',
				name: 'school',
				label: this._('School'),
				dynamicValues: 'schoolwizards/schools',
				autoHide: true
			}, {
				type: 'ComboBox',
				name: 'type',
				label: this._('Type'),
				staticValues: [{
					id: 'student',
					label: this._('Student')
				}, {
					id: 'teacher',
					label: this._('Teacher')
				}, {
					id: 'staff',
					label: this._('Staff')
				}, {
					id: 'teachersAndStaff',
					label: this._('Teachers and staff')
				}]
			}],
			layout: [['school'], ['type']]
		}, {
			name: 'user',
			headerText: this._('User information'),
			helpText: this._('Here\'s a simple helpText'),
			widgets: [{
				type: 'TextBox',
				name: 'username',
				label: this._('Username'),
				required: true
			}, {
				type: 'TextBox',
				name: 'firstname',
				label: this._('Firstname'),
				required: true
			}, {
				type: 'TextBox',
				name: 'lastname',
				label: this._('Lastname'),
				required: true
			}, {
				type: 'TextBox',
				name: 'mailPrimaryAddress',
				label: this._('E-Mail')
			}, {
				type: 'TextBox',
				name: 'class',
				label: this._('Class'),
				required: true
			}],
			layout: [['username'],
			         ['firstname', 'lastname'],
			         ['mailPrimaryAddress'],
			         ['class']]
		}];
	},

	postMixInProperties: function() {
		this.finishHelpText = this._('Here\'s a simple helpText');
		this.finishButtonLabel = this._('Click here to create another user');
	},

	restart: function() {
		umc.tools.forIn(this.getPage('user')._form._widgets, function(iname, iwidget) {
			if (iname !== 'class') {
				iwidget.reset();
			}
		});
		this.inherited(arguments);
	}
});
