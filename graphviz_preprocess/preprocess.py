import inspect
import json
import math
import random
import os

import pygame

import pymunk
import pymunk.pygame_util
from pymunk.vec2d import Vec2d

import sys

p_number = sys.argv[1] if len(sys.argv) > 1 else 106

# Read input.
with open(f"../problems/{p_number}", "r") as json_file:
    input = json.load(json_file)

hole =  input["hole"]
figure_vertices =  input["figure"]["vertices"]
figure_edges =  input["figure"]["edges"]

graph_lines = [
    "graph {",
]
for edge in figure_edges:
    edge_len = Vec2d(*figure_vertices[edge[0]]).get_distance(Vec2d(*figure_vertices[edge[1]]))
    graph_lines.append(f"{edge[0]} -- {edge[1]} [len={edge_len},penwidth=5]")
graph_lines.append("}")

with open("/tmp/graphviz_process.dot", "w") as dot_f:
    dot_f.write("\n".join(graph_lines) + "\n")

os.system("dot -Tplain -Kneato -o /tmp/graphviz_process.txt < /tmp/graphviz_process.dot")

with open("/tmp/graphviz_process.txt", "r") as graph_f:
    result_lines = graph_f.readlines()

result = [0] * len(figure_vertices)
for line in result_lines:
    if line.startswith("node "):
        parts = line.split(" ")
        i, x, y = parts[1:4]
        result[int(i)] = [int(float(x)), int(float(y))]

result_json = f"{{\"vertices\":{result}}}"
print(result_json)

with open(f"../solutions/graphviz/{p_number}", "w") as out:
    out.write(result_json + "\n")

