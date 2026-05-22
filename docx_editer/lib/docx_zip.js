/**
 * DocxZip — ZIP 加载/保存/文件读写
 */

const fs = require("fs");
const JSZip = require("jszip");

class DocxZip {
  constructor(zip) {
    this.zip = zip;
  }

  static async fromFile(filePath) {
    const buf = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(buf);
    return new DocxZip(zip);
  }

  async toBuffer() {
    return this.zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  }

  async save(outputPath) {
    const buf = await this.toBuffer();
    fs.writeFileSync(outputPath, buf);
  }

  async readXml(internalPath) {
    const f = this.zip.file(internalPath);
    if (!f) return null;
    return f.async("string");
  }

  async writeXml(internalPath, xml) {
    this.zip.file(internalPath, xml);
  }

  async readFile(internalPath) {
    const f = this.zip.file(internalPath);
    if (!f) return null;
    return f.async("nodebuffer");
  }

  writeFile(internalPath, data) {
    this.zip.file(internalPath, data);
  }

  listFiles() {
    const files = [];
    this.zip.forEach((relPath) => files.push(relPath));
    return files;
  }

  fileExists(internalPath) {
    return this.zip.file(internalPath) !== null;
  }
}

module.exports = { DocxZip };
