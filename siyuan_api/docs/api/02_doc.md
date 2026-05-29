# 文档

## 通过 Markdown 创建文档

* `/api/filetree/createDocWithMd`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn",
    "path": "/foo/bar",
    "markdown": ""
  }
  ```

    * `notebook`：笔记本 ID
    * `path`：文档路径，需要以 / 开头，中间使用 / 分隔层级（这里的 path 对应数据库 hpath 字段）
    * `markdown`：GFM Markdown 内容
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "20210914223645-oj2vnx2"
  }
  ```

    * `data`：创建好的文档 ID
    * 如果使用同一个 `path` 重复调用该接口，不会覆盖已有文档

## 重命名文档

* `/api/filetree/renameDoc`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210902210113-0avi12f.sy",
    "title": "文档新标题"
  }
  ```

    * `notebook`：笔记本 ID
    * `path`：文档路径
    * `title`：新标题
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 重命名文档：

* `/api/filetree/renameDocByID`
* 参数

  ```json
  {
    "id": "20210902210113-0avi12f",
    "title": "文档新标题"
  }
  ```

    * `id`：文档 ID
    * `title`：新标题
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 删除文档

* `/api/filetree/removeDoc`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210902210113-0avi12f.sy"
  }
  ```

    * `notebook`：笔记本 ID
    * `path`：文档路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 删除文档：

* `/api/filetree/removeDocByID`
* 参数

  ```json
  {
    "id": "20210902210113-0avi12f"
  }
  ```

    * `id`：文档 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 移动文档

* `/api/filetree/moveDocs`
* 参数

  ```json
  {
    "fromPaths": ["/20210917220056-yxtyl7i.sy"],
    "toNotebook": "20210817205410-2kvfpfn",
    "toPath": "/"
  }
  ```

    * `fromPaths`：源路径
    * `toNotebook`：目标笔记本 ID
    * `toPath`：目标路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

通过 `id` 移动文档：

* `/api/filetree/moveDocsByID`
* 参数

  ```json
  {
    "fromIDs": ["20210917220056-yxtyl7i"],
    "toID": "20210817205410-2kvfpfn"
  }
  ```

    * `fromIDs`：源文档 ID
    * `toID`：目标父文档 ID 或笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 根据路径获取人类可读路径

* `/api/filetree/getHPathByPath`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "path": "/20210917220500-sz588nq/20210917220056-yxtyl7i.sy"
  }
  ```

    * `notebook`：笔记本 ID
    * `path`：路径
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "/foo/bar"
  }
  ```

## 根据 ID 获取人类可读路径

* `/api/filetree/getHPathByID`
* 参数

  ```json
  {
    "id": "20210917220056-yxtyl7i"
  }
  ```

    * `id`：块 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": "/foo/bar"
  }
  ```

## 根据 ID 获取存储路径

* `/api/filetree/getPathByID`
* 参数

  ```json
  {
    "id": "20210808180320-fqgskfj"
  }
  ```

    * `id`：块 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
    "notebook": "20210808180117-czj9bvb",
    "path": "/20200812220555-lj3enxa/20210808180320-fqgskfj.sy"
    }
  }
  ```

## 根据人类可读路径获取 IDs

* `/api/filetree/getIDsByHPath`
* 参数

  ```json
  {
    "path": "/foo/bar",
    "notebook": "20210808180117-czj9bvb"
  }
  ```

    * `path`：人类可读路径
    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": [
        "20200813004931-q4cu8na"
    ]
  }
  ```

---

# 资源文件

## 上传资源文件

* `/api/asset/upload`
* 参数为 HTTP Multipart 表单

    * `assetsDirPath`：资源文件存放的文件夹路径，以 data 文件夹作为根路径，比如：
        * `"/assets/"`：工作空间/data/assets/ 文件夹
        * `"/assets/sub/"`：工作空间/data/assets/sub/ 文件夹

      常规情况下建议用第一种，统一存放到工作空间资源文件夹下，放在子目录有一些副作用，请参考用户指南资源文件章节。
    * `file[]`：上传的文件列表
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "errFiles": [""],
      "succMap": {
        "foo.png": "assets/foo-20210719092549-9j5y79r.png"
      }
    }
  }
  ```

    * `errFiles`：处理时遇到错误的文件名
    * `succMap`：处理成功的文件，key 为上传时的文件名，value 为 assets/foo-id.png，用于将已有 Markdown 内容中的资源文件链接地址替换为上传后的地址
