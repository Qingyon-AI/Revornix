import httpx
from pydantic import BaseModel
from common.logger import exception_logger

class WebWeChatTokenResponse(BaseModel):
    access_token: str
    expires_in: int
    refresh_token: str
    openid: str
    scope: str
    unionid: str | None = None

class MiniWeChatTokenResponse(BaseModel):
    session_key: str
    openid: str
    unionid: str | None = None
    errmsg: str | None = None
    errcode: int | None = None

def get_mini_wechat_tokens(app_id: str, 
                           app_secret: str, 
                           code: str):
    response_token = httpx.post(f'https://api.weixin.qq.com/sns/jscode2session?appid={app_id}&secret={app_secret}&js_code={code}&grant_type=authorization_code')
    try:
        res = MiniWeChatTokenResponse(**response_token.json())
    except Exception as e:
        exception_logger.error(f'get_mini_wechat_tokens error: {response_token.json()}')
        raise e
    return res

def get_web_wechat_tokens(app_id: str, 
                          app_secret: str, 
                          code: str):
    response_token = httpx.post(f'https://api.weixin.qq.com/sns/oauth2/access_token?appid={app_id}&secret={app_secret}&code={code}&grant_type=authorization_code')
    try:
        res = WebWeChatTokenResponse(**response_token.json())
    except Exception as e:
        exception_logger.error(f'get_web_wechat_tokens error: {response_token.json()}')
        raise e
    return res

def get_web_user_info(access_token: str,
                      openid: str):
    response_user_info = httpx.post(f'https://api.weixin.qq.com/sns/userinfo?access_token={access_token}&openid={openid}&lang=zh_CN')
    return response_user_info.json()