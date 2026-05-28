const https = require("https");
const { UA, CH_UA } = require("./config");

function buildHeaders(cookie, accept) {
  return {
    Accept: accept,
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Connection: "keep-alive",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookie,
    Origin: "https://88cha.com",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": UA,
    "sec-ch-ua": CH_UA,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
  };
}

function httpGet(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpGet(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.setEncoding("utf-8");
      res.on("data", c => data += c);
      res.on("end", () => resolve({ body: data, cookies: res.headers["set-cookie"] || [] }));
    }).on("error", reject);
  });
}

function httpGetStream(url, headers) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }

      const contentType = res.headers["content-type"] || "";
      let buffer = "";
      const events = [];

      res.setEncoding("utf-8");
      res.on("data", chunk => {
        // JSON 响应（非 SSE）直接收集
        if (contentType.includes("application/json")) {
          buffer += chunk;
          return;
        }

        buffer += chunk;
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop();

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (line.startsWith("data:")) {
              try {
                events.push(JSON.parse(line.slice(5).trim()));
              } catch { /* skip */ }
            }
          }
        }
      });

      res.on("end", () => {
        // JSON 响应解析
        if (contentType.includes("application/json")) {
          try {
            events.push(JSON.parse(buffer));
          } catch { /* skip */ }
          return resolve(events);
        }

        if (buffer.trim()) {
          for (const line of buffer.split("\n")) {
            if (line.startsWith("data:")) {
              try { events.push(JSON.parse(line.slice(5).trim())); } catch { /* skip */ }
            }
          }
        }
        resolve(events);
      });
    }).on("error", reject);
  });
}

module.exports = { buildHeaders, httpGet, httpGetStream };
