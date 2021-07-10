import os
import json

problems = os.listdir("../problems")
print(problems)

edges = []

for p in problems:
  with open(f"../problems/{p}", "r") as json_file:
    problem_json = json.load(json_file)
    for bonus in problem_json["bonuses"]:
      name = bonus["bonus"]
      bonus_problem = bonus["problem"]
      edges.append((int(p), bonus_problem, name))

lines = [
  "digraph G {",
]
for e in edges:
  lines.append(f"  {e[0]} -> {e[1]} [label=\"{e[2]}\"]")
lines.append("}")

with open(f"graph.dot", "w") as out:
  out.write("\n".join(lines) + "\n")
