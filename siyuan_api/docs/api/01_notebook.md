# 笔记本

## 列出笔记本

* `/api/notebook/lsNotebooks`
* 不带参
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "notebooks": [
        {
          "id": "20210817205410-2kvfpfn",
          "name": "测试笔记本",
          "icon": "1f41b",
          "sort": 0,
          "closed": false
        },
        {
          "id": "20210808180117-czj9bvb",
          "name": "思源笔记用户指南",
          "icon": "1f4d4",
          "sort": 1,
          "closed": false
        }
      ]
    }
  }
  ```

## 打开笔记本

* `/api/notebook/openNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 关闭笔记本

* `/api/notebook/closeNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 重命名笔记本

* `/api/notebook/renameNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0",
    "name": "笔记本的新名称"
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 创建笔记本

* `/api/notebook/createNotebook`
* 参数

  ```json
  {
    "name": "笔记本的名称"
  }
  ```
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "notebook": {
        "id": "20220126215949-r1wvoch",
        "name": "笔记本的名称",
        "icon": "",
        "sort": 0,
        "closed": false
      }
    }
  }
  ```

## 删除笔记本

* `/api/notebook/removeNotebook`
* 参数

  ```json
  {
    "notebook": "20210831090520-7dvbdv0"
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": null
  }
  ```

## 获取笔记本配置

* `/api/notebook/getNotebookConf`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn"
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "box": "20210817205410-2kvfpfn",
      "conf": {
        "name": "测试笔记本",
        "closed": false,
        "refCreateSavePath": "",
        "createDocNameTemplate": "",
        "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
        "dailyNoteTemplatePath": ""
      },
      "name": "测试笔记本"
    }
  }
  ```

## 保存笔记本配置

* `/api/notebook/setNotebookConf`
* 参数

  ```json
  {
    "notebook": "20210817205410-2kvfpfn",
    "conf": {
        "name": "测试笔记本",
        "closed": false,
        "refCreateSavePath": "",
        "createDocNameTemplate": "",
        "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
        "dailyNoteTemplatePath": ""
      }
  }
  ```

    * `notebook`：笔记本 ID
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {
      "name": "测试笔记本",
      "closed": false,
      "refCreateSavePath": "",
      "createDocNameTemplate": "",
      "dailyNoteSavePath": "/daily note/{{now | date \"2006/01\"}}/{{now | date \"2006-01-02\"}}",
      "dailyNoteTemplatePath": ""
    }
  }
  ```
