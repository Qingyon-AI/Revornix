import httpx

def get_google_token(google_client_id: str, google_client_secret: str, code: str, redirect_uri: str):
    url = "https://oauth2.googleapis.com/token"
    data = {
        'client_id': google_client_id,
        'client_secret': google_client_secret,
        'code': code,
        'grant_type': 'authorization_code',
        'redirect_uri': redirect_uri,
    }
    headers = {
        'Accept': 'application/json', 
        "Accept-Encoding": "application/json"
    }
    # 获取google token
    google_token_res = httpx.post(url, data=data, headers=headers)
    google_token_res.raise_for_status()
    google_token_res_json = google_token_res.json()
    return google_token_res_json