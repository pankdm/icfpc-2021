from utils import read_problem

all_bonuses = set()

for problem_id in range(1, 89):
    spec = read_problem(problem_id)
    outer_bonus = spec['bonuses'][0]['problem']
    print (problem_id, spec['bonuses'])
    all_bonuses.add(outer_bonus)

print (len(all_bonuses))