import { API_PREFIX } from "@/config/api"

export default {
    getUserFans: API_PREFIX + '/user/fans',
    getUserFollows: API_PREFIX + '/user/follows',
    createEmailCode: API_PREFIX + '/user/create/email/code',
    createEmailUserVerify: API_PREFIX + '/user/create/email/verify',
    myInfo: API_PREFIX + '/user/mine/info',
    userInfo: API_PREFIX + '/user/info',
    followUser: API_PREFIX + '/user/follow',
    loginUser: API_PREFIX + '/user/login',
    updateToken: API_PREFIX + '/user/token/update',
    updateUserInfo: API_PREFIX + '/user/update',
    updatePassword: API_PREFIX + '/user/password/update',
    updatePasswordEmailCode: API_PREFIX + '/user/password/update/email/code',
    deleteUser: API_PREFIX + '/user/delete',
    bindEmailCode: API_PREFIX + '/user/bind/email/code',
    bindEmailVerify: API_PREFIX + '/user/bind/email/verify',
    unBindEmail: API_PREFIX + '/user/unbind/email',
    initialPassword: API_PREFIX + '/user/password/initial-see',
    updateDailyReport: API_PREFIX + '/user/daily-report',
    updateDefaultModel: API_PREFIX + '/user/default-model/update',
} 