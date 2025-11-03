# UserApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**bindEmailVerifyUserBindEmailVerifyPost**](UserApi.md#bindemailverifyuserbindemailverifypost) | **POST** /user/bind/email/verify | Bind Email Verify |
| [**bindGithubUserBindGithubPost**](UserApi.md#bindgithubuserbindgithubpost) | **POST** /user/bind/github | Bind Github |
| [**bindGoogleUserBindGooglePost**](UserApi.md#bindgoogleuserbindgooglepost) | **POST** /user/bind/google | Bind Google |
| [**bindPhoneUserBindPhoneCodePost**](UserApi.md#bindphoneuserbindphonecodepost) | **POST** /user/bind/phone/code | Bind Phone |
| [**bindPhoneVerifyUserBindPhoneVerifyPost**](UserApi.md#bindphoneverifyuserbindphoneverifypost) | **POST** /user/bind/phone/verify | Bind Phone Verify |
| [**bindWechatUserBindWechatWebPost**](UserApi.md#bindwechatuserbindwechatwebpost) | **POST** /user/bind/wechat/web | Bind Wechat |
| [**createUserByEmailVerifyUserCreateEmailVerifyPost**](UserApi.md#createuserbyemailverifyusercreateemailverifypost) | **POST** /user/create/email/verify | Create User By Email Verify |
| [**createUserByGithubUserCreateGithubPost**](UserApi.md#createuserbygithubusercreategithubpost) | **POST** /user/create/github | Create User By Github |
| [**createUserByGoogleUserCreateGooglePost**](UserApi.md#createuserbygoogleusercreategooglepost) | **POST** /user/create/google | Create User By Google |
| [**createUserBySmsCodeUserCreateSmsCodePost**](UserApi.md#createuserbysmscodeusercreatesmscodepost) | **POST** /user/create/sms/code | Create User By Sms Code |
| [**createUserBySmsVerifyUserCreateSmsVerifyPost**](UserApi.md#createuserbysmsverifyusercreatesmsverifypost) | **POST** /user/create/sms/verify | Create User By Sms Verify |
| [**createUserByWechatMiniUserCreateWechatMiniPost**](UserApi.md#createuserbywechatminiusercreatewechatminipost) | **POST** /user/create/wechat/mini | Create User By Wechat Mini |
| [**createUserByWechatWebUserCreateWechatWebPost**](UserApi.md#createuserbywechatwebusercreatewechatwebpost) | **POST** /user/create/wechat/web | Create User By Wechat Web |
| [**deleteUserUserDeletePost**](UserApi.md#deleteuseruserdeletepost) | **POST** /user/delete | Delete User |
| [**followUserUserFollowPost**](UserApi.md#followuseruserfollowpost) | **POST** /user/follow | Follow User |
| [**initialSeePasswordUserPasswordInitialSeePost**](UserApi.md#initialseepassworduserpasswordinitialseepost) | **POST** /user/password/initial-see | Initial See Password |
| [**loginUserLoginPost**](UserApi.md#loginuserloginpost) | **POST** /user/login | Login |
| [**myInfoUserMineInfoPost**](UserApi.md#myinfousermineinfopost) | **POST** /user/mine/info | My Info |
| [**searchUserFansUserFansPost**](UserApi.md#searchuserfansuserfanspost) | **POST** /user/fans | Search User Fans |
| [**searchUserFollowsUserFollowsPost**](UserApi.md#searchuserfollowsuserfollowspost) | **POST** /user/follows | Search User Follows |
| [**searchUserUserSearchPost**](UserApi.md#searchuserusersearchpost) | **POST** /user/search | Search User |
| [**unbindGithubUserUnbindGithubPost**](UserApi.md#unbindgithubuserunbindgithubpost) | **POST** /user/unbind/github | Unbind Github |
| [**unbindGithubUserUnbindWechatPost**](UserApi.md#unbindgithubuserunbindwechatpost) | **POST** /user/unbind/wechat | Unbind Github |
| [**unbindGoogleUserUnbindGooglePost**](UserApi.md#unbindgoogleuserunbindgooglepost) | **POST** /user/unbind/google | Unbind Google |
| [**unbindPhoneUserUnbindPhonePost**](UserApi.md#unbindphoneuserunbindphonepost) | **POST** /user/unbind/phone | Unbind Phone |
| [**updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost**](UserApi.md#updatedefaultdocumentparseengineuserdefaultengineupdatepost) | **POST** /user/default-engine/update | Update Default Document Parse Engine |
| [**updateDefaultFileSystemUserDefaultFileSystemUpdatePost**](UserApi.md#updatedefaultfilesystemuserdefaultfilesystemupdatepost) | **POST** /user/default-file-system/update | Update Default File System |
| [**updateDefaultModelUserDefaultModelUpdatePost**](UserApi.md#updatedefaultmodeluserdefaultmodelupdatepost) | **POST** /user/default-model/update | Update Default Model |
| [**updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost**](UserApi.md#updatemydefaultreadmarkreasonuserreadmarkreasonupdatepost) | **POST** /user/read-mark-reason/update | Update My Default Read Mark Reason |
| [**updateMyInfoUserUpdatePost**](UserApi.md#updatemyinfouserupdatepost) | **POST** /user/update | Update My Info |
| [**updatePasswordUserPasswordUpdatePost**](UserApi.md#updatepassworduserpasswordupdatepost) | **POST** /user/password/update | Update Password |
| [**updateTokenUserTokenUpdatePost**](UserApi.md#updatetokenusertokenupdatepost) | **POST** /user/token/update | Update Token |
| [**userInfoUserInfoPost**](UserApi.md#userinfouserinfopost) | **POST** /user/info | User Info |



## bindEmailVerifyUserBindEmailVerifyPost

> NormalResponse bindEmailVerifyUserBindEmailVerifyPost(bindEmailVerifyRequest, authorization, xForwardedFor)

Bind Email Verify

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindEmailVerifyUserBindEmailVerifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // BindEmailVerifyRequest
    bindEmailVerifyRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindEmailVerifyUserBindEmailVerifyPostRequest;

  try {
    const data = await api.bindEmailVerifyUserBindEmailVerifyPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **bindEmailVerifyRequest** | [BindEmailVerifyRequest](BindEmailVerifyRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## bindGithubUserBindGithubPost

> NormalResponse bindGithubUserBindGithubPost(githubUserBind, authorization, xForwardedFor)

Bind Github

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindGithubUserBindGithubPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // GithubUserBind
    githubUserBind: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindGithubUserBindGithubPostRequest;

  try {
    const data = await api.bindGithubUserBindGithubPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **githubUserBind** | [GithubUserBind](GithubUserBind.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## bindGoogleUserBindGooglePost

> NormalResponse bindGoogleUserBindGooglePost(googleUserBind, authorization, xForwardedFor)

Bind Google

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindGoogleUserBindGooglePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // GoogleUserBind
    googleUserBind: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindGoogleUserBindGooglePostRequest;

  try {
    const data = await api.bindGoogleUserBindGooglePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **googleUserBind** | [GoogleUserBind](GoogleUserBind.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## bindPhoneUserBindPhoneCodePost

> NormalResponse bindPhoneUserBindPhoneCodePost(bindPhoneCodeCreateRequest, authorization, xForwardedFor)

Bind Phone

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindPhoneUserBindPhoneCodePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // BindPhoneCodeCreateRequest
    bindPhoneCodeCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindPhoneUserBindPhoneCodePostRequest;

  try {
    const data = await api.bindPhoneUserBindPhoneCodePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **bindPhoneCodeCreateRequest** | [BindPhoneCodeCreateRequest](BindPhoneCodeCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## bindPhoneVerifyUserBindPhoneVerifyPost

> NormalResponse bindPhoneVerifyUserBindPhoneVerifyPost(bindPhoneCodeVerifyRequest, authorization, xForwardedFor)

Bind Phone Verify

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindPhoneVerifyUserBindPhoneVerifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // BindPhoneCodeVerifyRequest
    bindPhoneCodeVerifyRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindPhoneVerifyUserBindPhoneVerifyPostRequest;

  try {
    const data = await api.bindPhoneVerifyUserBindPhoneVerifyPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **bindPhoneCodeVerifyRequest** | [BindPhoneCodeVerifyRequest](BindPhoneCodeVerifyRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## bindWechatUserBindWechatWebPost

> NormalResponse bindWechatUserBindWechatWebPost(weChatWebUserBindRequest, authorization, xForwardedFor)

Bind Wechat

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { BindWechatUserBindWechatWebPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // WeChatWebUserBindRequest
    weChatWebUserBindRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies BindWechatUserBindWechatWebPostRequest;

  try {
    const data = await api.bindWechatUserBindWechatWebPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **weChatWebUserBindRequest** | [WeChatWebUserBindRequest](WeChatWebUserBindRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserByEmailVerifyUserCreateEmailVerifyPost

> TokenResponse createUserByEmailVerifyUserCreateEmailVerifyPost(emailUserCreateVerifyRequest)

Create User By Email Verify

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserByEmailVerifyUserCreateEmailVerifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // EmailUserCreateVerifyRequest
    emailUserCreateVerifyRequest: ...,
  } satisfies CreateUserByEmailVerifyUserCreateEmailVerifyPostRequest;

  try {
    const data = await api.createUserByEmailVerifyUserCreateEmailVerifyPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **emailUserCreateVerifyRequest** | [EmailUserCreateVerifyRequest](EmailUserCreateVerifyRequest.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserByGithubUserCreateGithubPost

> TokenResponse createUserByGithubUserCreateGithubPost(githubUserCreate)

Create User By Github

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserByGithubUserCreateGithubPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // GithubUserCreate
    githubUserCreate: ...,
  } satisfies CreateUserByGithubUserCreateGithubPostRequest;

  try {
    const data = await api.createUserByGithubUserCreateGithubPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **githubUserCreate** | [GithubUserCreate](GithubUserCreate.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserByGoogleUserCreateGooglePost

> TokenResponse createUserByGoogleUserCreateGooglePost(googleUserCreate)

Create User By Google

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserByGoogleUserCreateGooglePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // GoogleUserCreate
    googleUserCreate: ...,
  } satisfies CreateUserByGoogleUserCreateGooglePostRequest;

  try {
    const data = await api.createUserByGoogleUserCreateGooglePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **googleUserCreate** | [GoogleUserCreate](GoogleUserCreate.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserBySmsCodeUserCreateSmsCodePost

> NormalResponse createUserBySmsCodeUserCreateSmsCodePost(smsUserCodeCreateRequest)

Create User By Sms Code

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserBySmsCodeUserCreateSmsCodePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // SmsUserCodeCreateRequest
    smsUserCodeCreateRequest: ...,
  } satisfies CreateUserBySmsCodeUserCreateSmsCodePostRequest;

  try {
    const data = await api.createUserBySmsCodeUserCreateSmsCodePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **smsUserCodeCreateRequest** | [SmsUserCodeCreateRequest](SmsUserCodeCreateRequest.md) |  | |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserBySmsVerifyUserCreateSmsVerifyPost

> TokenResponse createUserBySmsVerifyUserCreateSmsVerifyPost(smsUserCodeVerifyCreate)

Create User By Sms Verify

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserBySmsVerifyUserCreateSmsVerifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // SmsUserCodeVerifyCreate
    smsUserCodeVerifyCreate: ...,
  } satisfies CreateUserBySmsVerifyUserCreateSmsVerifyPostRequest;

  try {
    const data = await api.createUserBySmsVerifyUserCreateSmsVerifyPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **smsUserCodeVerifyCreate** | [SmsUserCodeVerifyCreate](SmsUserCodeVerifyCreate.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserByWechatMiniUserCreateWechatMiniPost

> TokenResponse createUserByWechatMiniUserCreateWechatMiniPost(weChatMiniUserCreateRequest)

Create User By Wechat Mini

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserByWechatMiniUserCreateWechatMiniPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // WeChatMiniUserCreateRequest
    weChatMiniUserCreateRequest: ...,
  } satisfies CreateUserByWechatMiniUserCreateWechatMiniPostRequest;

  try {
    const data = await api.createUserByWechatMiniUserCreateWechatMiniPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **weChatMiniUserCreateRequest** | [WeChatMiniUserCreateRequest](WeChatMiniUserCreateRequest.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createUserByWechatWebUserCreateWechatWebPost

> TokenResponse createUserByWechatWebUserCreateWechatWebPost(weChatWebUserCreateRequest)

Create User By Wechat Web

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { CreateUserByWechatWebUserCreateWechatWebPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // WeChatWebUserCreateRequest
    weChatWebUserCreateRequest: ...,
  } satisfies CreateUserByWechatWebUserCreateWechatWebPostRequest;

  try {
    const data = await api.createUserByWechatWebUserCreateWechatWebPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **weChatWebUserCreateRequest** | [WeChatWebUserCreateRequest](WeChatWebUserCreateRequest.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteUserUserDeletePost

> NormalResponse deleteUserUserDeletePost(authorization, xForwardedFor)

Delete User

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { DeleteUserUserDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteUserUserDeletePostRequest;

  try {
    const data = await api.deleteUserUserDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## followUserUserFollowPost

> NormalResponse followUserUserFollowPost(followUserRequest, authorization, xForwardedFor)

Follow User

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { FollowUserUserFollowPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // FollowUserRequest
    followUserRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies FollowUserUserFollowPostRequest;

  try {
    const data = await api.followUserUserFollowPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **followUserRequest** | [FollowUserRequest](FollowUserRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## initialSeePasswordUserPasswordInitialSeePost

> InitialPasswordResponse initialSeePasswordUserPasswordInitialSeePost(authorization, xForwardedFor)

Initial See Password

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { InitialSeePasswordUserPasswordInitialSeePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies InitialSeePasswordUserPasswordInitialSeePostRequest;

  try {
    const data = await api.initialSeePasswordUserPasswordInitialSeePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InitialPasswordResponse**](InitialPasswordResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## loginUserLoginPost

> TokenResponse loginUserLoginPost(userLoginRequest)

Login

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { LoginUserLoginPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // UserLoginRequest
    userLoginRequest: ...,
  } satisfies LoginUserLoginPostRequest;

  try {
    const data = await api.loginUserLoginPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **userLoginRequest** | [UserLoginRequest](UserLoginRequest.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## myInfoUserMineInfoPost

> PrivateUserInfo myInfoUserMineInfoPost(authorization, xForwardedFor)

My Info

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { MyInfoUserMineInfoPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies MyInfoUserMineInfoPostRequest;

  try {
    const data = await api.myInfoUserMineInfoPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PrivateUserInfo**](PrivateUserInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchUserFansUserFansPost

> InifiniteScrollPagnitionUserPublicInfo searchUserFansUserFansPost(searchUserFansRequest, authorization, xForwardedFor)

Search User Fans

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { SearchUserFansUserFansPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // SearchUserFansRequest
    searchUserFansRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchUserFansUserFansPostRequest;

  try {
    const data = await api.searchUserFansUserFansPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchUserFansRequest** | [SearchUserFansRequest](SearchUserFansRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionUserPublicInfo**](InifiniteScrollPagnitionUserPublicInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchUserFollowsUserFollowsPost

> InifiniteScrollPagnitionUserPublicInfo searchUserFollowsUserFollowsPost(searchUserFollowsRequest, authorization, xForwardedFor)

Search User Follows

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { SearchUserFollowsUserFollowsPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // SearchUserFollowsRequest
    searchUserFollowsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchUserFollowsUserFollowsPostRequest;

  try {
    const data = await api.searchUserFollowsUserFollowsPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchUserFollowsRequest** | [SearchUserFollowsRequest](SearchUserFollowsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionUserPublicInfo**](InifiniteScrollPagnitionUserPublicInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchUserUserSearchPost

> InifiniteScrollPagnitionUserPublicInfo searchUserUserSearchPost(searchUserRequest, authorization, xForwardedFor)

Search User

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { SearchUserUserSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // SearchUserRequest
    searchUserRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchUserUserSearchPostRequest;

  try {
    const data = await api.searchUserUserSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchUserRequest** | [SearchUserRequest](SearchUserRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionUserPublicInfo**](InifiniteScrollPagnitionUserPublicInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unbindGithubUserUnbindGithubPost

> NormalResponse unbindGithubUserUnbindGithubPost(authorization, xForwardedFor)

Unbind Github

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UnbindGithubUserUnbindGithubPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UnbindGithubUserUnbindGithubPostRequest;

  try {
    const data = await api.unbindGithubUserUnbindGithubPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unbindGithubUserUnbindWechatPost

> NormalResponse unbindGithubUserUnbindWechatPost(authorization, xForwardedFor)

Unbind Github

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UnbindGithubUserUnbindWechatPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UnbindGithubUserUnbindWechatPostRequest;

  try {
    const data = await api.unbindGithubUserUnbindWechatPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unbindGoogleUserUnbindGooglePost

> NormalResponse unbindGoogleUserUnbindGooglePost(authorization, xForwardedFor)

Unbind Google

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UnbindGoogleUserUnbindGooglePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UnbindGoogleUserUnbindGooglePostRequest;

  try {
    const data = await api.unbindGoogleUserUnbindGooglePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unbindPhoneUserUnbindPhonePost

> NormalResponse unbindPhoneUserUnbindPhonePost(authorization, xForwardedFor)

Unbind Phone

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UnbindPhoneUserUnbindPhonePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UnbindPhoneUserUnbindPhonePostRequest;

  try {
    const data = await api.unbindPhoneUserUnbindPhonePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost

> NormalResponse updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost(defaultEngineUpdateRequest, authorization, xForwardedFor)

Update Default Document Parse Engine

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // DefaultEngineUpdateRequest
    defaultEngineUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateDefaultDocumentParseEngineUserDefaultEngineUpdatePostRequest;

  try {
    const data = await api.updateDefaultDocumentParseEngineUserDefaultEngineUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **defaultEngineUpdateRequest** | [DefaultEngineUpdateRequest](DefaultEngineUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDefaultFileSystemUserDefaultFileSystemUpdatePost

> NormalResponse updateDefaultFileSystemUserDefaultFileSystemUpdatePost(defaultFileSystemUpdateRequest, authorization, xForwardedFor)

Update Default File System

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateDefaultFileSystemUserDefaultFileSystemUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // DefaultFileSystemUpdateRequest
    defaultFileSystemUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateDefaultFileSystemUserDefaultFileSystemUpdatePostRequest;

  try {
    const data = await api.updateDefaultFileSystemUserDefaultFileSystemUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **defaultFileSystemUpdateRequest** | [DefaultFileSystemUpdateRequest](DefaultFileSystemUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDefaultModelUserDefaultModelUpdatePost

> NormalResponse updateDefaultModelUserDefaultModelUpdatePost(defaultModelUpdateRequest, authorization, xForwardedFor)

Update Default Model

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateDefaultModelUserDefaultModelUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // DefaultModelUpdateRequest
    defaultModelUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateDefaultModelUserDefaultModelUpdatePostRequest;

  try {
    const data = await api.updateDefaultModelUserDefaultModelUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **defaultModelUpdateRequest** | [DefaultModelUpdateRequest](DefaultModelUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost

> NormalResponse updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost(defaultReadMarkReasonUpdateRequest, authorization, xForwardedFor)

Update My Default Read Mark Reason

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // DefaultReadMarkReasonUpdateRequest
    defaultReadMarkReasonUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePostRequest;

  try {
    const data = await api.updateMyDefaultReadMarkReasonUserReadMarkReasonUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **defaultReadMarkReasonUpdateRequest** | [DefaultReadMarkReasonUpdateRequest](DefaultReadMarkReasonUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateMyInfoUserUpdatePost

> NormalResponse updateMyInfoUserUpdatePost(userInfoUpdateRequest, authorization, xForwardedFor)

Update My Info

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateMyInfoUserUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // UserInfoUpdateRequest
    userInfoUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateMyInfoUserUpdatePostRequest;

  try {
    const data = await api.updateMyInfoUserUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **userInfoUpdateRequest** | [UserInfoUpdateRequest](UserInfoUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updatePasswordUserPasswordUpdatePost

> NormalResponse updatePasswordUserPasswordUpdatePost(passwordUpdateRequest, authorization, xForwardedFor)

Update Password

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdatePasswordUserPasswordUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // PasswordUpdateRequest
    passwordUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdatePasswordUserPasswordUpdatePostRequest;

  try {
    const data = await api.updatePasswordUserPasswordUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **passwordUpdateRequest** | [PasswordUpdateRequest](PasswordUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateTokenUserTokenUpdatePost

> TokenResponse updateTokenUserTokenUpdatePost(tokenUpdateRequest)

Update Token

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UpdateTokenUserTokenUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // TokenUpdateRequest
    tokenUpdateRequest: ...,
  } satisfies UpdateTokenUserTokenUpdatePostRequest;

  try {
    const data = await api.updateTokenUserTokenUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **tokenUpdateRequest** | [TokenUpdateRequest](TokenUpdateRequest.md) |  | |

### Return type

[**TokenResponse**](TokenResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## userInfoUserInfoPost

> UserPublicInfo userInfoUserInfoPost(userInfoRequest, authorization, xForwardedFor)

User Info

### Example

```ts
import {
  Configuration,
  UserApi,
} from '';
import type { UserInfoUserInfoPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserApi();

  const body = {
    // UserInfoRequest
    userInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UserInfoUserInfoPostRequest;

  try {
    const data = await api.userInfoUserInfoPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **userInfoRequest** | [UserInfoRequest](UserInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**UserPublicInfo**](UserPublicInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

