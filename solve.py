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

TIMEOUT = 60 # seconds


def is_inside(polygon: Polygon, x, y):
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


def point_average(A: Tuple, B: Tuple, a=0.1) -> Tuple:
    # Get a point on line AB, 'a' fraction distance from A
    return ((1-a)*A[0]+a*B[0], (1-a)*A[1]+a*B[1])

def is_edge_inside(spec, A: Tuple, B: Tuple):
# Check if AB is fully within the hole
    if not all(is_inside(spec['hole_poly'], *point_average(A, B, a)) for a in (0.1, 0.3, 0.5, 0.7, 0.9)):
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
    res = list(res)
    random.shuffle(res)
    return res, polygon



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


def check_full_solution(spec, solution):
    if len(solution) != len(spec['figure']['vertices']):
        return False
    for v in range(1, len(solution)):
        for adj_v in spec['figure']['adj'][v]:
            orig_dist = dist2(spec['figure']['vertices'][adj_v], spec['figure']['vertices'][v]) 
            new_dist = dist2(solution[adj_v], solution[v])
            if not check_distance(spec, orig_dist, new_dist):
                print("Distance incorrect for edge: (", v, adj_v, ")", orig_dist, new_dist)
                return False
            if not is_edge_inside(spec, solution[adj_v], solution[v]):
                print("Edge is not inside:", v, adj_v)
                return False
    return True


class TimeoutException(Exception):
    pass


