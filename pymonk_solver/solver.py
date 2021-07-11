import inspect
import json
import math
import random

import pygame

import pymunk
import pymunk.pygame_util
from pymunk.vec2d import Vec2d

import sys

from absl import app
from absl import flags

FLAGS = flags.FLAGS

flags.DEFINE_string('init_path', None, 'Path to a solution file to seed initial vertices.')
flags.DEFINE_float('world_scale', 1.0, 'World scale')
flags.DEFINE_float('scale', None, 'Scale for initial vertices (rel. to mid point).')
flags.DEFINE_string('move', None, 'Translation "dx, dy" for initial vertices.')


DEFAULT_PROBLEM = 106

REPEL_G = 1000
PULL_APART_F = 500
HOLE_G = 2000


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
    l = len(vs)
    return (
        float(sum([v[0] for v in vs])) / l,
        float(sum([v[1] for v in vs])) / l,
    )

def vec_scale_all(vectors, center, scale):
    return [
        vec_add(center, vec_scale(vec_sub(v, center), scale))
        for v in vectors
    ]

def vec_translate_all(vectors, delta):
    return [
        vec_add(v, delta)
        for v in vectors
    ]

class World:
    def __init__(self, p_number, hole, figure_vertices, figure_edges, initial_vertices, world_scale):
        pygame.init()

        self.screen = pygame.display.set_mode((1200, 1200))
        self.clock = pygame.time.Clock()
        self.font = pygame.font.Font(None, 24)

        space = pymunk.Space()
        space.gravity = (0.0, 0.0)
        space.damping = 0.5
        self.space = space

        self.draw_options = pymunk.pygame_util.DrawOptions(self.screen)

        self.world_scale = world_scale

        hole = vec_scale_all(hole, (0, 0), world_scale)
        figure_vertices = vec_scale_all(figure_vertices, (0, 0), world_scale)
        initial_vertices = vec_scale_all(initial_vertices, (0, 0), world_scale)

        self.p_number = p_number
        self.hole = hole
        self.figure_vertices = figure_vertices
        self.figure_edges = figure_edges
        self.initial_vertices = initial_vertices

        self.setup()

    def add_ball(self, pos, **kwargs):
        body = pymunk.Body(**kwargs)
        body.position = Vec2d(*pos)
        shape = pymunk.Circle(body, 1)
        shape.mass = 10
        shape.friction = 0
        shape.elasticity = 0
        self.space.add(body, shape)
        return body

    def setup(self):
        for i, p1 in enumerate(self.hole):
            p2 = self.hole[(i + 1) % len(self.hole)]
            s = pymunk.Segment(self.space.static_body, p1, p2, 1)
            s.friction = 0
            s.elasticity = 0
            self.space.add(s)

        balls = []
        for v in self.initial_vertices:
            b = self.add_ball(v)
            balls.append(b)

        hole_balls = []
        for h in self.hole:
            b = self.add_ball(h, body_type=pymunk.Body.STATIC)
            hole_balls.append(b)

        for e in self.figure_edges:
            b1 = balls[e[0]]
            b2 = balls[e[1]]
            rest_len = Vec2d(*self.figure_vertices[e[0]]).get_distance(Vec2d(*self.figure_vertices[e[1]]))
            c = pymunk.DampedSpring(b1, b2, (0, 0), (0, 0), rest_len, 1000, 500)
            self.space.add(c)

        self.balls = balls
        self.hole_balls = hole_balls

    def repel_force(self, v, ball_positions):
        f_total = (0, 0)
        for p in ball_positions:
            dist = vec_dist(p, v) + 0.1
            if dist > 50:
                continue
            f = REPEL_G / (dist * dist)
            f_total = vec_add(f_total, vec_scale(vec_norm(vec_sub(p, v)), -f))
        return f_total


    def pull_apart_force(self, v, ball_positions):
        ball_center = vec_mid(ball_positions)
        f = PULL_APART_F  # * (1.0 - vec_dist(v, ball_center) / 500.0)
        return vec_scale(vec_norm(vec_sub(v, ball_center)), f)


    def hole_pull_force(self, v, ball_positions):
        f_total = (0, 0)
        for p in self.hole:
            dist = vec_dist(p, v) + 0.1
            if dist > 100:
                continue
            f = HOLE_G / (dist * dist)
            f_total = vec_add(f_total, vec_scale(vec_norm(vec_sub(p, v)), f))
        return f_total

    def apply_forces(self):
        balls = self.balls
        ball_positions = [b.position for b in balls]
        forces = [
            lambda v: self.pull_apart_force(v, ball_positions),
            # lambda v: self.repel_force(v, ball_positions),
            lambda v: self.hole_pull_force(v, ball_positions),
        ]
        for i, ball in enumerate(balls):
            f = (0, 0)
            for force_fn in forces:
                f = vec_add(f, force_fn(ball_positions[i]))

            ball.apply_force_at_local_point(f, (0, 0))

            # pygame.draw.lines(
            #     self.screen,
            #     (100, 0, 0),
            #     False,
            #     [ball.position, vec_add(ball.position, f)],
            #     1,
            # )

    def save(self):
        result = []
        for i in range(len(self.figure_vertices)):
            p = self.balls[i].position
            result.append([int(p[0]/self.world_scale), int(p[1]/self.world_scale)])

        result_json = f"{{\"vertices\":{result}}}"
        print(result_json)

        out_path = f"../solutions/pymonk/{self.p_number}"
        with open(out_path, "w") as out:
            out.write(result_json + "\n")

        print(f"Saved output to {out_path}")

    def game_loop(self):
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    exit()
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    exit()
                elif event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
                    self.save()

            self.screen.fill(pygame.Color("white"))

            for i in range(20):
                self.apply_forces()
                self.space.step(1.0 / 60)

            self.space.debug_draw(self.draw_options)
            pygame.display.flip()

            self.clock.tick(60)
            pygame.display.set_caption(f"fps: {self.clock.get_fps()}")

def read_initial_vertices(initial_vertices_path):
    with open(initial_vertices_path, "r") as json_file:
            start = json.load(json_file)
            initial_vertices = start["vertices"]
    return initial_vertices

def main(argv):
    p_number = argv[1] if len(sys.argv) > 1 else DEFAULT_PROBLEM

    # Read input.
    with open(f"../problems/{p_number}", "r") as json_file:
        input = json.load(json_file)

    hole =  input["hole"]
    figure_vertices =  input["figure"]["vertices"]
    figure_edges =  input["figure"]["edges"]

    # Read initial vertices.
    initial_vertices = figure_vertices
    if FLAGS.init_path:
        initial_vertices = read_initial_vertices(FLAGS.init_path)

    if FLAGS.scale:
        initial_vertices = vec_scale_all(initial_vertices, vec_mid(initial_vertices), float(FLAGS.scale))

    if FLAGS.move:
        dx, dy = [float(s) for s in FLAGS.move.split(",")]
        initial_vertices = vec_translate_all(initial_vertices, (dx, dy))

    world = World(
        p_number = p_number,
        hole=hole,
        figure_vertices=figure_vertices,
        figure_edges=figure_edges,
        initial_vertices=initial_vertices,
        world_scale = FLAGS.world_scale)
    world.game_loop()

if __name__ == '__main__':
  app.run(main)