import sys
from utils import read_problem
import json

from shapely.geometry import Point, Polygon

problem_id = sys.argv[1]
print (f'Solving {problem_id}')

spec = read_problem(problem_id)
print (spec)


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

def try_solve(spec, solution, inside_points):
    ok = check_partial_solution(spec, solution)
    if not ok:
        return False

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
        return True

    # find next possible point for b
    orig_dist = dist2(spec['figure']['vertices'][a], spec['figure']['vertices'][b])    
    for pt in inside_points:
        new_dist = dist2(solution[a], pt)
        if check_distance(spec, orig_dist, new_dist):
            solution[b] = pt
            found = try_solve(spec, solution, inside_points)
            if found:
                return True
            # otherwise restore previous state
            del solution[b]
    return False
        
inside = list(sorted(compute_inside_points(spec)))
print ('inside points:', len(inside))


first_hole_pt = spec['hole'][0]
total_points = len(spec['figure']['vertices'])

for index in range(total_points):
    print ('Trying connecting index={} to {}'.format(index, first_hole_pt))
    solution = {index: first_hole_pt}
    found = try_solve(spec, solution, inside)
    if found:
        print ('Writing solution', solution)
        with open(f'solutions/tmp/{problem_id}', 'w') as f:
            vertices = []
            for index in range(total_points):
                vertices.append(solution[index])
            res = {'vertices' : vertices}
            f.write(json.dumps(res))
        break