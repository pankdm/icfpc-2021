
from utils import read_problem
import sys


problem_id = sys.argv[1]
spec = read_problem(problem_id)


def check_distance(spec, orig_dist, new_dist):
    if abs(1.0 * new_dist / orig_dist - 1) <= spec['epsilon'] / 10**6:
        return True
    return False


def dist2(pt1, pt2):
    x1, y1 = pt1
    x2, y2 = pt2
    return (x1 - x2) ** 2 + (y1 - y2) ** 2

hole = spec['hole']
# for i in range(len(hole)):
#     print (i, (i + 1) % len(hole), dist2(hole[i], hole[(i + 1) % len(hole)]))

print ("======")

def find_all_pairs(new_dist):
    v = spec['figure']['vertices']
    res = []
    for (a, b) in sorted(spec['figure']['edges']):
        orig_dist = dist2(v[a], v[b])
        if check_distance(spec, orig_dist, new_dist):
            res.append((a, b))
    return res


for i in range(len(hole)):
    a = i
    b = (i + 1) % len(hole)
    d = dist2(hole[a], hole[b])
    # print (i, (i + 1) % len(hole), d)
    res = find_all_pairs(d)
    print ('hole from', a, 'to', b, '->', res)
    
