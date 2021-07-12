# from manual_solve import find_all_pairs
import sys
import json

from utils import read_problem


problem_id = sys.argv[1]



def dist2(pt1, pt2):
    x1, y1 = pt1
    x2, y2 = pt2
    return (x1 - x2) ** 2 + (y1 - y2) ** 2


def find_closest(pt, vertices):
    min_dist = None
    min_pt = None
    min_index = None
    for (index, to_pt) in enumerate(vertices):
        d = dist2(pt, to_pt)
        if min_dist is None or d < min_dist:
            min_dist = d
            min_pt = to_pt
            min_index = index
    return (min_dist, min_pt, min_index)


def print_distances(problem_id):
    spec = read_problem(problem_id)

    with open('solutions/current') as f:
        start = json.loads(f.read())
        for index, v in enumerate(start['vertices']):
            print (index, v)

    all_dist = []
    for (hole_idx, hole_pt) in enumerate(spec['hole']):
        if hole_pt not in start['vertices']:
            min_dist, min_pt, min_index = find_closest(hole_pt, start['vertices'])
            all_dist.append((hole_idx, min_dist, min_pt, min_index))

    total = 0
    all_dist.sort(key=lambda x : x[1])
    for (hole_pt, min_dist, min_pt, min_index) in all_dist:
        print ("hole = {}, dist = {} to vertex = {} ({})".format(
            hole_pt, min_dist, min_index, min_pt
        ))
        total += min_dist
    print ("total = {}".format(total))


print_distances(problem_id)