# -*- coding: utf-8 -*-
#
# Univention UCS@School
"""
Base class of all input readers.
"""
# Copyright 2016 Univention GmbH
#
# http://www.univention.de/
#
# All rights reserved.
#
# The source code of this program is made available
# under the terms of the GNU Affero General Public License version 3
# (GNU AGPL V3) as published by the Free Software Foundation.
#
# Binary versions of this program provided by Univention to you as
# well as other copyrighted, protected or trademarked materials like
# Logos, graphics, fonts, specific documentations and configurations,
# cryptographic keys etc. are subject to a license agreement between
# you and Univention and not subject to the GNU AGPL V3.
#
# In the case you use this program under the terms of the GNU AGPL V3,
# the program is provided in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public
# License with the Debian GNU/Linux or Univention distribution in file
# /usr/share/common-licenses/AGPL-3; if not, see
# <http://www.gnu.org/licenses/>.


from ucsschool.importer.configuration import Configuration
from ucsschool.importer.utils.logging2udebug import get_logger
from ucsschool.importer.factory import Factory


class BaseReader(object):
	"""
	Base class of all input readers.

	Subclasses must override get_roles(), map() and read().
	"""
	config = Configuration()
	logger = get_logger()

	def __init__(self, filename, header_lines=0, **kwargs):
		"""
		:param filename: str: Path to file with user data.
		:param header_lines: int: Number of lines before the actual data starts.
		:param kwargs: dict: optional parameters for use in derived classes
		"""
		self.filename = filename
		self.header_lines = header_lines
		self.import_users = self.read()
		self.factory = Factory()
		self.ucr = self.factory.make_ucr()
		self.entry_count = 0

	def __iter__(self):
		return self

	def next(self):
		"""
		Generates ImportUsers from input data.
		:return: ImportUser
		"""
		self.entry_count += 1
		input_data = self.import_users.next()
		self.logger.debug("Input: %r", input_data)
		cur_user_roles = self.get_roles(input_data)
		cur_import_user = self.map(input_data, cur_user_roles)
		cur_import_user.entry_count = self.entry_count
		cur_import_user.prepare_uids()
		return cur_import_user

	def get_roles(self, input_data):
		"""
		IMPLEMENT ME
		Detect the ucsschool.lib.roles from the input data.

		:param input_data: dict user from read()
		:return: list: [ucsschool.lib.roles, ..]
		"""
		raise NotImplementedError()

	def map(self, input_data, cur_user_roles):
		"""
		IMPLEMENT ME
		Creates a ImportUser object from a users dict (self.cur_entry). Data
		will not be	modified, just copied.
		:param input_data: dict: user from read()
		:param cur_user_roles: list: [ucsschool.lib.roles, ..]
		:return: ImportUser
		"""
		raise NotImplementedError()

	def read(self, *args, **kwargs):
		"""
		IMPLEMENT ME
		Generator that returns dicts of read users
		:param args: list
		:param kwargs: dict
		:return: iter([user, ...])
		"""
		raise NotImplementedError()