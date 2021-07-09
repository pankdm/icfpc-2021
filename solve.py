import sys
from utils import read_problem
import shapely

problem_id = sys.argv[1]
print (f'Solving {problem_id}')

spec = read_problem(problem_id)
print (spec)


def is_inside(spec, x, y):
    pass

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
    
    for x in range(xmin, xmax + 1):
        for y in range(ymin, ymax + 1):
            if is_inside(spec, x, y):
                res.add((x, y))
    return res



# solution = {id -> [x, y]}
def check_partial_solution(spec, solution):
    # TODO: implement
    return True

def try_solve(spec, solution):
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
        assert (a in solution)
        if b in solution:
            continue
        assert (b not in solution)
        edge_to_add = a, b
        break
        
    # nothing to add - this is final answer
    if edge_to_add is None:
        return True

    # find next possible points for b


