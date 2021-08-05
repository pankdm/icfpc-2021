#!/usr/bin/env python3

import os

from utils import read_json, read_problem
from get_problems import submit_solution

from collect_golden import validate_solution, count_dislikes

from shapely.geometry import Point, Polygon


LAST_PROBLEM = 132

def main():
    js_stats = read_json('data/stats_after_party.json')

    for i in range(1, LAST_PROBLEM + 1):
        file_path = f'solutions/golden/{i}'
        if not os.path.exists(file_path):
            continue

        spec = read_problem(i)
        spec['hole_poly'] = Polygon(spec['hole'])

        solution = read_json(file_path)
        ok = validate_solution(spec, solution)
        if ok:
            dislikes = count_dislikes(spec, solution)
            submitted_dislikes = js_stats[str(i)]['dislikes']
            if submitted_dislikes is None or dislikes < int(submitted_dislikes):
                print ('id {}: found better solution {} vs {}'.format(
                    i, dislikes, submitted_dislikes
                ))

                js_str = open(file_path).read()
                submit_solution(i, js_str)

if __name__ == '__main__':
    main()