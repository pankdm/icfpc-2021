import inspect
import json
import math
import random

import pygame

import pymunk
import pymunk.pygame_util
from pymunk.vec2d import Vec2d

# Read input.
with open("../problems/4", "r") as json_file:
    input = json.load(json_file)

print(input)
hole =  input["hole"]
figure_vertices =  input["figure"]["vertices"]
figure_edges =  input["figure"]["edges"]

# scale
scale = 5
hole = [(p[0] * scale, p[1] * scale) for p in hole]
figure_vertices = [(p[0] * scale, p[1] * scale) for p in figure_vertices]

hole_center = (
    float(sum([p[0] for p in hole]))/len(hole),
    float(sum([p[1] for p in hole]))/len(hole)
)

def scale_figure_v(v, c, s):
    dv = (v[0] - c[0], v[1] - c[1])
    return (c[0] + dv[0] * s, c[1] + dv[1] * s)


pygame.init()
screen = pygame.display.set_mode((1200, 600))
clock = pygame.time.Clock()
font = pygame.font.Font(None, 24)


space = pymunk.Space()
space.gravity = (0.0, 0.0)
space.damping = 0.5
draw_options = pymunk.pygame_util.DrawOptions(screen)


# containers
# box_size = 200
# w = screen.get_width()
# h = screen.get_height()
for i, p1 in enumerate(hole):
    p2 = hole[(i + 1) % len(hole)]
    s = pymunk.Segment(space.static_body, p1, p2, 1)
    s.friction = 1
    s.elasticity = 0
    space.add(s)


def add_ball(space, pos, **kwargs):
    body = pymunk.Body(**kwargs)
    body.position = Vec2d(*pos)
    shape = pymunk.Circle(body, 2)
    shape.mass = 1
    shape.friction = 0.7
    shape.elasticity = 0
    space.add(body, shape)
    return body

balls = []
for v in figure_vertices:
    new_v = scale_figure_v(v, hole_center, 0.2)
    # new_v = (new_v[0] + random.randint(-5, 5), new_v[1] + random.randint(-5, 5))
    b = add_ball(space, new_v)
    balls.append(b)

hole_balls = []
for h in hole:
    b = add_ball(space, h, body_type=pymunk.Body.STATIC)
    hole_balls.append(b)

for e in figure_edges:
    b1 = balls[e[0]]
    b2 = balls[e[1]]
    rest_len = Vec2d(*figure_vertices[e[0]]).get_distance(Vec2d(*figure_vertices[e[1]]))
    c = pymunk.DampedSpring(b1, b2, (0, 0), (0, 0), rest_len, 500, 100)
    space.add(c)

# for ball in balls:
#     for hole_ball in hole_balls:
#         c = pymunk.DampedSpring(ball, hole_ball, (0, 0), (0, 0), 0.1, 1, 0.1)
#         space.add(c)


while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            exit()
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            exit()

    screen.fill(pygame.Color("white"))

    for _ in range(10): space.step(1.0 / 120)

    space.debug_draw(draw_options)
    pygame.display.flip()

    clock.tick(60)
    pygame.display.set_caption(f"fps: {clock.get_fps()}")
