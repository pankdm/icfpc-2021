
import sys
import copy
from collections import defaultdict, deque
import json

from utils import read_problem
from solve import compute_inside_points, is_edge_inside

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

# for i in range(len(hole)):
#     print (i, (i + 1) % len(hole), dist2(hole[i], hole[(i + 1) % len(hole)]))

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


class WalkerSolver:
    def __init__(self, spec, problem_id):
        self.problem_id = problem_id
        self.spec = spec
        self.possible = {}
        self.adj = defaultdict(list)
        for (a, b) in sorted(self.spec['figure']['edges']):
            self.adj[a]
            self.adj[b]
            self.adj[a].append(b)
            self.adj[b].append(a)
        
        self.compute_hole_adjacency()
        # print ('Computing inside points')
        # inside_points, polygon = compute_inside_points(spec)
        # self.inside_points = inside_points
        # spec['hole_poly'] = polygon


    def prev(self, b):
        a = b - 1
        if a < 0:
            a = len(self.spec['hole']) - 1
        return a

    def next(self, a):
        hole = self.spec['hole']
        return (a + 1) % len(hole)

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

    def compute_intersection(self):
        hole = self.spec['hole']
        for a in range(len(hole)):
            prev_edge = (self.prev(a), a)
            next_edge = (a, self.next(a))
            possible_prev = set(self.possible[prev_edge].keys())
            possible_next = set(self.possible[next_edge].keys())
            print ('a = {}, possible = {}'.format(
                a, possible_prev.intersection(possible_next)
            ))

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

    def find_biggest_mapping(self, existing_solution):
        best_solution = {}
        hole = self.spec['hole']
        for a in range(len(hole)):
            if a in existing_solution:
                continue
            next_edge = (a, self.next(a))
            for v_idx in self.possible[next_edge].keys():
                if v_idx in existing_solution.values():
                    continue
                solution = self.run_bfs_from_mapping(existing_solution, a, v_idx)
                if len(solution) > 6:
                    # print ('a = {} to {} -> {}'.format(
                    #     a, v_idx, len(solution)
                    # ))
                    if len(solution) > len(best_solution):
                        best_solution = copy.copy(solution)
        return best_solution

    def check_partial_solution(self, solution, new_vertex, new_coords):
        spec = self.spec
        for adj_v in self.adj[new_vertex]:
            if adj_v not in solution:
                continue
            orig_dist = dist2(spec['figure']['vertices'][adj_v], spec['figure']['vertices'][new_vertex]) 
            try:
                new_dist = dist2(solution[adj_v], new_coords)
            except:
                import pdb; pdb.set_trace()
            if not check_distance(spec, orig_dist, new_dist) or not is_edge_inside(spec, solution[adj_v], new_coords):
                return False
        return True

    def find_best_point(self, v_id, v_in_solution, solution):
        all_pts = []
        for pt in self.inside_points:
            if self.check_partial_solution(solution, v_id, pt):
                all_pts.append(pt)

        if not all_pts:
            return None

        # find common points
        if len(v_in_solution) >= 1:
            a = v_in_solution[0]
            good_pt = None
            for c, c_pt in solution.items():
                if c in self.adj[a]:
                    good_pt = c_pt
                    break
            if good_pt is not None:
                pt = max(all_pts, key=lambda x: dist2(good_pt, x))
                return pt
        return all_pts[-1]

        

    def run_triangulation_impl(self, solution, threshold):
        while True:
            print ('running triangulation from {}'.format(solution))
            best_num_edges = 0
            best_v = None
            found = False
            for v_id in range(len(self.adj)):
                if v_id in solution:
                    continue
                num_edges = 0
                v_in_solution = []
                for next_v_id in self.adj[v_id]:
                    if next_v_id in solution:
                        num_edges += 1
                        v_in_solution.append(next_v_id)
                # if best_num_edges < num_edges:
                #     best_num_edges = num_edges
                #     best_v = v_id
                if num_edges >= threshold:
                    pt = self.find_best_point(v_id, v_in_solution, solution)
                    if pt is not None:
                        found = True
                        print ('Added vertex {} with {} edges, pt -> {}'.format(v_id, num_edges, pt))
                        solution[v_id] = pt
            if not found:
                break

    def run_triangulation(self, solution):
        self.run_triangulation_impl(solution, 2)
        self.run_triangulation_impl(solution, 1)



    def run_bfs(self):
        solution = {}
        # start_solution = self.run_bfs_from_mapping(solution, 14, 26)
        # for k, v in start_solution.items():
        #     solution[k] = v

        count = 0
        while True:
            print ('   solution = {}'.format(solution))
            best_solution = self.find_biggest_mapping(solution)
            print ('Count = {}, found longest n = {}, solution: {}'.format(count, len(best_solution), best_solution))
            if len(best_solution) == 0:
                break
            for k, v in best_solution.items():
                solution[k] = v
            count += 1
            if count > 6:
                break
        print ('walking solution = {}'.format(solution))
        vertices_dict = {}
        for (hole_idx, v_idx) in solution.items():
            vertices_dict[v_idx] = self.spec['hole'][hole_idx]

        # self.run_triangulation(vertices_dict)
        self.dump_solution(vertices_dict)                



    def run_bfs_from_mapping(self, existing_solution, hole_idx, v_idx):
        # mapping from hole idx to figure idx
        solution = {}
        solution[hole_idx] = v_idx
        a = hole_idx
        # solution[15] = 34
        # a = 15

        count = 0
    
        best_solution = solution

        q = deque()
        q.append((a, solution))
        while q:
            (a, solution) = q.popleft()
            # print ('count = {}, a = {}, solution = {}'.format(
            #     count, a, solution
            # ))
            if len(best_solution) < len(solution):
                best_solution = copy.copy(solution)

            b = self.next(a)
            v_a = solution[a]
            for v_b in self.possible[(a, b)].get(v_a, []):
                if v_b in existing_solution.values():
                    continue
                # print ('   a = {} v_a = {} checking v_b = {}'.format(
                #     a, v_a, v_b
                # ))
                if v_b not in solution.values():
                    next_solution = copy.copy(solution)
                    next_solution[b] = v_b
                    q.append((b, next_solution))
            count += 1

        # print ('best solution = {}'.format(best_solution))
        return best_solution
        # vertices_dict = {}
        # for (hole_idx, v_idx) in best_solution.items():
        #     vertices_dict[v_idx] = self.spec['hole'][hole_idx]
        # self.dump_solution(vertices_dict)


solver = WalkerSolver(spec, problem_id)
solver.run_bfs()
# solver.compute_intersection()


