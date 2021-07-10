#!/usr/bin/env python3
import sys
import json
import copy
import random
import time

import os.path

from shapely.geometry import Point, Polygon

from utils import read_problem
from get_problems import submit_solution

TIMEOUT = 10 # seconds


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



def count_dislikes_impl(spec, values):
    total_dislikes = 0
    for hole_pt in spec['hole']:
        min_dist = min(dist2(hole_pt, pt) for pt in values)
        total_dislikes += min_dist
    return total_dislikes


def count_dislikes(spec, solution):
    return count_dislikes_impl(spec, solution.values())

def count_dislikes_from_submitted(spec, js_output):
    return count_dislikes_impl(spec, js_output['vertices'])

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

class TimeoutException(Exception):
    pass


class Solver():
    def __init__(self, spec, inside_points):
        self.spec = spec
        self.inside_points = inside_points
        self.best_score = None
        self.best_solution = None
        self.timer = None

    def try_solve(self, solution):
        spec = self.spec
        ok = check_partial_solution(spec, solution)
        if not ok:
            return

        now = time.time()
        delta = now - self.start
        if delta > TIMEOUT:
            print ('timeout after {} seconds'.format(delta))
            raise TimeoutException()

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
            if self.best_score is None or score < self.best_score:
                self.best_score = score
                self.best_solution = copy.copy(solution)
                print ("Found better score = {}, best solution = {}, solution = {}".format(
                    score, self.best_solution, solution
                ))
            return

        # find next possible point for b
        orig_dist = dist2(spec['figure']['vertices'][a], spec['figure']['vertices'][b])    
        for pt in self.inside_points:
            new_dist = dist2(solution[a], pt)
            if check_distance(spec, orig_dist, new_dist):
                solution[b] = pt
                self.try_solve(solution)
                # otherwise restore previous state
                if self.best_score == 0: break
                del solution[b]
        return False

    def full_solve(self):
        # start the timer
        self.start = time.time()

        spec = self.spec
        total_points = len(spec['figure']['vertices'])
        for first_index in range(len(spec['hole'])):
            first_hole_pt = spec['hole'][first_index]
            point_indices = list(range(total_points))
            random.shuffle(point_indices)
            for index in point_indices:
                if self.best_score == 0:
                    break
                print ('Trying connecting index={} to {}'.format(index, first_hole_pt))
                solution = {index: first_hole_pt}

                self.try_solve(solution)


def solve_and_submit(problem_id):
    print (f'Solving {problem_id}')

    spec = read_problem(problem_id)
    print (spec)
    print ('edges:', len(spec['figure']['edges']))
    print ('vertices:', len(spec['figure']['vertices']))

    inside = list(sorted(compute_inside_points(spec)))
    print ('inside points:', len(inside))

    solver = Solver(spec, inside)
    try:
        solver.full_solve()
    except TimeoutException:
        pass

    total_points = len(spec['figure']['vertices'])
    print ('[score = {}], best solution {}'.format(solver.best_score, solver.best_solution))
    if solver.best_score is None:
        return

    dislikes = count_dislikes(spec, solver.best_solution)

    solution_file = f'solutions/tmp/{problem_id}'

    # check if some solution already exist
    old_score = None
    if os.path.isfile(solution_file):
        with open(solution_file, 'r') as f:
            old_solution = json.loads(f.read())
            old_score = count_dislikes_from_submitted(spec, old_solution)

    if old_score is None or solver.best_score < old_score:
        print("[old score = {}] -> Overwriting".format(old_score))
        vertices = []
        for index in range(total_points):
            vertices.append(solver.best_solution[index])

        res = {'vertices' : vertices}
        js_str = json.dumps(res)
        with open(solution_file, 'w') as f:
            f.write(js_str)
        
        submit_solution(problem_id, js_str)
    else:
        print ('Skipping submit as this is not better')

if __name__ == "__main__":
    # problem_id = sys.argv[1]
    # solve_and_submit(problem_id)
    for i in range(26, 60):
        solve_and_submit(i)





