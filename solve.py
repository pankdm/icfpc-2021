#!/usr/bin/env python3
import sys
from utils import read_problem
import json
import copy

from get_problems import submit_solution

from shapely.geometry import Point, Polygon

def is_inside(polygon, x, y):
    pt = Point(x, y)
    return polygon.contains(pt) or polygon.touches(pt)

def dist2(pt1, pt2):
    x1, y1 = pt1
    x2, y2 = pt2
    return (x1 - x2) ** 2 + (y1 - y2) ** 2


def compute_inside_points(spec):
    res = set()

    # compute bounding box
    first_pt = spec['hole'][0]
    xmax = xmin = first_pt[0]
    ymax = ymin = first_pt[1]

    for pt in spec['hole']:
        x, y = pt
        xmax = max(xmax, x)
        ymax = max(ymax, y)

        xmin = min(xmin, x)
        ymin = min(ymin, y)
    
    polygon = Polygon(spec['hole'])
    for x in range(xmin, xmax + 1):
        for y in range(ymin, ymax + 1):
            if is_inside(polygon, x, y):
                res.add((x, y))
    return res


def count_dislikes(spec, solution):
    total_dislikes = 0
    for hole_pt in spec['hole']:
        min_dist = min(dist2(hole_pt, pt) for pt in solution.values())
        total_dislikes += min_dist
    return total_dislikes

def check_distance(spec, orig_dist, new_dist):
    if abs(1.0 * new_dist / orig_dist - 1) <= spec['epsilon'] / 10**6:
        return True
    return False

# solution = {id -> [x, y]}
def check_partial_solution(spec, solution):
    # TODO: check intersection with boundaries
    for edge in spec['figure']['edges']:
        a, b = edge
        if a in solution and b in solution:
            pt_a = solution[a]
            pt_b = solution[b]
            orig_dist = dist2(spec['figure']['vertices'][a], spec['figure']['vertices'][b])    
            new_dist = dist2(pt_a, pt_b)
            if not check_distance(spec, orig_dist, new_dist):
                return False
    return True

best_score = None
best_solution = None

def try_solve(spec, solution, inside_points):
    global best_score, best_solution
    ok = check_partial_solution(spec, solution)
    if not ok:
        return

    # find next edge to add
    edge_to_add = None
    for edge in spec['figure']['edges']:
        a, b = edge
        # swap to always treat as a in solution
        if b in solution:
            a, b = b, a
        if a not in solution:
            continue
        assert (a in solution)
        if b in solution:
            continue
        assert (b not in solution)
        edge_to_add = a, b
        break
        
    # nothing to add - this is final answer
    if edge_to_add is None:
        score = count_dislikes(spec, solution)
        if best_score is None or score < best_score:
            best_score = score
            best_solution = copy.copy(solution)
            print ("Found better score = {}, best solution = {}".format(
                score, best_solution
            ))
        return

    # find next possible point for b
    orig_dist = dist2(spec['figure']['vertices'][a], spec['figure']['vertices'][b])    
    for pt in inside_points:
        new_dist = dist2(solution[a], pt)
        if check_distance(spec, orig_dist, new_dist):
            solution[b] = pt
            try_solve(spec, solution, inside_points)
            # otherwise restore previous state
            if best_score == 0: break
            del solution[b]
    return False

def solve_and_submit(problem_id):
    print (f'Solving {problem_id}')

    spec = read_problem(problem_id)
    print (spec)

    inside = list(sorted(compute_inside_points(spec)))
    print ('inside points:', len(inside))


    total_points = len(spec['figure']['vertices'])
    for first_index in range(len(spec['hole'])):
        first_hole_pt = spec['hole'][first_index]
        for index in range(total_points):
            if best_score == 0:
                break
            print ('Trying connecting index={} to {}'.format(index, first_hole_pt))
            solution = {index: first_hole_pt}
            try_solve(spec, solution, inside)

    print ('[score = {}], writing best solution {}'.format(best_score, best_solution))
    dislikes = count_dislikes(spec, best_solution)
    vertices = []
    for index in range(total_points):
        vertices.append(best_solution[index])
    res = {'vertices' : vertices}
    js_str = json.dumps(res)
    with open(f'solutions/tmp/{problem_id}', 'w') as f:
        f.write(js_str)
    
    submit_solution(problem_id, js_str)

if __name__ == "__main__":
    problem_id = sys.argv[1]
    solve_and_submit(problem_id)





