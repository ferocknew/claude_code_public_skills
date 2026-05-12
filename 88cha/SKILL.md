---
name: 88cha
description: 当用户需要"搜索企业信息"、"查公司"、"查企业"、"企业工商信息"、"88查"、"查老板"、"查股东"时使用此 skill。支持通过 88cha.com 搜索企业工商信息，返回企业名称、法人、注册资本、经营范围、注册地址等信息。支持普通搜索和深度搜索两种模式。
version: 260512.234051
---

# 88查企业搜索

通过 88cha.com 搜索企业工商信息，返回结构化数据。

## 可用工具

### search - 企业搜索（默认模式）

**参数：**
- `keyword` (必需): 搜索关键词（企业名称、法人名等）
- `cookie` (首次必需): 88cha.com 完整 Cookie，首次传入后自动保存，后续无需再传
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 10

### stream - 深度搜索

使用 SSE 流式接口，返回更丰富的搜索推理结果。

**参数：**
- `keyword` (必需): 搜索关键词
- `cookie` (首次必需): 同上

**使用示例：**

首次搜索（Cookie 自动保存）：
```bash
node skill.js "腾讯" --cookie "YOUR_COOKIE"
```

后续搜索无需再传 Cookie：
```bash
node skill.js "阿里巴巴"
node skill.js "字节跳动" --page 2
node skill.js "华为" --stream
node skill.js "小米" --raw
```

## 返回字段

| 字段 | 说明 |
|------|------|
| companyName | 企业名称 |
| legalPerson | 法定代表人 |
| regCapital | 注册资本 |
| establishDate | 成立日期 |
| businessScope | 经营范围 |
| regAddress | 注册地址 |
| companyStatus | 经营状态 |
| socialCreditCode | 统一社会信用代码 |
| companyType | 企业类型 |
| phone | 电话 |
| email | 邮箱 |

## 注意事项

1. **Cookie 获取**：需从浏览器获取 88cha.com 的完整 Cookie（包含 `_m_h5_tk`）
2. **MTOP 签名**：使用阿里巴巴 MTOP 标准签名算法（MD5）
3. **Cookie 过期**：搜索失败时通常是 Cookie 过期，需重新获取

## 获取 Cookie

1. 打开 https://88cha.com/
2. 登录账户
3. F12 → Network → 任意请求 → Headers → Cookie 中复制完整值
4. 必须包含 `_m_h5_tk` 字段（用于签名计算）

**注意：** 当搜索失败时，通常是 Cookie 已过期，请提醒使用者重新获取并提供新的 Cookie 值。
