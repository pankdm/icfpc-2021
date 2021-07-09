
import json

def read_problem(problem_id):
    with open(f'problems/{problem_id}') as f:
        return json.loads(f.read())
