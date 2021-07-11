import inspect
import json
import math
import random

import pygame

import pymunk
import pymunk.pygame_util
from pymunk.vec2d import Vec2d

import sys

p_number = sys.argv[1]
# p_number= 87

# Read input.
with open(f"../problems/{p_number}", "r") as json_file:
    input = json.load(json_file)

# # read starting
# with open(f"../solutions/manual/75_dm_1625974946342", "r") as json_file:
#     start = json.load(json_file)
#     input["figure"]["vertices"] = start["vertices"]


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

figure_center = (
    float(sum([p[0] for p in figure_vertices]))/len(figure_vertices),
    float(sum([p[1] for p in figure_vertices]))/len(figure_vertices)
)

def scale_figure_v(v, c, s):
    dv = (v[0] - c[0], v[1] - c[1])
    return (c[0] + dv[0] * s, c[1] + dv[1] * s)

def vec_dist(p1, p2):
    return Vec2d(*p1).get_distance(Vec2d(*p2))

def vec_norm(v):
    l = vec_dist(v, [0, 0])
    if l < 0.0001:
        return [0, 0]
    return (v[0] / l, v[1] / l)

def vec_sub(v1, v2):
    return (v1[0] - v2[0], v1[1] - v2[1])

def vec_add(v1, v2):
    return (v1[0] + v2[0], v1[1] + v2[1])    

def vec_scale(v, s):
    return (v[0] * s, v[1] * s)

def vec_mid(vs):
    return (
        float(sum([v[0] for v in vs])) / len(vs),
        float(sum([v[1] for v in vs])) / len(vs),
    )


pygame.init()
screen = pygame.display.set_mode((1200, 1200))
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
    s.friction = 0
    s.elasticity = 0
    space.add(s)


def add_ball(space, pos, **kwargs):
    body = pymunk.Body(**kwargs)
    body.position = Vec2d(*pos)
    shape = pymunk.Circle(body, 1)
    shape.mass = 10
    shape.friction = 0
    shape.elasticity = 0
    space.add(body, shape)
    return body


def min_dist_hole_v(v):
    min_dist = 1000000
    min_hole_v = None
    for hv in hole:
        dist = Vec2d(*hv).get_distance(Vec2d(*v))
        if dist < min_dist:
            min_dist = dist
            min_hole_v = hv
    return min_hole_v

transformed_figure_vertices = []
for v in figure_vertices:
    new_v = scale_figure_v(v, figure_center, 0.2)
    new_v = (new_v[0], new_v[1] - 150)
    transformed_figure_vertices.append(new_v)

balls = []
for v in transformed_figure_vertices:
    b = add_ball(space, v)
    balls.append(b)

hole_balls = []
for h in hole:
    b = add_ball(space, h, body_type=pymunk.Body.STATIC)
    hole_balls.append(b)

for e in figure_edges:
    b1 = balls[e[0]]
    b2 = balls[e[1]]
    rest_len = Vec2d(*figure_vertices[e[0]]).get_distance(Vec2d(*figure_vertices[e[1]]))
    c = pymunk.DampedSpring(b1, b2, (0, 0), (0, 0), rest_len, 1000, 500)
    space.add(c)

# segments_with_springs = []

# def update_segments(create_objects=False):
#     # return

#     # global segments_with_springs
#     # for s in segments_with_springs:
#     #     space.remove(s)
#     # segments_with_springs = []

#     for i, e in enumerate(figure_edges):
#         b1 = balls[e[0]]
#         b2 = balls[e[1]]
#         if not create_objects:
#             spr_body, s, spr1, spr2 = segments_with_springs[i]
#         else:
#             spr_body = pymunk.Body()            
#             spr_body.position = b1.position
#             s = pymunk.Segment(
#                 spr_body,
#                 (0, 0),
#                 b2.position - b1.position,
#                 1)
#             s.mass = 1
#             s.friction = 0
#             s.elasticity = 0
#             spr1 = pymunk.DampedSpring(b1, spr_body, (0, 0), (0, 0), 0.1, 100, 0.5)
#             spr2 = pymunk.DampedSpring(b2, spr_body, (0, 0), b2.position - b1.position, 0.1, 100, 0.5)
#             space.add(spr_body, s, spr1, spr2)
#             segments_with_springs.append((spr_body, s, spr1, spr2))
#         # spr_body.position = b1.position
#         # # s.b = b2.position - b1.position
#         # spr2.anchor_b = b2.position - b1.position

# update_segments(create_objects=True)

# for ball in balls:
#     for hole_ball in hole_balls:
#         c = pymunk.DampedSpring(ball, hole_ball, (0, 0), (0, 0), 0.1, 1, 0.1)
#         space.add(c)

def save():
    result = []
    for i in range(len(figure_vertices)):
        p = balls[i].position
        result.append([int(p[0]/scale), int(p[1]/scale)])

    result_json = f"{{\"vertices\":{result}}}"
    print(result_json)

    with open(f"../solutions/pymonk/{p_number}", "w") as out:
        out.write(result_json + "\n")



REPEL_G = 1000
PULL_APART_F = 500
HOLE_G = 2000

num_balls = len(balls)

def repel_force(v, ball_positions):
    f_total = (0, 0)
    for p in ball_positions:
        dist = vec_dist(p, v) + 0.1
        if dist > 50:
            continue
        f = REPEL_G / (dist * dist)
        f_total = vec_add(f_total, vec_scale(vec_norm(vec_sub(p, v)), -f))
    return f_total


def pull_apart_force(v, ball_positions):
    ball_center = [
        float(sum([p[0] for p in ball_positions])) / num_balls,
        float(sum([p[1] for p in ball_positions])) / num_balls,
    ]
    f = PULL_APART_F  # * (1.0 - vec_dist(v, ball_center) / 500.0)
    return vec_scale(vec_norm(vec_sub(v, ball_center)), f)


def hole_pull_force(v, ball_positions):
    f_total = (0, 0)
    for p in hole:
        dist = vec_dist(p, v) + 0.1
        if dist > 100:
            continue
        f = HOLE_G / (dist * dist)
        f_total = vec_add(f_total, vec_scale(vec_norm(vec_sub(p, v)), f))
    return f_total

def all_forces(i, ball, ball_positions):
    forces = [
        pull_apart_force,
        # repel_force,
        hole_pull_force,
    ]
    result = (0, 0)
    for f in forces:
        result = vec_add(result, f(ball_positions[i], ball_positions))
    return result

def apply_forces():
    ball_positions = [b.position for b in balls]
    for i, ball in enumerate(balls):
        f = all_forces(i, ball, ball_positions)
        # print(f"[{i}] f={f}")
        ball.apply_force_at_local_point(f, (0, 0))

        # pygame.draw.lines(
        #     screen,
        #     (100, 0, 0),
        #     False,
        #     [ball.position, vec_add(ball.position, f)],
        #     1,
        # )

while True:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            exit()
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
            exit()
        elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            save()

    screen.fill(pygame.Color("white"))

    for i in range(20):
        # if i % 1 == 0:
        apply_forces()
        # update_segments()
        space.step(1.0 / 60)

    space.debug_draw(draw_options)
    pygame.display.flip()

    clock.tick(60)
    pygame.display.set_caption(f"fps: {clock.get_fps()}")
