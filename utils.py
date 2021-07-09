import json
from pydash import _

class JSLikeObject():
    def __init__(self, data):
        if type(data) != dict:
            raise Exception('JSLikeObject() construction only accepts dicts')
        self.__original_data = data
        self.__data = _.clone_deep(data)
        for key, val in self.__data.items():
            if type(val) == dict:
                self.__data[key] = JSLikeObject(val)
    def __getattr__(self, attr):
        return self.__data[attr]
    def __str__(self):
        return json.dumps(self.__original_data)
    def __repr__(self):
        return str(self)
