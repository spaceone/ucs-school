# -*- coding: utf-8 -*-
#
# Univention UCS@School
"""
Configuration classes.
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


import json

from ucsschool.importer.exceptions import InitialisationError, ReadOnlyConfiguration
from ucsschool.importer.utils.logging2udebug import get_logger

DEFAULTS_FILE = "/usr/share/ucs-school-import/configs/defaults.json"

logger = get_logger()


def setup_configuration(conffile, **kwargs):
	config = Configuration(conffile)
	config.update(kwargs)
	config.close()
	if not config.get("sourceUID"):
		raise InitialisationError("No sourceUID was specified.")
	if not config["input"].get("type"):
		raise InitialisationError("No input:type was specified.")
	return config


class ConfigurationFile(object):
	def __init__(self, filename):
		self.filename = filename

	def read(self):
		logger.info("Reading configuration from %r...", self.filename)
		with open(self.filename, "rb") as fp:
			return json.load(fp)

	def write(self, conf):
		logger.info("Writing configuration to %r...", self.filename)
		with open(self.filename, "wb") as fp:
			return json.dump(conf, fp)

	def update(self, conf):
		logger.info("Updating configuration in %r...", self.filename)
		cur = self.read()
		cur.update(conf)
		with open(self.filename, "wb") as fp:
			return json.dump(cur, fp)


class ReadOnlyDict(dict):
	@classmethod
	def _recursive_typed_update(cls, a, b):
		for k, v in b.items():
			if isinstance(v, dict):
				# recurse into nested dict
				a[k] = cls._recursive_typed_update(a.get(k, {}), v)
			else:
				# Try to use any other type than str (when overwriting
				# configuration from cmdline).
				t = type(v)
				if t == str and a.get(k):
					t = type(a[k])
				a[k] = t(b[k])
		return a

	def update(self, E=None, **F):
		self._recursive_typed_update(self, E)
		if F:
			self._recursive_typed_update(self, F)

	@staticmethod
	def __closed(self, *args, **kwargs):
		raise ReadOnlyConfiguration()

	def close(self):
		self.__setitem__ = self.__delitem__ = self.update = self._recursive_typed_update = self.__closed


class Configuration(object):
	"""
	Singleton to the global configuration object.
	"""
	class __SingleConf:
		def __init__(self, filename):
			if not filename:
				raise InitialisationError("Configuration not yet loaded.")
			try:
				cf = ConfigurationFile(DEFAULTS_FILE)
				self.config = ReadOnlyDict(cf.read())
				cf = ConfigurationFile(filename)
				self.config.update(cf.read())
			except ValueError as ve:
				raise InitialisationError("Error in configuration file '{}': {}.".format(filename, ve))
			except IOError as exc:
				raise InitialisationError("Error reading from configuration file '{}': {}.".format(filename, exc))

	_instance = None

	def __new__(cls, filename=None):
		if not cls._instance:
			cls._instance = cls.__SingleConf(filename)
		return cls._instance.config