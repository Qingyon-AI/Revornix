from tencentcloud.common import credential
from tencentcloud.sms.v20210111 import models, sms_client

from config.sms import (
    TENCENT_SECRET_ID,
    TENCENT_SECRET_KEY,
    TENCENT_SMS_APP_KEY,
    TENCENT_SMS_SDK_APP_ID,
    TENCENT_SMS_SIGN,
)

if TENCENT_SMS_APP_KEY is None or TENCENT_SECRET_ID is None or TENCENT_SECRET_KEY is None or TENCENT_SMS_SDK_APP_ID is None or TENCENT_SMS_SIGN is None:
    raise Exception('Tencent SMS config error')

class TencentSms:

    def __init__(
        self,
        tencent_secret_id: str | None = None,
        tencent_secret_key: str | None = None,
        sdk_app_id: str | None = None,
        app_key: str | None = None,
        sign_name: str | None = None
    ):

        # 腾讯云账号相关认证信息
        self.TENCENT_SECRET_ID = tencent_secret_id
        self.TENCENT_SECRET_KEY = tencent_secret_key

        # 腾讯云短信应用相关设置
        self.SDK_APP_ID = sdk_app_id
        self.APP_KEY = app_key

        # 短信签名
        self.SIGN = sign_name

    def set_tencent_cred(
        self,
        tencent_secret_id: str,
        tencent_secret_key: str
    ):
        self.TENCENT_SECRET_ID = tencent_secret_id
        self.TENCENT_SECRET_KEY = tencent_secret_key
        return self

    def set_sms_app(
        self,
        sdk_app_id: str,
        app_key: str
    ):
        self.SDK_APP_ID = sdk_app_id
        self.APP_KEY = app_key
        return self

    def set_sign(
        self,
        sign_name: str
    ):
        self.SIGN = sign_name
        return self

    @staticmethod
    def get_official_sms_client():
        sms_client = TencentSms()
        sms_client.set_tencent_cred(TENCENT_SECRET_ID, TENCENT_SECRET_KEY)
        sms_client.set_sms_app(TENCENT_SMS_SDK_APP_ID, TENCENT_SMS_APP_KEY)
        sms_client.set_sign(TENCENT_SMS_SIGN)
        return sms_client

    def _send_msg(
        self,
        phone_numbers: list[str],
        template_id: str,
        params: list
    ):
        # 腾讯云认证对象
        cred = credential.Credential(
            self.TENCENT_SECRET_ID,
            self.TENCENT_SECRET_KEY,
        )
        client = sms_client.SmsClient(cred, 'ap-guangzhou')
        req = models.SendSmsRequest()
        req.SmsSdkAppId = self.SDK_APP_ID
        req.SignName = self.SIGN
        req.SenderId = ''
        req.ExtendCode = ''
        req.SessionContext = ''
        req.TemplateId = template_id
        req.PhoneNumberSet = phone_numbers
        req.TemplateParamSet = params

        resp = client.SendSms(req)

        if resp.SendStatusSet is None:
            raise Exception('SendStatusSet is None')

        if resp.SendStatusSet[0].Code == "Ok":
            return resp
        else:
            raise Exception(resp.SendStatusSet[0].Message)

    def send_register_msg(
        self,
        phone_numbers: list[str],
        code: str
    ):
        self._send_msg(
            phone_numbers=phone_numbers,
            template_id='2303546',
            params=[code]
        )
