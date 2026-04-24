import httpx


GOOGLE_HTTP_TIMEOUT = 20.0


async def get_google_token(
    google_client_id: str,
    google_client_secret: str,
    code: str,
    redirect_uri: str
):
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
    async with httpx.AsyncClient(timeout=GOOGLE_HTTP_TIMEOUT) as client:
        google_token_res = await client.post(url, data=data, headers=headers)
        google_token_res.raise_for_status()
    return google_token_res.json()


async def get_google_token_info(
    google_id_token: str,
) -> dict:
    url = "https://oauth2.googleapis.com/tokeninfo"
    async with httpx.AsyncClient(timeout=GOOGLE_HTTP_TIMEOUT) as client:
        response = await client.get(
            url,
            params={"id_token": google_id_token},
            headers={"Accept": "application/json"},
        )
        response.raise_for_status()
    return response.json()
