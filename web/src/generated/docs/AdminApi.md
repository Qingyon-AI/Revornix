# AdminApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addAdminUserNotificationTaskAdminUsersNotificationsTaskAddPost**](AdminApi.md#addadminusernotificationtaskadminusersnotificationstaskaddpost) | **POST** /admin/users/notifications/task/add | Add Admin User Notification Task |
| [**createAdminUserAdminUsersCreatePost**](AdminApi.md#createadminuseradminuserscreatepost) | **POST** /admin/users/create | Create Admin User |
| [**deleteAdminDocumentsAdminDocumentsDeletePost**](AdminApi.md#deleteadmindocumentsadmindocumentsdeletepost) | **POST** /admin/documents/delete | Delete Admin Documents |
| [**deleteAdminSectionsAdminSectionsDeletePost**](AdminApi.md#deleteadminsectionsadminsectionsdeletepost) | **POST** /admin/sections/delete | Delete Admin Sections |
| [**deleteAdminUserAdminUsersDeletePost**](AdminApi.md#deleteadminuseradminusersdeletepost) | **POST** /admin/users/delete | Delete Admin User |
| [**deleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePost**](AdminApi.md#deleteadminusernotificationtaskadminusersnotificationstaskdeletepost) | **POST** /admin/users/notifications/task/delete | Delete Admin User Notification Task |
| [**getAdminAntiScrapeStatsAdminSecurityAntiScrapePost**](AdminApi.md#getadminantiscrapestatsadminsecurityantiscrapepost) | **POST** /admin/security/anti-scrape | Get Admin Anti Scrape Stats |
| [**getAdminDocumentDetailAdminDocumentsDetailPost**](AdminApi.md#getadmindocumentdetailadmindocumentsdetailpost) | **POST** /admin/documents/detail | Get Admin Document Detail |
| [**getAdminSectionDetailAdminSectionsDetailPost**](AdminApi.md#getadminsectiondetailadminsectionsdetailpost) | **POST** /admin/sections/detail | Get Admin Section Detail |
| [**getAdminUserComputeInfoAdminUsersComputeInfoPost**](AdminApi.md#getadminusercomputeinfoadminuserscomputeinfopost) | **POST** /admin/users/compute/info | Get Admin User Compute Info |
| [**getAdminUserComputeLedgerAdminUsersComputeLedgerPost**](AdminApi.md#getadminusercomputeledgeradminuserscomputeledgerpost) | **POST** /admin/users/compute/ledger | Get Admin User Compute Ledger |
| [**getAdminUserDetailAdminUsersDetailPost**](AdminApi.md#getadminuserdetailadminusersdetailpost) | **POST** /admin/users/detail | Get Admin User Detail |
| [**getAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPost**](AdminApi.md#getadminusernotificationtaskdetailadminusersnotificationstaskdetailpost) | **POST** /admin/users/notifications/task/detail | Get Admin User Notification Task Detail |
| [**getAdminUserNotificationTasksAdminUsersNotificationsTaskMinePost**](AdminApi.md#getadminusernotificationtasksadminusersnotificationstaskminepost) | **POST** /admin/users/notifications/task/mine | Get Admin User Notification Tasks |
| [**getAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePost**](AdminApi.md#getadminuserusablenotificationsourcesadminusersnotificationssourceusablepost) | **POST** /admin/users/notifications/source/usable | Get Admin User Usable Notification Sources |
| [**getAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePost**](AdminApi.md#getadminuserusablenotificationtargetsadminusersnotificationstargetusablepost) | **POST** /admin/users/notifications/target/usable | Get Admin User Usable Notification Targets |
| [**searchAdminDocumentsAdminDocumentsSearchPost**](AdminApi.md#searchadmindocumentsadmindocumentssearchpost) | **POST** /admin/documents/search | Search Admin Documents |
| [**searchAdminSectionsAdminSectionsSearchPost**](AdminApi.md#searchadminsectionsadminsectionssearchpost) | **POST** /admin/sections/search | Search Admin Sections |
| [**searchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPost**](AdminApi.md#searchadminusernotificationsourcesadminusersnotificationssourcespost) | **POST** /admin/users/notifications/sources | Search Admin User Notification Sources |
| [**searchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPost**](AdminApi.md#searchadminusernotificationtargetsadminusersnotificationstargetspost) | **POST** /admin/users/notifications/targets | Search Admin User Notification Targets |
| [**searchAdminUsersAdminUsersSearchPost**](AdminApi.md#searchadminusersadminuserssearchpost) | **POST** /admin/users/search | Search Admin Users |
| [**updateAdminUserAdminUsersUpdatePost**](AdminApi.md#updateadminuseradminusersupdatepost) | **POST** /admin/users/update | Update Admin User |
| [**updateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePost**](AdminApi.md#updateadminusernotificationtaskadminusersnotificationstaskupdatepost) | **POST** /admin/users/notifications/task/update | Update Admin User Notification Task |
| [**uploadAdminUserAvatarAdminUsersAvatarUploadPost**](AdminApi.md#uploadadminuseravataradminusersavataruploadpost) | **POST** /admin/users/avatar/upload | Upload Admin User Avatar |
| [**uploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPost**](AdminApi.md#uploadadminusernotificationcoveradminusersnotificationscoveruploadpost) | **POST** /admin/users/notifications/cover/upload | Upload Admin User Notification Cover |



## addAdminUserNotificationTaskAdminUsersNotificationsTaskAddPost

> NormalResponse addAdminUserNotificationTaskAdminUsersNotificationsTaskAddPost(adminAddNotificationTaskRequest, authorization, xUserTimezone)

Add Admin User Notification Task

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { AddAdminUserNotificationTaskAdminUsersNotificationsTaskAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminAddNotificationTaskRequest
    adminAddNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies AddAdminUserNotificationTaskAdminUsersNotificationsTaskAddPostRequest;

  try {
    const data = await api.addAdminUserNotificationTaskAdminUsersNotificationsTaskAddPost(body);
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
| **adminAddNotificationTaskRequest** | [AdminAddNotificationTaskRequest](AdminAddNotificationTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## createAdminUserAdminUsersCreatePost

> AdminUserDetail createAdminUserAdminUsersCreatePost(adminUserCreateRequest, authorization, xUserTimezone)

Create Admin User

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { CreateAdminUserAdminUsersCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserCreateRequest
    adminUserCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateAdminUserAdminUsersCreatePostRequest;

  try {
    const data = await api.createAdminUserAdminUsersCreatePost(body);
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
| **adminUserCreateRequest** | [AdminUserCreateRequest](AdminUserCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminUserDetail**](AdminUserDetail.md)

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


## deleteAdminDocumentsAdminDocumentsDeletePost

> NormalResponse deleteAdminDocumentsAdminDocumentsDeletePost(adminDocumentDeleteRequest, authorization, xUserTimezone)

Delete Admin Documents

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { DeleteAdminDocumentsAdminDocumentsDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminDocumentDeleteRequest
    adminDocumentDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAdminDocumentsAdminDocumentsDeletePostRequest;

  try {
    const data = await api.deleteAdminDocumentsAdminDocumentsDeletePost(body);
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
| **adminDocumentDeleteRequest** | [AdminDocumentDeleteRequest](AdminDocumentDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteAdminSectionsAdminSectionsDeletePost

> NormalResponse deleteAdminSectionsAdminSectionsDeletePost(adminSectionDeleteRequest, authorization, xUserTimezone)

Delete Admin Sections

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { DeleteAdminSectionsAdminSectionsDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminSectionDeleteRequest
    adminSectionDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAdminSectionsAdminSectionsDeletePostRequest;

  try {
    const data = await api.deleteAdminSectionsAdminSectionsDeletePost(body);
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
| **adminSectionDeleteRequest** | [AdminSectionDeleteRequest](AdminSectionDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteAdminUserAdminUsersDeletePost

> NormalResponse deleteAdminUserAdminUsersDeletePost(adminUserDeleteRequest, authorization, xUserTimezone)

Delete Admin User

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { DeleteAdminUserAdminUsersDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserDeleteRequest
    adminUserDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAdminUserAdminUsersDeletePostRequest;

  try {
    const data = await api.deleteAdminUserAdminUsersDeletePost(body);
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
| **adminUserDeleteRequest** | [AdminUserDeleteRequest](AdminUserDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePost

> NormalResponse deleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePost(adminDeleteNotificationTaskRequest, authorization, xUserTimezone)

Delete Admin User Notification Task

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { DeleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminDeleteNotificationTaskRequest
    adminDeleteNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePostRequest;

  try {
    const data = await api.deleteAdminUserNotificationTaskAdminUsersNotificationsTaskDeletePost(body);
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
| **adminDeleteNotificationTaskRequest** | [AdminDeleteNotificationTaskRequest](AdminDeleteNotificationTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## getAdminAntiScrapeStatsAdminSecurityAntiScrapePost

> AdminAntiScrapeStatsResponse getAdminAntiScrapeStatsAdminSecurityAntiScrapePost(body, authorization, xUserTimezone)

Get Admin Anti Scrape Stats

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminAntiScrapeStatsAdminSecurityAntiScrapePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // object
    body: Object,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminAntiScrapeStatsAdminSecurityAntiScrapePostRequest;

  try {
    const data = await api.getAdminAntiScrapeStatsAdminSecurityAntiScrapePost(body);
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
| **body** | `object` |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminAntiScrapeStatsResponse**](AdminAntiScrapeStatsResponse.md)

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


## getAdminDocumentDetailAdminDocumentsDetailPost

> AdminDocumentDetailResponse getAdminDocumentDetailAdminDocumentsDetailPost(adminDocumentDetailRequest, authorization, xUserTimezone)

Get Admin Document Detail

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminDocumentDetailAdminDocumentsDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminDocumentDetailRequest
    adminDocumentDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminDocumentDetailAdminDocumentsDetailPostRequest;

  try {
    const data = await api.getAdminDocumentDetailAdminDocumentsDetailPost(body);
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
| **adminDocumentDetailRequest** | [AdminDocumentDetailRequest](AdminDocumentDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminDocumentDetailResponse**](AdminDocumentDetailResponse.md)

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


## getAdminSectionDetailAdminSectionsDetailPost

> AdminSectionDetailResponse getAdminSectionDetailAdminSectionsDetailPost(adminSectionDetailRequest, authorization, xUserTimezone)

Get Admin Section Detail

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminSectionDetailAdminSectionsDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminSectionDetailRequest
    adminSectionDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminSectionDetailAdminSectionsDetailPostRequest;

  try {
    const data = await api.getAdminSectionDetailAdminSectionsDetailPost(body);
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
| **adminSectionDetailRequest** | [AdminSectionDetailRequest](AdminSectionDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminSectionDetailResponse**](AdminSectionDetailResponse.md)

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


## getAdminUserComputeInfoAdminUsersComputeInfoPost

> AdminUserComputeInfoResponse getAdminUserComputeInfoAdminUsersComputeInfoPost(adminUserComputeInfoRequest, authorization, xUserTimezone)

Get Admin User Compute Info

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserComputeInfoAdminUsersComputeInfoPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserComputeInfoRequest
    adminUserComputeInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserComputeInfoAdminUsersComputeInfoPostRequest;

  try {
    const data = await api.getAdminUserComputeInfoAdminUsersComputeInfoPost(body);
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
| **adminUserComputeInfoRequest** | [AdminUserComputeInfoRequest](AdminUserComputeInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminUserComputeInfoResponse**](AdminUserComputeInfoResponse.md)

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


## getAdminUserComputeLedgerAdminUsersComputeLedgerPost

> AdminUserComputeLedgerResponse getAdminUserComputeLedgerAdminUsersComputeLedgerPost(adminUserComputeLedgerRequest, authorization, xUserTimezone)

Get Admin User Compute Ledger

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserComputeLedgerAdminUsersComputeLedgerPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserComputeLedgerRequest
    adminUserComputeLedgerRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserComputeLedgerAdminUsersComputeLedgerPostRequest;

  try {
    const data = await api.getAdminUserComputeLedgerAdminUsersComputeLedgerPost(body);
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
| **adminUserComputeLedgerRequest** | [AdminUserComputeLedgerRequest](AdminUserComputeLedgerRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminUserComputeLedgerResponse**](AdminUserComputeLedgerResponse.md)

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


## getAdminUserDetailAdminUsersDetailPost

> AdminUserDetail getAdminUserDetailAdminUsersDetailPost(adminUserDetailRequest, authorization, xUserTimezone)

Get Admin User Detail

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserDetailAdminUsersDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserDetailRequest
    adminUserDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserDetailAdminUsersDetailPostRequest;

  try {
    const data = await api.getAdminUserDetailAdminUsersDetailPost(body);
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
| **adminUserDetailRequest** | [AdminUserDetailRequest](AdminUserDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AdminUserDetail**](AdminUserDetail.md)

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


## getAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPost

> NotificationTask getAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPost(adminNotificationTaskDetailRequest, authorization, xUserTimezone)

Get Admin User Notification Task Detail

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminNotificationTaskDetailRequest
    adminNotificationTaskDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPostRequest;

  try {
    const data = await api.getAdminUserNotificationTaskDetailAdminUsersNotificationsTaskDetailPost(body);
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
| **adminNotificationTaskDetailRequest** | [AdminNotificationTaskDetailRequest](AdminNotificationTaskDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTask**](NotificationTask.md)

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


## getAdminUserNotificationTasksAdminUsersNotificationsTaskMinePost

> PaginationNotificationTask getAdminUserNotificationTasksAdminUsersNotificationsTaskMinePost(adminUserNotificationTaskPageRequest, authorization, xUserTimezone)

Get Admin User Notification Tasks

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserNotificationTasksAdminUsersNotificationsTaskMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserNotificationTaskPageRequest
    adminUserNotificationTaskPageRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserNotificationTasksAdminUsersNotificationsTaskMinePostRequest;

  try {
    const data = await api.getAdminUserNotificationTasksAdminUsersNotificationsTaskMinePost(body);
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
| **adminUserNotificationTaskPageRequest** | [AdminUserNotificationTaskPageRequest](AdminUserNotificationTaskPageRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginationNotificationTask**](PaginationNotificationTask.md)

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


## getAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePost

> NotificationSourcesUsableResponse getAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePost(adminUserComputeInfoRequest, authorization, xUserTimezone)

Get Admin User Usable Notification Sources

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserComputeInfoRequest
    adminUserComputeInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePostRequest;

  try {
    const data = await api.getAdminUserUsableNotificationSourcesAdminUsersNotificationsSourceUsablePost(body);
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
| **adminUserComputeInfoRequest** | [AdminUserComputeInfoRequest](AdminUserComputeInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationSourcesUsableResponse**](NotificationSourcesUsableResponse.md)

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


## getAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePost

> NotificationTargetsUsableResponse getAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePost(adminUserComputeInfoRequest, authorization, xUserTimezone)

Get Admin User Usable Notification Targets

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { GetAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserComputeInfoRequest
    adminUserComputeInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePostRequest;

  try {
    const data = await api.getAdminUserUsableNotificationTargetsAdminUsersNotificationsTargetUsablePost(body);
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
| **adminUserComputeInfoRequest** | [AdminUserComputeInfoRequest](AdminUserComputeInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTargetsUsableResponse**](NotificationTargetsUsableResponse.md)

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


## searchAdminDocumentsAdminDocumentsSearchPost

> PaginationAdminDocumentSummary searchAdminDocumentsAdminDocumentsSearchPost(adminDocumentSearchRequest, authorization, xUserTimezone)

Search Admin Documents

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { SearchAdminDocumentsAdminDocumentsSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminDocumentSearchRequest
    adminDocumentSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAdminDocumentsAdminDocumentsSearchPostRequest;

  try {
    const data = await api.searchAdminDocumentsAdminDocumentsSearchPost(body);
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
| **adminDocumentSearchRequest** | [AdminDocumentSearchRequest](AdminDocumentSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginationAdminDocumentSummary**](PaginationAdminDocumentSummary.md)

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


## searchAdminSectionsAdminSectionsSearchPost

> PaginationAdminSectionSummary searchAdminSectionsAdminSectionsSearchPost(adminSectionSearchRequest, authorization, xUserTimezone)

Search Admin Sections

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { SearchAdminSectionsAdminSectionsSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminSectionSearchRequest
    adminSectionSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAdminSectionsAdminSectionsSearchPostRequest;

  try {
    const data = await api.searchAdminSectionsAdminSectionsSearchPost(body);
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
| **adminSectionSearchRequest** | [AdminSectionSearchRequest](AdminSectionSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginationAdminSectionSummary**](PaginationAdminSectionSummary.md)

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


## searchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPost

> InifiniteScrollPagnitionNotificationSource searchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPost(adminUserNotificationSourceSearchRequest, authorization, xUserTimezone)

Search Admin User Notification Sources

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { SearchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserNotificationSourceSearchRequest
    adminUserNotificationSourceSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPostRequest;

  try {
    const data = await api.searchAdminUserNotificationSourcesAdminUsersNotificationsSourcesPost(body);
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
| **adminUserNotificationSourceSearchRequest** | [AdminUserNotificationSourceSearchRequest](AdminUserNotificationSourceSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionNotificationSource**](InifiniteScrollPagnitionNotificationSource.md)

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


## searchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPost

> InifiniteScrollPagnitionNotificationTarget searchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPost(adminUserNotificationTargetSearchRequest, authorization, xUserTimezone)

Search Admin User Notification Targets

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { SearchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserNotificationTargetSearchRequest
    adminUserNotificationTargetSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPostRequest;

  try {
    const data = await api.searchAdminUserNotificationTargetsAdminUsersNotificationsTargetsPost(body);
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
| **adminUserNotificationTargetSearchRequest** | [AdminUserNotificationTargetSearchRequest](AdminUserNotificationTargetSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionNotificationTarget**](InifiniteScrollPagnitionNotificationTarget.md)

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


## searchAdminUsersAdminUsersSearchPost

> PaginationAdminUserSummary searchAdminUsersAdminUsersSearchPost(adminUserSearchRequest, authorization, xUserTimezone)

Search Admin Users

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { SearchAdminUsersAdminUsersSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserSearchRequest
    adminUserSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAdminUsersAdminUsersSearchPostRequest;

  try {
    const data = await api.searchAdminUsersAdminUsersSearchPost(body);
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
| **adminUserSearchRequest** | [AdminUserSearchRequest](AdminUserSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginationAdminUserSummary**](PaginationAdminUserSummary.md)

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


## updateAdminUserAdminUsersUpdatePost

> NormalResponse updateAdminUserAdminUsersUpdatePost(adminUserUpdateRequest, authorization, xUserTimezone)

Update Admin User

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { UpdateAdminUserAdminUsersUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUserUpdateRequest
    adminUserUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateAdminUserAdminUsersUpdatePostRequest;

  try {
    const data = await api.updateAdminUserAdminUsersUpdatePost(body);
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
| **adminUserUpdateRequest** | [AdminUserUpdateRequest](AdminUserUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## updateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePost

> NormalResponse updateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePost(adminUpdateNotificationTaskRequest, authorization, xUserTimezone)

Update Admin User Notification Task

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { UpdateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // AdminUpdateNotificationTaskRequest
    adminUpdateNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePostRequest;

  try {
    const data = await api.updateAdminUserNotificationTaskAdminUsersNotificationsTaskUpdatePost(body);
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
| **adminUpdateNotificationTaskRequest** | [AdminUpdateNotificationTaskRequest](AdminUpdateNotificationTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## uploadAdminUserAvatarAdminUsersAvatarUploadPost

> GenericFileSystemUploadResponse uploadAdminUserAvatarAdminUsersAvatarUploadPost(userId, file, authorization, xUserTimezone)

Upload Admin User Avatar

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { UploadAdminUserAvatarAdminUsersAvatarUploadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // number
    userId: 56,
    // string
    file: file_example,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UploadAdminUserAvatarAdminUsersAvatarUploadPostRequest;

  try {
    const data = await api.uploadAdminUserAvatarAdminUsersAvatarUploadPost(body);
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
| **userId** | `number` |  | [Defaults to `undefined`] |
| **file** | `string` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**GenericFileSystemUploadResponse**](GenericFileSystemUploadResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## uploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPost

> GenericFileSystemUploadResponse uploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPost(userId, file, authorization, xUserTimezone)

Upload Admin User Notification Cover

### Example

```ts
import {
  Configuration,
  AdminApi,
} from '';
import type { UploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AdminApi();

  const body = {
    // number
    userId: 56,
    // string
    file: file_example,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPostRequest;

  try {
    const data = await api.uploadAdminUserNotificationCoverAdminUsersNotificationsCoverUploadPost(body);
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
| **userId** | `number` |  | [Defaults to `undefined`] |
| **file** | `string` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**GenericFileSystemUploadResponse**](GenericFileSystemUploadResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

