
import copy
from utils import read_problem
import sys
from collections import defaultdict, deque


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



def get_hole_nodes():
    return [0, 1, 59, 60, 61, 62, 63]

def get_figure_nodes():
    return [21, 25, 40, 43, 42, 47, 51, 54, 57, 59, 58]

class ClickSolver:
    def __init__(self, spec):
        self.spec = spec
        self.adj = defaultdict(list)
        for (a, b) in sorted(self.spec['figure']['edges']):
            self.adj[a].append(b)
            self.adj[b].append(a)
        self.nodes = get_hole_nodes()
        self.v_nodes = get_figure_nodes()
        
    def check_graph_distances(self, solution, hole_idx, v_idx):
        reverse_mapping = {v: k for k, v in solution.items()}
        for next_v_idx in self.adj[v_idx]:
            if next_v_idx in solution.values():
                next_hole_idx = reverse_mapping[next_v_idx]
                v_pt =  self.spec['figure']['vertices'][v_idx]
                next_v_pt = self.spec['figure']['vertices'][next_v_idx]
                orig_dist = dist2(v_pt, next_v_pt)
                
                hole_pt = self.spec['hole'][hole_idx]
                next_hole_pt = self.spec['hole'][next_hole_idx]
                new_dist = dist2(hole_pt, next_hole_pt)
                if not check_distance(self.spec, orig_dist, new_dist):
                    return False
        return True


    def solve(self):
        start = {}

        q = deque()
        q.append(start)

        visited = set()
        count = 0
        while q:
            solution = q.popleft()
            if len(solution) == len(self.nodes):
                print ('====')
                print ('Found solution:')
                for k, v in sorted(solution.items()):
                    print ('  hole {} to {}'.format(k, v))
                # break
            # print ('count = {} -> solution = {}'.format(count, solution))
            for hole_idx in self.nodes:
                if hole_idx in solution:
                    continue
                for v_idx in self.v_nodes:
                    if v_idx in solution.values():
                        continue
                    # chek all adjacent
                    if not self.check_graph_distances(solution, hole_idx, v_idx):
                        continue
                    next_solution = copy.copy(solution)
                    next_solution[hole_idx] = v_idx
                    key = tuple(sorted(next_solution))
                    if key in visited:
                        continue
                    visited.add(key)
                    q.append(next_solution)
            count += 1


solver = ClickSolver(spec)
solver.solve()
