import inspect
import json
import math
import random
import os
import math

import pygame

import pymunk
import pymunk.pygame_util
from pymunk.vec2d import Vec2d

import sys

p_number = sys.argv[1] if len(sys.argv) > 1 else 106

# Read input.
with open(f"../problems/{p_number}", "r") as json_file:
    input = json.load(json_file)

epsilon =  float(input["epsilon"] + 1)/1000000
hole =  input["hole"]
figure_vertices =  input["figure"]["vertices"]
figure_edges =  input["figure"]["edges"]

hole_dists = []
for i, v1 in enumerate(hole):
    v2 = hole[(i + 1) % len(hole)]
    dist = Vec2d(*v1).get_distance(Vec2d(*v2))
    hole_dists.append(dist)

edge_lens = []
for edge in figure_edges:
    edge_len = Vec2d(*figure_vertices[edge[0]]).get_distance(Vec2d(*figure_vertices[edge[1]]))
    edge_lens.append(edge_len)

for hole_dist in hole_dists:
    matches = []
    best_eps = 1000
    for edge_len in edge_lens:
        eps = abs(hole_dist/edge_len - 1.0)
        if eps < best_eps:
            best_eps = eps
        if eps < epsilon:
            matches.append(edge_len)
    if matches:
        print(f"{hole_dist} -> {len(matches)} ({best_eps})")
    else:
        print(f"{hole_dist} NO MATCHES !!! ({best_eps})")