#!/usr/bin/env python3

import os

from typing import Tuple

from shapely.geometry import Point, Polygon
import shutil

from utils import read_problem, read_json


LAST_PROBLEM = 132
EPSILON = 1e-6

DEBUG = True

def dist2(pt1, pt2):
    x1, y1 = pt1
    x2, y2 = pt2
    return (x1 - x2) ** 2 + (y1 - y2) ** 2


def check_distance(spec, orig_dist, new_dist):
    if abs(new_dist - orig_dist) * 10**6 <= spec['epsilon'] * orig_dist:
        return True
    return False


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


def is_inside(polygon: Polygon, x, y, eps = 0):
    if eps == 0:
        pt = Point(x, y)
        return polygon.contains(pt) or polygon.touches(pt)
    else:
        # allow for floating point errors
        return any(polygon.contains(Point(x+dx, y+dy)) or polygon.touches(Point(x+dx, y+dy)) for dx in (eps, 0, -eps) for dy in (eps, 0, -eps) )


def point_average(A: Tuple, B: Tuple, a=0.1) -> Tuple:
    # Get a point on line AB, 'a' fraction distance from A
    return ((1-a)*A[0]+a*B[0], (1-a)*A[1]+a*B[1])

def is_edge_not_overlapping_hole(spec, A: Tuple, B: Tuple):
    for i, v in enumerate(spec['hole']):
        if i == 0:
            continue
        v_prev = spec['hole'][i-1]
        if segment_intersect(v_prev, v, A, B):
            # print ('intersect', v_prev, v, A, B)
            return False
    if segment_intersect(spec['hole'][-1], spec['hole'][0], A, B):
        return False
    return True


def is_edge_inside(spec, A: Tuple, B: Tuple):
    # Check if AB is fully within the hole
    vals = [is_inside(spec['hole_poly'], *point_average(A, B, a), EPSILON) for a in (0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1)]
    if not all(vals):
        # print ('not all inside: ', vals)
        return False
    return is_edge_not_overlapping_hole(spec, A, B)

def validate_solution(spec, solution):
    if 'vertices' not in solution:
        return False
    new_vertices = solution['vertices']
    old_vertices = spec['figure']['vertices']

    # check that coordinates integers
    for (x, y) in new_vertices:
        if x != round(x) or y != round(y):
            if DEBUG:
                print ('  Coordinates ({}, {}) are not integers'.format(x, y))
            return False

    # check distances
    for (a, b) in spec['figure']['edges']:
        orig_dist = dist2(old_vertices[a], old_vertices[b])
        new_dist = dist2(new_vertices[a], new_vertices[b])
        ok = check_distance(spec, orig_dist, new_dist)
        if not ok:
            if DEBUG:
                print ('  Edge ({}, {}) has wrong size: {} (orig={})'.format(
                    a, b, new_dist, orig_dist))
            return False
    
    # check that all edges are not intersecting
    for (a, b) in spec['figure']['edges']:
        A = new_vertices[a]
        B = new_vertices[b]
        if not is_edge_inside(spec, A, B):
            if DEBUG:
                print ('  Edge {}-{} ({} to {}) is not inside'.format(a, b, A, B))
            return False

    return True


def count_dislikes(spec, solution):
    total_dislikes = 0
    for hole_pt in spec['hole']:
        min_dist = min(dist2(hole_pt, pt) for pt in solution['vertices'])
        total_dislikes += min_dist
    return total_dislikes

def main():
    solutions = {}
    for i in range(1, LAST_PROBLEM + 1):
        i_str = str(i)
        solutions[i_str] = []

    for (dirpath, dirnames, filenames) in os.walk("solutions/"):
        # print (dirpath, dirnames, filenames)
        for file in filenames:
            full_path = os.path.join(dirpath, file)
            # skip golden solutions
            if 'golden' in full_path:
                continue
            problem_id = file.split('_', 1)[0]
            if problem_id in solutions:
                solutions[problem_id].append(full_path)
                
    for i in range(1, LAST_PROBLEM + 1):
        i_str = str(i)
        print ('i={}, num={} -> {}'.format(i, len(solutions[i_str]), solutions[i_str]))
        spec = read_problem(i)
        spec['hole_poly'] = Polygon(spec['hole'])

        best_dislikes = None
        best_file = None

        for file in solutions[i_str]:
            if DEBUG:
                print('processing {}'.format(file))
            solution = read_json(file)
            ok = validate_solution(spec, solution)
            if ok:
                dislikes = count_dislikes(spec, solution)
                if DEBUG:
                    print ('  solution {} is OK, dislikes = {}'.format(file, dislikes))
                if best_dislikes is None or dislikes < best_dislikes:
                    best_dislikes = dislikes
                    best_file = file

        if best_dislikes is not None:
            print ('  best solution = {} ({})'.format(best_dislikes, best_file))
            shutil.copyfile(best_file, f"solutions/golden/{i}")

# def test_intersect():


if __name__ == "__main__":
    main()