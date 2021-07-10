from get_problems import get_problem_json
import requests
import os
import json

from bs4 import BeautifulSoup
from dotenv import load_dotenv

from get_problems import http_error


load_dotenv()
api_key = os.getenv('API_KEY')
cookie = os.getenv('COOKIE')
print ('cookie =',cookie)
assert cookie is not None


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
        problem = td1.string
        dislikes = td2.string
        min_dislikes = td3.string
        # print (problem, dislikes, min_dislikes)
        output[problem] = {
            'dislikes': dislikes,
            'min_dislikes': min_dislikes,
        }
    return output

if __name__ == "__main__":
    html = get_problem_stats()
    output = parse_problems_html(html)
    file_name = "data/stats.json"
    print ('Writing stats to {}'.format(file_name))
    with open(file_name, 'w') as f:
        f.write(json.dumps(output, indent=4))
