import httpx

def get_wechat_tokens(app_id: str, 
                      app_secret: str, 
                      code: str):
    response_token = httpx.post(f'https://api.weixin.qq.com/sns/oauth2/access_token?appid={app_id}&secret={app_secret}&code={code}&grant_type=authorization_code')
    return response_token.json()

def get_user_info(access_token: str,
                  openid: str):
    response_user_info = httpx.post(f'https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}&lang=zh_CN')
    return response_user_info.json()