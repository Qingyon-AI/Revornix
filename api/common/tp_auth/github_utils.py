import httpx


def get_github_token(
    github_client_id: str,
    github_client_secret: str,
    code: str,
    redirect_uri: str
):
    url = "https://github.com/login/oauth/access_token"
    params = {
        'client_id': github_client_id,
        'client_secret': github_client_secret,
        'code': code,
        'redirect_uri': redirect_uri,
    }
    headers = {
        'Accept': 'application/json',
        "Accept-Encoding": "application/json"
    }
    # 获取github token
    github_token_res = httpx.get(url, params=params, headers=headers)
    return github_token_res.json()

def get_github_email(
    token: str
):
    url = "https://api.github.com/user/emails"
    headers = {
        'Accept': 'application/vnd.github+json',
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    # 获取github token
    github_email_res = httpx.get(url, headers=headers)
    return github_email_res.json()

def get_github_userInfo(
    token: str
):
    url = "https://api.github.com/user"
    headers = {
        'Accept': 'application/vnd.github+json',
        "Accept-Encoding": "application/json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28"
    }
    # 获取github token
    github_user_info_res = httpx.get(url, headers=headers)
    github_user_info_res.raise_for_status()
    return github_user_info_res.json()
