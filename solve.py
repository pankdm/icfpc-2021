#!/usr/bin/env python3
import sys
from typing import Tuple
from collections import defaultdict
import json
import copy
import random
import time

import os.path

from shapely.geometry import Point, Polygon

from utils import read_problem
from get_problems import submit_solution

TIMEOUT = 15 # seconds


def is_inside(polygon, x, y):
    pt = Point(x, y)
    return polygon.contains(pt) or polygon.touches(pt)

def dist2(pt1, pt2):
    x1, y1 = pt1
    x2, y2 = pt2
    return (x1 - x2) ** 2 + (y1 - y2) ** 2


def ccw(A: Tuple, B: Tuple, C: Tuple):
    # True if A, B, C are in counter-clockwise order
    # Source https://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
    return (C[1]-A[1])*(B[0]-A[0]) > (B[1]-A[1])*(C[0]-A[0])


def segment_intersect(A: Tuple, B: Tuple, C: Tuple, D: Tuple) -> bool:
    # Check if AB strictly intersects CD
    if A in (C, D) or B in (C, D):
        # Two edges share a vertex - no strict intersection
        return False
    return (ccw(A, C, D) + ccw(B, C, D) == 1 and ccw(A, D, C) + ccw(B, D, C) == 1
            and ccw(A, B, C) + ccw(A, B, D) == 1 and ccw(A, C, B) + ccw(A, D, B) == 1)

def test_intersect():
    a,b,c,d,e = (0,0), (0,2), (2,2), (2,0), (1,1)
    assert not segment_intersect(a,b,c,d)
    assert segment_intersect(a,c,b,d)
    assert not segment_intersect(a,c,e,b) # vertex inside the other edge
    assert not segment_intersect(a,b,a,d)
    assert not segment_intersect(a,d,a,b)
    assert not segment_intersect(a,c,a,c)

polygon = None


def point_average(A: Tuple, B: Tuple, a=0.1) -> Tuple:
    # Get a point on line AB, 'a' fraction distance from A
    return ((1-a)*A[0]+a*B[0], (1-a)*A[1]+a*B[1])

def is_edge_inside(spec, A: Tuple, B: Tuple):
# Check if AB is fully within the hole
    if not all(is_inside(polygon, *point_average(A, B, a)) for a in (0.1, 0.3, 0.5, 0.7, 0.9)):
        return False
    for i, v in enumerate(spec['hole']):
        if i == 0:
            continue
        v_prev = spec['hole'][i-1]
        if segment_intersect(v_prev, v, A, B):
            return False
    if segment_intersect(spec['hole'][-1], spec['hole'][0], A, B):
        return False
    return True

def compute_inside_points(spec):
    global polygon
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
def check_partial_solution(spec, solution, new_vertex, new_coords):
    for adj_v in spec['figure']['adj'][new_vertex]:
        if adj_v not in solution:
            continue
        orig_dist = dist2(spec['figure']['vertices'][adj_v], spec['figure']['vertices'][new_vertex]) 
        new_dist = dist2(solution[adj_v], new_coords)
        if not check_distance(spec, orig_dist, new_dist) or not is_edge_inside(spec, solution[adj_v], new_coords):
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
        # adjacency lists
        adj = defaultdict(list)
        for e in spec['figure']['edges']:
            adj[e[0]].append(e[1])
            adj[e[1]].append(e[0])
        spec['figure']['adj'] = adj

    def try_solve(self, solution):
        spec = self.spec

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
            if check_partial_solution(spec, solution, b, pt):
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
                solution = {index: tuple(first_hole_pt)}

                self.try_solve(solution)


def solve_and_submit(problem_id):
    print (f'=== Solving {problem_id} ====')

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
    if len(sys.argv)==2:
        problem_id = sys.argv[1]
        solve_and_submit(problem_id)
    else:
        for i in range(44, 64):
            solve_and_submit(i)





