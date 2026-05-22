/**
 * HeaderFooterOps — 页眉页脚读取/替换
 */

const { extractAllXmlBlocks, extractParagraphText } = require("./xml_utils");
const { XmlTextOps } = require("./text_ops");

const HeaderFooterOps = {
  getHeaderFooterFiles(docx) {
    const files = docx.listFiles();
    return {
      headers: files.filter((f) => /^word\/header\d*\.xml$/.test(f)),
      footers: files.filter((f) => /^word\/footer\d*\.xml$/.test(f)),
    };
  },

  readText(xml) {
    return extractAllXmlBlocks(xml, "w:p").map((p) => extractParagraphText(p.xml));
  },

  replaceText(xml, findStr, replaceStr, dryRun = false) {
    return XmlTextOps.replaceText(xml, findStr, replaceStr, dryRun);
  },
};

module.exports = { HeaderFooterOps };
