/**
 * MetaOps — 文档属性读取/修改
 */

const { encodeXmlEntities, decodeXmlEntities } = require("./xml_utils");

const META_FIELDS = [
  "dc:title", "dc:subject", "dc:creator", "dc:description",
  "dcterms:created", "dcterms:modified",
  "cp:keywords", "cp:category", "cp:contentStatus",
  "cp:lastModifiedBy", "cp:revision",
];

const APP_FIELDS = [
  "Application", "AppVersion", "Pages", "Words", "Characters",
  "Lines", "Paragraphs", "Company", "Manager",
];

const MetaOps = {
  read(coreXml) {
    const props = {};
    for (const field of META_FIELDS) {
      const re = new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i");
      const m = coreXml.match(re);
      if (m) props[field] = decodeXmlEntities(m[1]);
    }
    return props;
  },

  readApp(appXml) {
    const props = {};
    for (const f of APP_FIELDS) {
      const re = new RegExp(`<${f}[^>]*>([\\s\\S]*?)<\\/${f}>`, "i");
      const m = appXml.match(re);
      if (m) props[f] = decodeXmlEntities(m[1]);
    }
    return props;
  },

  update(coreXml, updates, dryRun = false) {
    let xml = coreXml;
    const updated = {};
    for (const [key, value] of Object.entries(updates)) {
      const re = new RegExp(`(<${key}[^>]*>)([\\s\\S]*?)(<\\/${key}>)`, "i");
      if (re.test(xml)) {
        if (!dryRun) xml = xml.replace(re, `$1${encodeXmlEntities(value)}$3`);
        updated[key] = value;
      } else {
        if (!dryRun) {
          xml = xml.replace(
            /<\/(?:cp:coreProperties|coreProperties)>/,
            `<${key}>${encodeXmlEntities(value)}</${key}>\n</coreProperties>`
          );
        }
        updated[key] = value;
      }
    }
    return { xml, updated };
  },
};

module.exports = { MetaOps };
