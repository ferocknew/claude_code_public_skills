# 文件

## 获取文件

* `/api/file/getFile`
* 参数

  ```json
  {
    "path": "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy"
  }
  ```
    * `path`：工作空间路径下的文件路径
* 返回值

    * 响应状态码 `200`: 文件内容
    * 响应状态码 `202`: 异常信息

      ```json
      {
        "code": 404,
        "msg": "",
        "data": null
      }
      ```

        * `code`: 非零的异常值

            * `-1`: 参数解析错误
            * `403`: 无访问权限 (文件不在工作空间下)
            * `404`: 未找到 (文件不存在)
            * `405`: 方法不被允许 (这是一个目录)
            * `500`: 服务器错误 (文件查询失败 / 文件读取失败)
        * `msg`: 一段描述错误的文本

## 写入文件

* `/api/file/putFile`
* 参数为 HTTP Multipart 表单

    * `path`：工作空间路径下的文件路径
    * `isDir`：是否为创建文件夹，为 `true` 时仅创建文件夹，忽略 `file`
    * `modTime`：最近访问和修改时间，Unix time
    * `file`：上传的文件
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 删除文件

* `/api/file/removeFile`
* 参数

  ```json
  {
    "path": "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p.sy"
  }
  ```
    * `path`：工作空间路径下的文件路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 重命名文件

* `/api/file/renameFile`
* 参数

  ```json
  {
    "path": "/data/assets/image-20230523085812-k3o9t32.png",
    "newPath": "/data/assets/test-20230523085812-k3o9t32.png"
  }
  ```
    * `path`：工作空间路径下的文件路径
    * `newPath`：新的文件路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 列出文件

* `/api/file/readDir`
* 参数

  ```json
  {
    "path": "/data/20210808180117-6v0mkxr/20200923234011-ieuun1p"
  }
  ```
    * `path`：工作空间路径下的文件夹路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
      {
        "isDir": true,
        "isSymlink": false,
        "name": "20210808180303-6yi0dv5",
        "updated": 1691467624
      },
      {
        "isDir": false,
        "isSymlink": false,
        "name": "20210808180303-6yi0dv5.sy",
        "updated": 1663298365
      }
    ]
  }
  ```

---

# 导出

## 导出 Markdown 文本

* `/api/export/exportMdContent`
* 参数

  ```json
  {
    "id": ""
  }
  ```

    * `id`：要导出的文档块 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "hPath": "/0 请从这里开始",
      "content": "## 🍫 内容块\n\n在思源中，唯一重要的核心概念是..."
    }
  }
  ```

    * `hPath`：人类可读的路径
    * `content`：Markdown 内容

## 导出文件与目录

* `/api/export/exportResources`
* 参数

  ```json
  {
    "paths": [
      "/conf/appearance/boot",
      "/conf/appearance/langs",
      "/conf/appearance/emojis/conf.json",
      "/conf/appearance/icons/index.html"
    ],
    "name": "zip-file-name"
  }
  ```

    * `paths`：要导出的文件或文件夹路径列表，相同名称的文件/文件夹会被覆盖
    * `name`：（可选）导出的文件名，未设置时默认为 `export-YYYY-MM-DD_hh-mm-ss.zip`
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "path": "temp/export/zip-file-name.zip"
    }
  }
  ```

    * `path`：创建的 `*.zip` 文件路径
        * `zip-file-name.zip` 中的目录结构如下所示：
            * `zip-file-name`
                * `boot`
                * `langs`
                * `conf.json`
                * `index.html`

---

# 转换

## Pandoc

* `/api/convert/pandoc`
* 工作目录
    * 执行调用 pandoc 命令时工作目录会被设置在 `工作空间/temp/convert/pandoc/${test}` 下
    * 可先通过 API [`写入文件`](#写入文件) 将待转换文件写入该目录
    * 然后再调用该 API 进行转换，转换后的文件也会被写入该目录
    * 最后调用 API [`获取文件`](#获取文件) 获取转换后的文件内容
        * 或者调用 API [`通过 Markdown 创建文档`](./02_doc.md#通过-markdown-创建文档)
        * 或者调用内部 API `importStdMd` 将转换后的文件夹直接导入
* 参数

  ```json
  {
    "dir": "test",
    "args": [
      "--to", "markdown_strict-raw_html",
      "foo.epub",
      "-o", "foo.md"
   ]
  }
  ```

    * `args`：Pandoc 命令行参数
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
       "path": "/temp/convert/pandoc/test"
    }
  }
  ```
    * `path`：工作空间下的路径

---

# 通知

## 推送消息

* `/api/notification/pushMsg`
* 参数

  ```json
  {
    "msg": "test",
    "timeout": 7000
  }
  ```
    * `timeout`：消息持续显示时间，单位为毫秒。可以不传入该字段，默认为 7000 毫秒
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
        "id": "62jtmqi"
    }
  }
  ```
    * `id`：消息 ID

## 推送报错消息

* `/api/notification/pushErrMsg`
* 参数

  ```json
  {
    "msg": "test",
    "timeout": 7000
  }
  ```
    * `timeout`：消息持续显示时间，单位为毫秒。可以不传入该字段，默认为 7000 毫秒
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
        "id": "qc9znut"
    }
  }
  ```
    * `id`：消息 ID

---

# 网络

## 正向代理

* `/api/network/forwardProxy`
* 参数

  ```json
  {
    "url": "https://b3log.org/siyuan/",
    "method": "GET",
    "timeout": 7000,
    "contentType": "text/html",
    "headers": [
        {
            "Cookie": ""
        }
    ],
    "payload": {},
    "payloadEncoding": "text",
    "responseEncoding": "text"
  }
  ```

    * `url`：转发的 URL
    * `method`：HTTP 方法，默认为 `GET`
    * `timeout`：超时时间，单位为毫秒，默认为 `7000` 毫秒
    * `contentType`：HTTP Content-Type，默认为 `application/json`
    * `headers`：HTTP 请求标头
    * `payload`：HTTP 请求体，对象或者是字符串
    * `payloadEncoding`：`pyaload` 所使用的编码方案，默认为 `text`，可选值如下所示

        * `text`
        * `base64` | `base64-std`
        * `base64-url`
        * `base32` | `base32-std`
        * `base32-hex`
        * `hex`
    * `responseEncoding`：响应数据中 `body` 字段所使用的编码方案，默认为 `text`，可选值如下所示

        * `text`
        * `base64` | `base64-std`
        * `base64-url`
        * `base32` | `base32-std`
        * `base32-hex`
        * `hex`
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "body": "",
      "bodyEncoding": "text",
      "contentType": "text/html",
      "elapsed": 1976,
      "headers": {
      },
      "status": 200,
      "url": "https://b3log.org/siyuan"
    }
  }
  ```

    * `bodyEncoding`：`body` 所使用的编码方案，与请求中 `responseEncoding` 字段一致，默认为 `text`，可能的值如下所示

        * `text`
        * `base64` | `base64-std`
        * `base64-url`
        * `base32` | `base32-std`
        * `base32-hex`
        * `hex`

---

# 系统

## 获取启动进度

* `/api/system/bootProgress`
* 不带参
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "details": "Finishing boot...",
      "progress": 100
    }
  }
  ```

## 获取系统版本

* `/api/system/version`
* 不带参
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "1.3.5"
  }
  ```

## 获取系统当前时间

* `/api/system/currentTime`
* 不带参
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": 1631850968131
  }
  ```

    * `data`: 精度为毫秒
