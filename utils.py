import json
from pydash import _

class JSLikeObject():
    def __init__(self, data):
        self.__original_data = data
        self.__data = _.clone_deep(data)
        if type(data) == dict:
            for key, val in self.__data.items():
                if type(val) in [dict, list]:
                    self.__data[key] = JSLikeObject(val)
        elif type(data) == list:
            for idx, val in enumerate(self.__data):
                if type(val) in [dict, list]:
                    self.__data[idx] = JSLikeObject(val)
    def __getattr__(self, attr):
        if type(self.__data) is dict:
            return self.__data.get(attr, None)
        elif type(self.__data) is list:
            try:
                idx = int(attr)
                return self.__data.get(idx, None)
            except Exception:
                raise Exception(f'List element access error. Attr name {attr}. Value type is {type(self.__data)}')
        else:
            raise Exception(f'Field access error. Field name {attr}. Value type is {type(self.__data)}')
    def __getitem__(self, item):
        if type(item) == str and type(self.__data) == dict:
            return getattr(self, str(item))
        elif type(item) == int and type(self.__data) == list:
            return self.__data[item]
        else:
            raise Exception(f'List element access error. Item {item}.')
    def __str__(self):
        return json.dumps(self.__original_data)
    def __repr__(self):
        return str(self)
