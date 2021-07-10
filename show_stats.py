from utils import read_problem
import json
import math

all_bonuses = set()

with open('data/stats.json') as f:
    stats = json.loads(f.read())

for problem_id in range(1, 89):
    spec = read_problem(problem_id)
    outer_bonus = spec['bonuses'][0]['problem']
    mult = 1000 * math.log2(len(spec['figure']['vertices']) * len(spec['figure']['edges']) * len(spec['hole']))
    max_score = int(math.floor(mult))

    my_dislikes = stats[str(problem_id)]['dislikes']
    min_dislikes = int(stats[str(problem_id)]['min_dislikes'])
    if my_dislikes is not None and str.isdigit(my_dislikes):
        my_score = int(mult * math.sqrt((min_dislikes + 1) / (int(my_dislikes) + 1)))
    else:
        my_score = 0

    delta_score = max_score - my_score

    # print (problem_id, spec['bonuses'])
    print (problem_id, my_dislikes, min_dislikes, my_score, max_score, delta_score)
    all_bonuses.add(outer_bonus)

# print (len(all_bonuses))