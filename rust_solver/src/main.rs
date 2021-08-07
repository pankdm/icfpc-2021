use std::fs;


#[derive(Debug)]
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
            spec.edges.push((
                edge[0].as_i64().unwrap() as usize,
                edge[1].as_i64().unwrap() as usize,
            ));
        }
        for point in data["figure"]["vertices"].as_array().unwrap() {
            spec.vertices.push(Point::from_json(point));
        }
        spec.epsilon = data["epsilon"].as_i64().unwrap();
        spec
    }
}

fn main() {
    let args = std::env::args().collect::<Vec<String>>();
    println!("args: {:?}", args);
    assert!(args.len() >= 2);
    let spec = Spec::parse_from_file(&args[1]);
    println!("spec: {:?}", &spec);
}
