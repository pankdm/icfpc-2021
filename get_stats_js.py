#!/usr/bin/env python3

from get_problems import get_problem_json
import requests
import os
import json
import math

from bs4 import BeautifulSoup
from dotenv import load_dotenv

from get_problems import http_error
from utils import read_problem

import sys

load_dotenv()
api_key = os.getenv('API_KEY')
cookie = os.getenv('COOKIE')
print ('cookie =',cookie)
assert cookie is not None

root = sys.argv[1]


def get_problem_stats():
    resp = requests.get(f'https://poses.live/problems/',
        cookies={'session': cookie}
    )
    print ('Downloading stats -> {} {}'.format(
        resp.status_code, http_error(resp.status_code)
    ))
    return resp.text

def parse_problems_html(html):
    # print (html)
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.html.body.section.table.find_all('tr')
    # skipping header
    output = {}


    for row in rows[1:]:
        td1, td2, td3 = row.find_all('td')
        problem_id = int(td1.string)
        dislikes = td2.string
        min_dislikes = td3.string
        spec = read_problem(problem_id, root=root)
        mult = 1000 * math.log2(len(spec['figure']['vertices']) * len(spec['figure']['edges']) * len(spec['hole']) / 6.0)
        max_score = int(math.ceil(mult))

        # outer_bonus = spec['bonuses'][0]['problem']

        if min_dislikes is not None and dislikes is not None and str.isdigit(dislikes):
            my_score = int(math.ceil(mult * math.sqrt((int(min_dislikes) + 1) / (int(dislikes) + 1))))
        else:
            my_score = 0

        if min_dislikes is not None:
            min_dislikes = int(min_dislikes)

        # print (problem, dislikes, min_dislikes)
        output[problem_id] = {
            'dislikes': dislikes,
            'min_dislikes': min_dislikes,
            'score': my_score,
            'max_score': max_score,
        }
    return output

if __name__ == "__main__":
    html = get_problem_stats()
    output = parse_problems_html(html)
    file_name = "{}/data/stats_js.json".format(root)
    print ('Writing stats to {}'.format(file_name))
    with open(file_name, 'w') as f:
        f.write(json.dumps(output, indent=4))
