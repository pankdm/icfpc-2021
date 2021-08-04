#!/usr/bin/env python3

import os

from utils import read_json
from get_problems import submit_solution

LAST_PROBLEM = 132

def main():
    for i in range(1, LAST_PROBLEM + 1):
        file_path = f'solutions/golden/{i}'
        if os.path.exists(file_path):
            js_str = open(file_path).read()
            submit_solution(i, js_str)

if __name__ == '__main__':
    main()