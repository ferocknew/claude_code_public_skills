[English](https://github.com/siyuan-note/siyuan/blob/master/API.md)

* [规范](#规范)
    * [参数和返回值](#参数和返回值)
    * [鉴权](#鉴权)
* [笔记本](01_notebook.md)
* [文档](02_doc.md)
* [块](03_block.md)
* [属性 + SQL + 模板](04_attr_sql_template.md)
* [文件 + 导出 + 转换 + 通知 + 网络 + 系统](05_file_export_misc.md)

---

## 规范

### 参数和返回值

* 端点：`http://127.0.0.1:6806`
* 均是 POST 方法
* 需要带参的接口，参数为 JSON 字符串，放置到 body 里，标头 Content-Type 为 `application/json`
* 返回值

  ```json
  {
    "code": 0,
    "msg": "",
    "data": {}
  }
  ```

    * `code`：非 0 为异常情况
    * `msg`：正常情况下是空字符串，异常情况下会返回错误文案
    * `data`：可能为 `{}`、`[]` 或者 `NULL`，根据不同接口而不同

### 鉴权

在 <kbd>设置 - 关于</kbd> 里查看 API token，请求标头：`Authorization: Token xxx`
