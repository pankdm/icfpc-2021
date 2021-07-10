import json
from pydash import _
import os, os.path
from collections import defaultdict

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


def read_problem(problem_id):
    with open(f'problems/{problem_id}') as f:
        return json.loads(f.read())


def bonus_graph():
    num_problems = len([name for name in os.listdir('problems')])
    res = defaultdict(dict)
    for i in range(1, num_problems+1):
        spec = read_problem(i)
        res[i]["enables"] = []
        for b in spec["bonuses"]:
            prob = b["problem"]
            bonus = b["bonus"]
            res[i]["enables"].append((prob, bonus))
            if "needs" not in res[prob]:
                res[prob]["needs"] = []
            res[prob]["needs"].append((i, bonus))    
    with open("bonus_graph.json", 'w') as f:
        json.dump(res, f, indent=1)

