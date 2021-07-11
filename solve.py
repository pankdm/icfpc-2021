#!/usr/bin/env python3
import sys
from typing import Tuple
from collections import defaultdict
import json
from math import *
import copy
import random
import time
import math
import itertools

import os.path

from shapely.geometry import Point, Polygon

from utils import read_problem
from get_problems import submit_solution

from networkx import nx


from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('init_path', None, 'Path to a solution file to seed initial vertices.')


TIMEOUT = 60 # seconds
eps = 1e-6


def is_inside(polygon: Polygon, x, y, eps = 0):
    if eps == 0:
        pt = Point(x, y)
        return polygon.contains(pt) or polygon.touches(pt)
    else:
        # allow for floating point errors
        return any(polygon.contains(Point(x+dx, y+dy)) for dx in (eps, -eps) for dy in (eps, -eps) )

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
    if not all(is_inside(spec['hole_poly'], *point_average(A, B, a), eps) for a in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1)):
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
    boundary = polygon.boundary
    res.sort(key=lambda p: boundary.distance(Point(p)))
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

def check_distance_with_eps(orig_dist, new_dist, epsilon):
    if abs(1.0 * new_dist / orig_dist - 1) <= epsilon:
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


def compute_edge_lens(spec):
    hole = spec["hole"]
    hole_edges = [dist2(hole[i], hole[i-1]) for i in range(1, len(hole))]
    hole_edges.append(dist2(hole[0], hole[-1]))
    spec["hole_edge_lens"] = hole_edges

    figure = spec["figure"]
    edges, vtx = figure["edges"], figure["vertices"]
    fig_edges = [dist2(vtx[edges[i][0]], vtx[edges[i][1]]) for i in range(len(edges))]
    epsilon = spec["epsilon"]
    fig_edges_min_max = [(edge*(1-epsilon/1e6/5), edge*(1+epsilon/1e6/5)) for edge in fig_edges]
    figure["edges_min_max_lens"] = fig_edges_min_max

    fig_vtx_lens = [set() for i in range(len(vtx))]
    for i, e in enumerate(edges):
        for a in (0, 1):
            fig_vtx_lens[e[a]].add(fig_edges_min_max[i])
    figure["vtx_min_max_lens"] = fig_vtx_lens

class Solver():
    def __init__(self, spec, len_matching=False):
        self.spec = spec
        inside_points, polygon = compute_inside_points(spec)
        self.inside_points = inside_points
        self.inside_points_set = set(inside_points)
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

        self.len_matching = len_matching
        if len_matching:
            compute_edge_lens(spec)

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
                if time.time() - self.start_fig_vtx > 2: # 2 sec timeout per start fig vtx
                    return False
                # otherwise restore previous state
                if self.best_score == 0: break
                del solution[b]
        return False

    def full_solve(self):
        # start the timer
        self.start = time.time()
        

        spec = self.spec
        num_fig_vtx = len(spec['figure']['vertices'])

        # start from some setup
        # with open('solutions/manual/59_dm_start_1625956775678') as f:
        #     start = json.loads(f.read())
        # solution = {}
        # for (idx, v) in enumerate(start['vertices']):
        #     if v in spec['hole']:
        #         solution[idx] = v
        # print ('start with {} nodes'.format(len(solution)))
        # self.try_solve(solution)

        hole_indices = list(range(len(spec['hole'])))
        random.shuffle(hole_indices)
        for hole_idx in hole_indices:
            first_hole_pt = spec['hole'][hole_idx]
            fig_vtcs = list(range(num_fig_vtx))
            random.shuffle(fig_vtcs)
            for fig_vtx in fig_vtcs:
                if self.len_matching:
                    if (not any(mi<=spec["hole_edge_lens"][hole_idx]<=ma for mi, ma in spec["figure"]["vtx_min_max_lens"][fig_vtx])
                    and not any(mi<=spec["hole_edge_lens"][hole_idx-1]<=ma for mi, ma in spec["figure"]["vtx_min_max_lens"][fig_vtx])):
                        continue
                if self.best_score == 0:
                    break
                self.start_fig_vtx = time.time()
                print ('Trying connecting figure vtx={} to hole vtx {}'.format(fig_vtx, hole_idx))
                solution = {fig_vtx: tuple(first_hole_pt)}

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

class Solution:
    def __init__(self, num_vertices):
        self.vertices = [None] * num_vertices
        self.num_vertices = num_vertices
        self.placed = set()
        self.placement_order = []
        self.next = 0

    def place(self, i, pt):
        print(f"Placing {i} at {pt} (already placed {len(self.placed)})")
        self.vertices[i] = pt
        self.placed.add(i)

    def print(self):
        result = [list(pt) if pt is not None else [0,0] for pt in self.vertices]
        result_json = f"{{\"vertices\":{result}}}"
        print(result_json)

    def write_to_file(self, file_name):
        result = [list(pt) if pt is not None else [0,0] for pt in self.vertices]
        result_json = f"{{\"vertices\":{result}}}"
        with open(file_name, 'wt') as f:
            f.write(result_json)




