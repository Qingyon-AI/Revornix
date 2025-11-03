# FileSystemApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteUserFileSystemFileSystemUserFileSystemDeletePost**](FileSystemApi.md#deleteuserfilesystemfilesystemuserfilesystemdeletepost) | **POST** /file-system/user-file-system/delete | Delete User File System |
| [**getAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPost**](FileSystemApi.md#getaliyunosspresignedurlfilesystemaliyunosspresignuploadurlpost) | **POST** /file-system/aliyun-oss/presign-upload-url | Get Aliyun Oss Presigned Url |
| [**getAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPost**](FileSystemApi.md#getawss3presignedurlfilesystemawss3presignuploadurlpost) | **POST** /file-system/aws-s3/presign-upload-url | Get Aws S3 Presigned Url |
| [**getBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPost**](FileSystemApi.md#getbuiltinpresignedurlfilesystembuiltinpresignuploadurlpost) | **POST** /file-system/built-in/presign-upload-url | Get Built In Presigned Url |
| [**getFileSystemInfoFileSystemDetailPost**](FileSystemApi.md#getfilesysteminfofilesystemdetailpost) | **POST** /file-system/detail | Get File System Info |
| [**getUrlPrefixFileSystemUrlPrefixPost**](FileSystemApi.md#geturlprefixfilesystemurlprefixpost) | **POST** /file-system/url-prefix | Get Url Prefix |
| [**getUserFileSystemInfoFileSystemUserFileSystemDetailPost**](FileSystemApi.md#getuserfilesysteminfofilesystemuserfilesystemdetailpost) | **POST** /file-system/user-file-system/detail | Get User File System Info |
| [**installUserFileSystemFileSystemInstallPost**](FileSystemApi.md#installuserfilesystemfilesysteminstallpost) | **POST** /file-system/install | Install User File System |
| [**provideFileSystemFileSystemProvidePost**](FileSystemApi.md#providefilesystemfilesystemprovidepost) | **POST** /file-system/provide | Provide File System |
| [**searchMineFileSystemFileSystemMinePost**](FileSystemApi.md#searchminefilesystemfilesystemminepost) | **POST** /file-system/mine | Search Mine File System |
| [**updateFileSystemFileSystemUpdatePost**](FileSystemApi.md#updatefilesystemfilesystemupdatepost) | **POST** /file-system/update | Update File System |
| [**uploadFileSystemFileSystemGenericS3UploadPost**](FileSystemApi.md#uploadfilesystemfilesystemgenerics3uploadpost) | **POST** /file-system/generic-s3/upload | Upload File System |



## deleteUserFileSystemFileSystemUserFileSystemDeletePost

> NormalResponse deleteUserFileSystemFileSystemUserFileSystemDeletePost(userFileSystemDeleteRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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


## getAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPost

> AliyunOSSPresignUploadURLResponse getAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPost(aliyunOSSPresignUploadURLRequest, authorization, xForwardedFor)

Get Aliyun Oss Presigned Url

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // AliyunOSSPresignUploadURLRequest
    aliyunOSSPresignUploadURLRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPostRequest;

  try {
    const data = await api.getAliyunOssPresignedUrlFileSystemAliyunOssPresignUploadUrlPost(body);
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
| **aliyunOSSPresignUploadURLRequest** | [AliyunOSSPresignUploadURLRequest](AliyunOSSPresignUploadURLRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AliyunOSSPresignUploadURLResponse**](AliyunOSSPresignUploadURLResponse.md)

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


## getAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPost

> S3PresignUploadURLResponse getAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPost(s3PresignUploadURLRequest, authorization, xForwardedFor)

Get Aws S3 Presigned Url

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // S3PresignUploadURLRequest
    s3PresignUploadURLRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPostRequest;

  try {
    const data = await api.getAwsS3PresignedUrlFileSystemAwsS3PresignUploadUrlPost(body);
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
| **s3PresignUploadURLRequest** | [S3PresignUploadURLRequest](S3PresignUploadURLRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**S3PresignUploadURLResponse**](S3PresignUploadURLResponse.md)

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


## getBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPost

> S3PresignUploadURLResponse getBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPost(s3PresignUploadURLRequest, authorization, xForwardedFor)

Get Built In Presigned Url

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // S3PresignUploadURLRequest
    s3PresignUploadURLRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPostRequest;

  try {
    const data = await api.getBuiltInPresignedUrlFileSystemBuiltInPresignUploadUrlPost(body);
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
| **s3PresignUploadURLRequest** | [S3PresignUploadURLRequest](S3PresignUploadURLRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**S3PresignUploadURLResponse**](S3PresignUploadURLResponse.md)

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

> FileSystemInfo getFileSystemInfoFileSystemDetailPost(fileSystemInfoRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## getUrlPrefixFileSystemUrlPrefixPost

> FileUrlPrefixResponse getUrlPrefixFileSystemUrlPrefixPost(fileUrlPrefixRequest)

Get Url Prefix

### Example

```ts
import {
  Configuration,
  FileSystemApi,
} from '';
import type { GetUrlPrefixFileSystemUrlPrefixPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new FileSystemApi();

  const body = {
    // FileUrlPrefixRequest
    fileUrlPrefixRequest: ...,
  } satisfies GetUrlPrefixFileSystemUrlPrefixPostRequest;

  try {
    const data = await api.getUrlPrefixFileSystemUrlPrefixPost(body);
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
| **fileUrlPrefixRequest** | [FileUrlPrefixRequest](FileUrlPrefixRequest.md) |  | |

### Return type

[**FileUrlPrefixResponse**](FileUrlPrefixResponse.md)

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

> UserFileSystemInfo getUserFileSystemInfoFileSystemUserFileSystemDetailPost(userFileSystemInfoRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**UserFileSystemInfo**](UserFileSystemInfo.md)

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

> FileSystemInstallResponse installUserFileSystemFileSystemInstallPost(fileSystemInstallRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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

> ProvideFileSystemSearchResponse provideFileSystemFileSystemProvidePost(fileSystemSearchRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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

> MineFileSystemSearchResponse searchMineFileSystemFileSystemMinePost(fileSystemSearchRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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

> NormalResponse updateFileSystemFileSystemUpdatePost(userFileSystemUpdateRequest, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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


## uploadFileSystemFileSystemGenericS3UploadPost

> GenericFileSystemUploadResponse uploadFileSystemFileSystemGenericS3UploadPost(file, filePath, contentType, authorization, xForwardedFor)

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
    // string (optional)
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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

