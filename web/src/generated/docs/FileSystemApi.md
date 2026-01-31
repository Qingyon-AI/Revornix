# FileSystemApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteUserFileSystemFileSystemUserFileSystemDeletePost**](FileSystemApi.md#deleteuserfilesystemfilesystemuserfilesystemdeletepost) | **POST** /file-system/user-file-system/delete | Delete User File System |
| [**getFileSystemInfoFileSystemDetailPost**](FileSystemApi.md#getfilesysteminfofilesystemdetailpost) | **POST** /file-system/detail | Get File System Info |
| [**getPresignedUrlFileSystemPresignUploadUrlPost**](FileSystemApi.md#getpresignedurlfilesystempresignuploadurlpost) | **POST** /file-system/presign-upload-url | Get Presigned Url |
| [**getUserFileSystemInfoFileSystemUserFileSystemDetailPost**](FileSystemApi.md#getuserfilesysteminfofilesystemuserfilesystemdetailpost) | **POST** /file-system/user-file-system/detail | Get User File System Info |
| [**installUserFileSystemFileSystemInstallPost**](FileSystemApi.md#installuserfilesystemfilesysteminstallpost) | **POST** /file-system/install | Install User File System |
| [**provideFileSystemFileSystemProvidePost**](FileSystemApi.md#providefilesystemfilesystemprovidepost) | **POST** /file-system/provide | Provide File System |
| [**searchMineFileSystemFileSystemMinePost**](FileSystemApi.md#searchminefilesystemfilesystemminepost) | **POST** /file-system/mine | Search Mine File System |
| [**updateFileSystemFileSystemUpdatePost**](FileSystemApi.md#updatefilesystemfilesystemupdatepost) | **POST** /file-system/update | Update File System |
| [**uploadFileSystemFileSystemGenericS3UploadPost**](FileSystemApi.md#uploadfilesystemfilesystemgenerics3uploadpost) | **POST** /file-system/generic-s3/upload | Upload File System |



## deleteUserFileSystemFileSystemUserFileSystemDeletePost

> NormalResponse deleteUserFileSystemFileSystemUserFileSystemDeletePost(userFileSystemDeleteRequest, authorization)

Delete User File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { DeleteUserFileSystemFileSystemUserFileSystemDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // UserFileSystemDeleteRequest
    userFileSystemDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies DeleteUserFileSystemFileSystemUserFileSystemDeletePostRequest;

  try {
    const data = await api.deleteUserFileSystemFileSystemUserFileSystemDeletePost(body);
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
| **userFileSystemDeleteRequest** | [UserFileSystemDeleteRequest](UserFileSystemDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## getFileSystemInfoFileSystemDetailPost

> FileSystemInfo getFileSystemInfoFileSystemDetailPost(fileSystemInfoRequest, authorization)

Get File System Info

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetFileSystemInfoFileSystemDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // FileSystemInfoRequest
    fileSystemInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetFileSystemInfoFileSystemDetailPostRequest;

  try {
    const data = await api.getFileSystemInfoFileSystemDetailPost(body);
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
| **fileSystemInfoRequest** | [FileSystemInfoRequest](FileSystemInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**FileSystemInfo**](FileSystemInfo.md)

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


## getPresignedUrlFileSystemPresignUploadUrlPost

> PresignUploadURLResponse getPresignedUrlFileSystemPresignUploadUrlPost(presignUploadURLRequest, authorization)

Get Presigned Url

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetPresignedUrlFileSystemPresignUploadUrlPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // PresignUploadURLRequest
    presignUploadURLRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetPresignedUrlFileSystemPresignUploadUrlPostRequest;

  try {
    const data = await api.getPresignedUrlFileSystemPresignUploadUrlPost(body);
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
| **presignUploadURLRequest** | [PresignUploadURLRequest](PresignUploadURLRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PresignUploadURLResponse**](PresignUploadURLResponse.md)

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


## getUserFileSystemInfoFileSystemUserFileSystemDetailPost

> UserFileSystemDetail getUserFileSystemInfoFileSystemUserFileSystemDetailPost(userFileSystemInfoRequest, authorization)

Get User File System Info

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetUserFileSystemInfoFileSystemUserFileSystemDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // UserFileSystemInfoRequest
    userFileSystemInfoRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies GetUserFileSystemInfoFileSystemUserFileSystemDetailPostRequest;

  try {
    const data = await api.getUserFileSystemInfoFileSystemUserFileSystemDetailPost(body);
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
| **userFileSystemInfoRequest** | [UserFileSystemInfoRequest](UserFileSystemInfoRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**UserFileSystemDetail**](UserFileSystemDetail.md)

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


## installUserFileSystemFileSystemInstallPost

> FileSystemInstallResponse installUserFileSystemFileSystemInstallPost(fileSystemInstallRequest, authorization)

Install User File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { InstallUserFileSystemFileSystemInstallPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // FileSystemInstallRequest
    fileSystemInstallRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies InstallUserFileSystemFileSystemInstallPostRequest;

  try {
    const data = await api.installUserFileSystemFileSystemInstallPost(body);
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
| **fileSystemInstallRequest** | [FileSystemInstallRequest](FileSystemInstallRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**FileSystemInstallResponse**](FileSystemInstallResponse.md)

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


## provideFileSystemFileSystemProvidePost

> ProvideFileSystemSearchResponse provideFileSystemFileSystemProvidePost(fileSystemSearchRequest, authorization)

Provide File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { ProvideFileSystemFileSystemProvidePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // FileSystemSearchRequest
    fileSystemSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies ProvideFileSystemFileSystemProvidePostRequest;

  try {
    const data = await api.provideFileSystemFileSystemProvidePost(body);
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
| **fileSystemSearchRequest** | [FileSystemSearchRequest](FileSystemSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ProvideFileSystemSearchResponse**](ProvideFileSystemSearchResponse.md)

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


## searchMineFileSystemFileSystemMinePost

> MineFileSystemSearchResponse searchMineFileSystemFileSystemMinePost(fileSystemSearchRequest, authorization)

Search Mine File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { SearchMineFileSystemFileSystemMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // FileSystemSearchRequest
    fileSystemSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies SearchMineFileSystemFileSystemMinePostRequest;

  try {
    const data = await api.searchMineFileSystemFileSystemMinePost(body);
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
| **fileSystemSearchRequest** | [FileSystemSearchRequest](FileSystemSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**MineFileSystemSearchResponse**](MineFileSystemSearchResponse.md)

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


## updateFileSystemFileSystemUpdatePost

> NormalResponse updateFileSystemFileSystemUpdatePost(userFileSystemUpdateRequest, authorization)

Update File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { UpdateFileSystemFileSystemUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // UserFileSystemUpdateRequest
    userFileSystemUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
  } satisfies UpdateFileSystemFileSystemUpdatePostRequest;

  try {
    const data = await api.updateFileSystemFileSystemUpdatePost(body);
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
| **userFileSystemUpdateRequest** | [UserFileSystemUpdateRequest](UserFileSystemUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## uploadFileSystemFileSystemGenericS3UploadPost

> GenericFileSystemUploadResponse uploadFileSystemFileSystemGenericS3UploadPost(file, filePath, contentType, authorization)

Upload File System

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { UploadFileSystemFileSystemGenericS3UploadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // Blob
    file: BINARY_DATA_HERE,
    // string
    filePath: filePath_example,
    // string
    contentType: contentType_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies UploadFileSystemFileSystemGenericS3UploadPostRequest;

  try {
    const data = await api.uploadFileSystemFileSystemGenericS3UploadPost(body);
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
| **file** | `Blob` |  | [Defaults to `undefined`] |
| **filePath** | `string` |  | [Defaults to `undefined`] |
| **contentType** | `string` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

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