class IntegralSolver:
    def __init__(self, spec, initial_solution, problem_id):
        self.spec = spec
        self.problem_id = problem_id

        self.partial_solution = None
        self.initial_solution = initial_solution

        inside_points, polygon = compute_inside_points(spec)
        self.inside_points = inside_points
        self.inside_points_set = set(inside_points)


        if initial_solution and not initial_solution.placed:
            new_placed = set()
            for vi, v in enumerate(initial_solution.vertices):
                if v in self.inside_points_set:
                    new_placed.add(vi)
                else:
                    initial_solution.vertices[vi] = None
            initial_solution.placed = new_placed

        spec['hole_poly'] = polygon
        self.best_score = None
        self.best_solution = None
        self.timer = None

        figure = spec["figure"]
        edges, vtx = figure["edges"], figure["vertices"]
        self.edges = edges
        self.vertices = vtx
        print(f"self.vertices = {self.vertices}")
        self.epsilon = spec["epsilon"] / 1000000.0

        # adjacency lists
        graph = nx.Graph()
        for e in spec['figure']['edges']:
            graph.add_edge(e[0], e[1], dist=dist2(vtx[e[0]], vtx[e[1]]))
        self.graph = graph

        self.initial_points = [
            pt for pt in spec['hole']
        ] + self.inside_points
        # print(f"initial_points = {self.initial_points}")
        # exit()

    def get_placement_order_by_placed_neibs(self, i):
        if self.initial_solution:
            result = []
            placed = set(self.initial_solution.placed)
        else:
            result = [i]
            placed = {i}

        while len(placed) < len(self.vertices):
            best_num_placed = 0
            best_n = -1
            for n in self.graph:
                if n in placed:
                    continue
                num_placed = 0
                for n2 in self.graph[n]:
                    if n2 in placed:
                        num_placed += 1
                if num_placed > best_num_placed:
                    best_num_placed = num_placed
                    best_n = n
            if best_n == -1:
                print(f"placed = {placed} {len(placed)} {len(self.vertices)}")
            assert best_n != -1
            result.append(best_n)
            placed.add(best_n)
        return result


    def full_solve(self):
        if self.initial_solution:
            solution = self.initial_solution
            solution.placement_order = self.get_placement_order_by_placed_neibs(0)  # 0 is ignored
            print(f"placement_order = {solution.placement_order}")
            solution.next = 0

            try:
                self.try_solve(solution)
            except KeyboardInterrupt:
                solution.print()

        else:
            # Try all initial positions.
            solution = Solution(len(self.vertices))
            for i in range(len(self.vertices)):
                print(f"Starting from figure vertex {i}")
                # solution.placement_order = [i] + list(itertools.chain.from_iterable(t[1] for t in nx.bfs_successors(self.graph, i)))
                # solution.placement_order = list(nx.dfs_preorder_nodes(self.graph, i))
                solution.placement_order = self.get_placement_order_by_placed_neibs(i)
                print(f"placement_order = {solution.placement_order}")
                solution.next = 0
                assert(len(solution.placement_order) == solution.num_vertices)

                try:
                    self.try_solve(solution)
                except KeyboardInterrupt:
                    solution.print()


    def try_solve(self, solution):
        if len(solution.placed) == solution.num_vertices:
            # Done.
            solution.print()
            solution.write_to_file(f"solutions/solver/{self.problem_id}")
            print(f"Found solution!")
            exit()

        next_to_place = solution.placement_order[solution.next]
        assert next_to_place not in solution.placed

        # Advance.
        solution.next += 1
        assert solution.next >= len(solution.placement_order) or solution.placement_order[solution.next] not in solution.placed

        if not solution.placed:
            # first the first one
            for pt in self.initial_points:
                solution.place(next_to_place, pt)
                self.try_solve(solution)
        else:
            # some neighbors already placed
            viable_points = None
            neibs = []
            for neib in self.graph[next_to_place]:
                if neib in solution.placed:
                    neibs.append(neib)
                    neib_dist = self.graph[neib][next_to_place]["dist"]

                    viable_points = viable_adj_points_with_candidates(
                        solution.vertices[neib], neib_dist, self.epsilon, viable_points=viable_points,
                        bounds_check_fn = lambda pt: (
                            pt in self.inside_points_set and  # fast
                            is_edge_inside(self.spec, solution.vertices[neib], pt)  # slow
                        ))


            print(f"viable_points for {next_to_place} (neibs {neibs}): {viable_points}\nplaced={solution.placed}")

            # Must have at least one neib that's placed already.
            assert viable_points is not None

            if viable_points:
                for pt in viable_points:
                    solution.place(next_to_place, pt)

                    # # validation (optional)
                    # for neib in self.graph[next_to_place]:
                    #     if neib in solution.placed:
                    #         neib_dist = self.graph[neib][next_to_place]["dist"]
                    #         if not check_edge_length(self.spec, solution.vertices, (neib, next_to_place)):
                    #             print(f"check_edge_length failed for {neib} with dist {neib_dist}")
                    #             assert False
                    #         if not is_edge_inside(self.spec, solution.vertices[neib], pt):
                    #             print(f"is_edge_inside failed for {neib}")
                    #             assert False

                    self.try_solve(solution)

        # Backoff.
        if solution.vertices[next_to_place] is not None:
            solution.vertices[next_to_place] = None
            solution.placed.remove(next_to_place)
        solution.next -= 1


