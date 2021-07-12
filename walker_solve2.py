
import sys
import copy
from collections import defaultdict, deque
import json

from utils import read_problem
from solve import check_partial_solution, compute_inside_points, is_edge_inside

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


def find_all_pairs(spec, new_dist):
    v = spec['figure']['vertices']
    res = defaultdict(list)
    ls = []
    for (a, b) in sorted(spec['figure']['edges']):
        orig_dist = dist2(v[a], v[b])
        if check_distance(spec, orig_dist, new_dist):
            res[a].append(b)
            res[b].append(a)
            ls.append((a, b))
    return (res, ls)


class WalkerSolver2:
    def __init__(self, spec, problem_id):
        self.problem_id = problem_id
        self.spec = spec
        self.possible = {}
        self.adj = defaultdict(list)
        self.compute_hole_adjacency()

        for (a, b) in sorted(self.spec['figure']['edges']):
            self.adj[a].append(b)
            self.adj[b].append(a)
        
    def prev(self, b):
        a = b - 1
        if a < 0:
            a = len(self.spec['hole']) - 1
        return a

    def next(self, a):
        hole = self.spec['hole']
        return (a + 1) % len(hole)


    def check_partial_solution(self, solution):
        vertices_dict = {}
        for (hole_idx, v_idx) in solution.items():
            vertices_dict[v_idx] = self.spec['hole'][hole_idx]
        
        for (v_idx, pt) in vertices_dict.items():
            for next_v_idx in self.adj[v_idx]:
                if next_v_idx in vertices_dict:
                    next_pt = vertices_dict[next_v_idx]
                    new_dist = dist2(pt, next_pt)
                    orig_dist = dist2(
                        self.spec['figure']['vertices'][v_idx], 
                        self.spec['figure']['vertices'][next_v_idx]
                    )
                    if not check_distance(self.spec, orig_dist, new_dist):
                        return False
        return True


    def compute_hole_adjacency(self):
        hole = self.spec['hole']
        for i in range(len(hole)):
            a = i
            b = self.next(a)
            d = dist2(hole[a], hole[b])
            # print (i, (i + 1) % len(hole), d)
            res, ls = find_all_pairs(self.spec, d)
            # print ('hole from', a, 'to', b, '->', ls)
            self.possible[(a, b)] = res
            self.possible[(b, a)] = res
    
    def dump_solution(self, vertices_dict):
        vertices = []
        for v_idx, v_pt in enumerate(self.spec['figure']['vertices']):
            if v_idx in vertices_dict:
                vertices.append(vertices_dict[v_idx])
            else:
                vertices.append(v_pt)
        res = {'vertices' : vertices}
        js_str = json.dumps(res)
        file_name = "solutions/debug/{}".format(self.problem_id)
        print ('Writing result to {}'.format(file_name))
        with open(file_name, 'w') as f:
            f.write(js_str)

    def run_through_all(self, solution):
        hole = self.spec['hole']
        dist = defaultdict(set)
        for hole_idx in range(len(hole)):
            for v_idx in self.adj:   
                if hole_idx in solution or v_idx in solution.values():
                    continue          
                self.run_bfs_from_mapping(solution, hole_idx, v_idx, dist)

        max_dist = max(dist.keys())
        count = len(dist[max_dist])
        print ('{} solutions of max length {}:'.format(count, max_dist))
        for s in dist[max_dist]:
            print (' >> {}'.format(s))
        return list(dist[max_dist])[0]

    def run_bfs(self):
        solution = {}
        dist = defaultdict(set)

        solution = self.run_bfs_from_mapping(solution, 40, 88, dist)
        vertices_dict = {}
        for (hole_idx, v_idx) in solution.items():
            vertices_dict[v_idx] = self.spec['hole'][hole_idx]

        solution = self.run_bfs_from_mapping(solution, 2, 14, dist)
        vertices_dict = {}
        for (hole_idx, v_idx) in solution.items():
            vertices_dict[v_idx] = self.spec['hole'][hole_idx]

        solution = self.run_bfs_from_mapping(solution, 28, 89, dist)
        vertices_dict = {}
        for (hole_idx, v_idx) in solution.items():
            vertices_dict[v_idx] = self.spec['hole'][hole_idx]



        self.dump_solution(vertices_dict)   
        self.run_through_all(solution)             



    def run_bfs_from_mapping(self, solution, hole_idx, v_idx, dist):
        solution = copy.copy(solution)
        # mapping from hole idx to figure idx
        solution[hole_idx] = v_idx
        start = hole_idx

        visited = set()
        
        best_solution = solution

        q = deque()
        q.append((start, solution))        
        while q:
            (now, solution) = q.popleft()
            v_now = solution[now]
            edges = [(now, self.next(now)), (now, self.prev(now))]
            for (a, b) in edges:
                for v_next in self.possible[(a, b)].get(v_now, []):
                    if b in solution or v_next in solution.values():
                        continue
                    next = b
                    next_solution = copy.copy(solution)
                    next_solution[b] = v_next
                    key = tuple(sorted(next_solution.items()))
                    if key in visited:
                        continue
                    if not self.check_partial_solution(solution):
                        continue
                    visited.add(key)
                    q.append((next, next_solution))
                    dist[len(next_solution)].add(key)
                    if len(best_solution) < len(solution):
                        best_solution = solution

        return best_solution





solver = WalkerSolver2(spec, problem_id)
solver.run_bfs()