class Solver():
    def __init__(self, spec):
        self.spec = spec
        inside_points, polygon = compute_inside_points(spec)
        self.inside_points = inside_points
        spec['hole_poly'] = polygon
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
                print ("Found better score = {}".format(
                    score,
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

        # # start from some setup
        # with open('38_start') as f:
        #     start = json.loads(f.read())
        # solution = {}
        # for (idx, v) in enumerate(start['vertices']):
        #     if v in spec['hole']:
        #         solution[idx] = v
        # print ('start with {} nodes'.format(len(solution)))
        # self.try_solve(solution)

        hole_indices = list(range(len(spec['hole'])))
        random.shuffle(hole_indices)
        for first_index in hole_indices:
            first_hole_pt = spec['hole'][first_index]
            point_indices = list(range(total_points))
            random.shuffle(point_indices)
            for index in point_indices:
                if self.best_score == 0:
                    break
                print ('Trying connecting index={} to {}'.format(index, first_hole_pt))
                solution = {index: tuple(first_hole_pt)}

                self.try_solve(solution)


class GreedySolver:
    def __init__(self, spec, inside_points):
        self.spec = spec
        self.inside_points = inside_points
        self.best_score = None
        self.best_solution = None
        self.timer = None

        self.partial_solution = None

        # adjacency lists
        adj = defaultdict(list)
        for e in spec['figure']['edges']:
            adj[e[0]].append(e[1])
            adj[e[1]].append(e[0])
        spec['figure']['adj'] = adj

    def full_solve(self):
        # start the timer
        self.start = time.time()

        inside_pt = random.choice(self.inside_points)
        total_points = len(self.spec['figure']['vertices'])
        start_idx = random.choice(range(total_points))

        solution = {start_idx: inside_pt}
        self.try_solve(solution)

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
        min_edge_score = None
        min_pt = None

        for pt in self.inside_points:
            if check_partial_solution(spec, solution, b, pt):
                solution[b] = pt
                score = count_dislikes(spec, solution)
                if min_edge_score is None or score < min_edge_score:
                    min_edge_score = score
                    min_pt = pt
                del solution[b]

        self.partial_solution = copy.copy(solution)
        if min_pt is None:
            print ('At nodes={} -> nothing found'.format(len(solution)))                   
        else:
            print ('At nodes={} -> score = {}, solution = {}'.format(len(solution), min_edge_score, solution))
            solution[b] = min_pt
            self.try_solve(solution)


def write_solution(solution_file, total_points, solution):
    vertices = []
    for index in range(total_points):
        vertices.append(solution.get(index, [0, 0]))

    res = {'vertices' : vertices}
    js_str = json.dumps(res)
    with open(solution_file, 'w') as f:
        f.write(js_str)
    return js_str

def solve_and_submit(problem_id):
    print ('')
    print (f'=== Solving {problem_id} ====')

    spec = read_problem(problem_id)
    # print (spec)
    print ('edges:', len(spec['figure']['edges']))
    print ('vertices:', len(spec['figure']['vertices']))

    solver = Solver(spec)
    print ('inside points:', len(solver.inside_points))
    try:
        solver.full_solve()
    except TimeoutException:
        pass

    total_points = len(spec['figure']['vertices'])
    # write_solution(f'solutions/debug/{problem_id}', total_points, solver.partial_solution)

    if solver.best_score is None:
        print("No solution found")
        return
    print(f'[score = {solver.best_score}], best solution 0->{solver.best_solution[0]}, 1>{solver.best_solution[1]}, ...')

    dislikes = count_dislikes(spec, solver.best_solution)

    solution_file = f'solutions/tmp/{problem_id}'

    # check if some solution already exist
    old_score = None
    old_solution_valid = None
    if os.path.isfile(solution_file):
        with open(solution_file, 'r') as f:
            old_submission = json.loads(f.read())
            old_score = count_dislikes_from_submitted(spec, old_submission)
            old_submission = old_submission['vertices']
            old_solution = {i: old_submission[i] for i in range(len(old_submission))}
            old_solution_valid = check_full_solution(spec, old_solution)

    if old_score is None or solver.best_score < old_score:
        print("[old score = {}] -> Overwriting".format(old_score))
        js_str = write_solution(solution_file, total_points, solver.best_solution)
        submit_solution(problem_id, js_str)
    else:
        print('Skipping submit as this is not better')


def check_edge_length(spec, solution, edge):
    a, b = edge
    vertices = spec['figure']['vertices']
    orig_dist = dist2(vertices[a], vertices[b])
    new_dist = dist2(solution[a], solution[b])

    return check_distance(spec, orig_dist, new_dist)


def fix_edge(spec, solution, edge):
    a, b = edge
    vertices = spec['figure']['vertices']
    orig_dist = dist2(vertices[a], vertices[b])

    for dx in [0, 1, -1]:
        for dy in [0, 1, -1]:
            x, y = solution[b]
            new_dist = dist2(solution[a], [x + dx, y + dy])
            if check_distance(spec, orig_dist, new_dist):
                solution[b] = [x + dx, y + dy]
                return

    for dx in [0, 1, -1]:
        for dy in [0, 1, -1]:
            x, y = solution[a]
            new_dist = dist2([x + dx, y + dy], solution[b])
            if check_distance(spec, orig_dist, new_dist):
                solution[a] = [x + dx, y + dy]
                return


def round_coords(spec, solution):
    # coordinates should be ints
    for k in solution.keys():
        x, y = solution[k]
        solution[k] = [round(x), round(y)]


def try_to_fix_edges(spec, solution):
    edges = spec['figure']['edges']
    for edge in edges:
        if not check_edge_length(spec, solution, edge):
            fix_edge(spec, solution, edge)


def submit_manual(problem_id, solution_file_name):
    print(f'=== Submitting {problem_id} ====')

    spec = read_problem(problem_id)
    adj = defaultdict(list)
    for e in spec['figure']['edges']:
        adj[e[0]].append(e[1])
        adj[e[1]].append(e[0])

    spec['figure']['adj'] = adj
    hole_polygon = Polygon(spec['hole'])
    spec['hole_poly'] = hole_polygon

    if os.path.isfile(solution_file_name):
        with open(solution_file_name, 'r') as f:
            submission = json.loads(f.read())
            submission = submission['vertices']
            solution = {i: submission[i] for i in range(len(submission))}
            round_coords(spec, solution)

            solution_valid = check_full_solution(spec, solution)
            if not solution_valid:
                print("Trying to fix solution...")
                for _ in range(10):
                    try_to_fix_edges(spec, solution)
            solution_valid = check_full_solution(spec, solution)
            score = count_dislikes(spec, solution)
            print("Solution valid:", solution_valid)
            print("Score:", score)

            if solution_valid:
                vertices = len(spec['figure']['vertices'])
                js_str = write_solution(solution_file_name, vertices, solution)
                submit_solution(problem_id, js_str)
    pass


if __name__ == "__main__":
    if len(sys.argv)==3:
        problem_id = sys.argv[1]
        file_name = sys.argv[2]
        submit_manual(problem_id, file_name)
    elif len(sys.argv)==2:
        problem_id = sys.argv[1]
        solve_and_submit(problem_id)
    else:
        for i in (50, 54, 55, 67, 70, 73, 77):
            solve_and_submit(i)