def write_solution(solution_file, total_points, solution):
    vertices = []
    for index in range(total_points):
        vertices.append(solution.get(index, [0, 0]))

    res = {'vertices' : vertices}
    js_str = json.dumps(res)
    with open(solution_file, 'w') as f:
        f.write(js_str)
    return js_str

def load_initial_solution(spec, path):
    with open(path) as f:
        solution_json = json.loads(f.read())

    vertices = solution_json["vertices"]

    solution = Solution(len(vertices))
    solution.vertices = [tuple(v) for v in vertices]

    return solution

def solve_and_win(problem_id):
    print ('')
    print (f'=== Solving {problem_id} ====')

    spec = read_problem(problem_id)
    # print (spec)
    print ('edges:', len(spec['figure']['edges']))
    print ('vertices:', len(spec['figure']['vertices']))

    initial_solution = None
    if FLAGS.init_path:
        initial_solution = load_initial_solution(spec, FLAGS.init_path)

    solver = IntegralSolver(spec =spec, initial_solution =initial_solution, problem_id=problem_id)
    print ('inside points:', len(solver.inside_points))
    try:
        solver.full_solve()
    except TimeoutException:
        pass

def solve_and_submit(problem_id):
    print ('')
    print (f'=== Solving {problem_id} ====')

    spec = read_problem(problem_id)
    # print (spec)
    print ('edges:', len(spec['figure']['edges']))
    print ('vertices:', len(spec['figure']['vertices']))

    solver = Solver(spec, len_matching=True)
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
    print(f"orig_dist {orig_dist} new_dist {new_dist}")

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

_VIABLE_ADJ_POINTS = {}

def viable_adj_points(origin, len2, epsilon, bounds_check_fn=None):
    """Returns a list of int points within dist and eps."""
    cache_key = (origin[0], origin[1], int(len2 * 1000000), int(epsilon * 1000000))
    if cache_key in _VIABLE_ADJ_POINTS:
        return _VIABLE_ADJ_POINTS[cache_key]

    vectors = viable_vectors(len2, epsilon)
    points = []
    x, y = origin
    points += [(x + px, y + py) for (px, py) in vectors]
    points += [(x + px, y - py) for (px, py) in vectors]
    points += [(x - px, y + py) for (px, py) in vectors]
    points += [(x - px, y - py) for (px, py) in vectors]

    if bounds_check_fn:
        points = [p for p in points if bounds_check_fn(p)]

    _VIABLE_ADJ_POINTS[cache_key] = points

    return points

def viable_adj_points_with_candidates(origin, dist_2, epsilon, viable_points = None, bounds_check_fn = None):
    """Returns a list of int points within dist and eps, with some candidates."""
    if viable_points is not None:
        result = [
            pt 
            for pt in viable_points
            if check_distance_with_eps(orig_dist=dist_2, new_dist=dist2(origin, pt), epsilon=epsilon)
        ]
        return result

    return viable_adj_points(origin, dist_2, epsilon, bounds_check_fn=bounds_check_fn)


_VIABLE_VECTORS_CACHE = {}

def viable_vectors(len2, epsilon):
    cache_key = (int(len2 * 1000000), int(epsilon * 1000000))
    if cache_key in _VIABLE_VECTORS_CACHE:
        return _VIABLE_VECTORS_CACHE[cache_key]

    low2, high2 = len2 * (1 - epsilon), len2 * (1 + epsilon)
    high = floor(high2 ** 0.5)
    x, x2 = 0, 0
    vectors = []
    # print(low2, high2, high)
    while x2 <= high2:
        while high >= 0 and x2 + high * high > high2:
            high -= 1
        y = high
        while y >= 0 and x2 + y * y >= low2:
            if check_distance_with_eps(orig_dist=len2, new_dist=dist2((0, 0), (x, y)), epsilon=epsilon):
                vectors.append((x, y))
            y -= 1
        x += 1
        x2 = x * x

    _VIABLE_VECTORS_CACHE[cache_key] = vectors

    return vectors


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


def main(argv):
    problem_id = sys.argv[1]
    solve_and_win(problem_id)

if __name__ == '__main__':
  app.run(main)

# if __name__ == "__main__":
#     # if len(sys.argv)==3:
#     #     problem_id = sys.argv[1]
#     #     file_name = sys.argv[2]
#     #     submit_manual(problem_id, file_name)
#     # elif len(sys.argv)==2:
#         problem_id = sys.argv[1]
#         solve_and_win(problem_id)
#     # else:
#     #     for i in (50, 54, 55, 67, 70, 73, 77):
#     #         solve_and_submit(i)

