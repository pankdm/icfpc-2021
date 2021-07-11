import sys
import json

from utils import read_problem


problem_id = sys.argv[1]


spec = read_problem(problem_id)

with open('solutions/manual/70_dm_1625980258525') as f:
    start = json.loads(f.read())


for (hole_idx, hole_pt) in enumerate(spec['hole']):
    if hole_pt not in start['vertices']:
        print ('idx = ', hole_idx, 'pt = ', hole_pt)
