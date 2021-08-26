use std::fs;
use std::mem;
use std::ops::{Sub};


#[derive(Debug, Copy, Clone, PartialEq)]
struct Point {
    x: i32,
    y: i32,
}

impl Point {
    fn from_json(point: &serde_json::Value) -> Point {
        Point {
            x: point[0].as_i64().unwrap() as i32,
            y: point[1].as_i64().unwrap() as i32,
        }
    }
}

impl Sub for Point {
    type Output = Self;
    fn sub(self, other: Self) -> Point {
        Point {
            x: self.x - other.x,
            y: self.y - other.y,
        }
    }
}


#[derive(Debug)]
struct Spec {
    hole: Vec<Point>,
    edges: Vec<(usize, usize)>,
    vertices: Vec<Point>,
    epsilon: i64,
}

impl Spec {
    fn new() -> Self {
        Spec {
            hole: Vec::new(),
            edges: Vec::new(),
            vertices: Vec::new(),
            epsilon: 0,
        }
    }

    fn parse_from_file(problem_id: &str) -> Spec {
        let path = format!("../problems/{}", problem_id);
        let content = fs::read_to_string(path).unwrap();
        // println!("content: {:?}", content);

        let data: serde_json::Value = serde_json::from_str(&content).unwrap();
        // println!("parsed: {:?}", data);

        let mut spec = Spec::new();
        for point in data["hole"].as_array().unwrap() {
            spec.hole.push(Point::from_json(point));
        }
        for edge in data["figure"]["edges"].as_array().unwrap() {
            let ia = edge[0].as_i64().unwrap() as usize;
            let ib = edge[1].as_i64().unwrap() as usize;
            spec.edges.push((
                ia.min(ib),
                ia.max(ib),
            ));
        }
        for point in data["figure"]["vertices"].as_array().unwrap() {
            spec.vertices.push(Point::from_json(point));
        }
        spec.epsilon = data["epsilon"].as_i64().unwrap();
        spec
    }
}

struct Solution {
    nodes: Vec<Point>,
}

fn sign(a: i64) -> i64 {
    if a == 0 {
        0
    } else if a < 0 {
        -1
    } else {
        1
    }
}

fn cross(a: Point, b: Point) -> i64 {
    let res = a.x * b.y - a.y * b.x;
    res as i64
}

fn dot(a: Point, b: Point) -> i64 {
    let res = a.x * b.x + a.y * b.y;
    res as i64
}

fn area(a: Point, b: Point, c: Point) -> i64 {
    cross(b - a, c - a)
}

fn intersect_1d(mut a: i32, mut b: i32, mut c: i32, mut d: i32) -> bool {
    if a > b {
        mem::swap(&mut a, &mut b);
    }
    if c > d {
        mem::swap(&mut c, &mut d);
    }
    a.max(c) <= b.min(d)
}

fn segments_intersect(a: Point, b: Point, c: Point, d: Point) -> bool {
    intersect_1d(a.x, b.x, c.x, d.x)
        && intersect_1d(a.y, b.y, c.y, d.y)
        && (sign(area(a, b, c)) * sign(area(a, b, d)) <= 0)
        && (sign(area(c, d, a)) * sign(area(c, d, b)) <= 0)
}

fn between(a: Point, mid: Point, b: Point) -> bool {
    let v1 = a - mid;
    let v2 = b - mid;
    return cross(v1, v2) == 0 && dot(v1, v2) <= 0;
}

fn inside(p: Point, hole: &Vec<Point>) -> bool {
    let mut ret = false;
    for i in 0..hole.len() {
        let u = hole[i];
        let v = hole[ (i + 1) % hole.len()];
        if u == p {
            return true;
        }
        if u.y == p.y && v.y == p.y && (u.x - p.x).signum() * (v.x - p.x).signum() <= 0 {
            return true;
        }
        if (u.y > p.y) != (v.y > p.y) {
            let slope = cross(u - p, v - p);
            if slope == 0 {
                return true;
            }
            ret ^= (slope > 0) == (u.y <= p.y);
        }
    }
    return ret;
}

fn edge_intersect_hole(ua: Point, ub: Point, hole: &Vec<Point>) -> bool {
    for i in 0..hole.len() {
        let a = hole[i];
        let b = hole[(i + 1) % hole.len()];
        if between(ua, b, ub) {
            let c = hole[(i + 2) % hole.len()];
            let interior = |p: Point| -> bool {
                if cross(c - b, a - b) >= 0 {
                    cross(c - b, p - b) >= 0 && cross(p - b, a - b) >= 0
                } else {
                    cross(c - b, p - b) >= 0 || cross(p - b, a - b) >= 0
                }
            };
            if !interior(ua) || !interior(ub) {
                return true;
            }
        } else if between(ua, a, ub) {
            continue;
        } else if between(a, ua, b) {
            if cross(a - b, ub - b) >= 0 {
                return true;
            }
        } else if between(a, ub, b) {
            if cross(a - b, ua - b) >= 0 {
                return true;
            }
        } else if segments_intersect(ua, ub, a, b) {
            return true;
        }
    }
    false
}

#[derive(Debug)]
struct Penalty {
    outside_penalty: i32,
    length_penalty: i32,
    intersect_penalty: i32,
}

fn compute_penalty(solution: &Solution, spec: &Spec) -> Penalty {
    let mut intersect_penalty = 0;
    for (ia, ib) in spec.edges.iter() {
        let a = solution.nodes[*ia];
        let b = solution.nodes[*ib];
        if edge_intersect_hole(a, b, &spec.hole) {
            println!("edge ({}, {}) intersects", ia, ib);
            intersect_penalty += 1;
        }
    }

    let mut outside_penalty = 0;
    for (ip, p) in solution.nodes.iter().enumerate() {
        if !inside(*p, &spec.hole) {
            println!("Point {} is outside", ip);
            outside_penalty += 1;
        }
    }

    Penalty {
        outside_penalty,
        intersect_penalty,
        length_penalty: 0,
    }
}

fn main() {
    let args = std::env::args().collect::<Vec<String>>();
    println!("args: {:?}", args);
    assert!(args.len() >= 2);
    let spec = Spec::parse_from_file(&args[1]);
    println!("spec: {:?}", &spec);

    let solution = Solution {
        nodes: spec.vertices.clone(),
    };
    let penalty = compute_penalty(&solution, &spec);
    println!("penalty: {:?}", penalty);
}
