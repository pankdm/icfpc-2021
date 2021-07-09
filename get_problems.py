import requests
import os
from dotenv import load_dotenv

LAST_PROBLEM = 59

load_dotenv()
api_key = os.getenv('API_KEY')
print (f'api_key = {api_key}')
assert api_key is not None

def http_error(code: int) -> str:
    if code == 200:
        return "OK"
    else:
        return "Error"

def submit_solution(problem_id, js_str):
    r = requests.post(f'https://poses.live/api/problems/{problem_id}/solutions', 
        data=js_str,
        headers={'Authorization': f'Bearer {api_key}'})
    print ('Submitting problem {} -> {} {}'.format(
        problem_id, r.status_code, http_error(r.status_code)
    ))



def get_problem_json(problem_id) -> str:
    resp = requests.get(f'https://poses.live/api/problems/{problem_id}',
        headers={'Authorization': f'Bearer {api_key}'}
    )
    print ('Downloading problem {} -> {} {}'.format(
        problem_id, resp.status_code, http_error(resp.status_code)
    ))
    return resp.content

if __name__ == "__main__":
    for problem_id in range(1, LAST_PROBLEM + 1):
        js = get_problem_json(problem_id)
        with open(f'problems/{problem_id}', 'wb') as f:
            f.write(js)
