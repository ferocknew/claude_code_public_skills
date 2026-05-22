/**
 * ImageOps — 图片列表、导出、替换
 */

const path = require("path");
const fs = require("fs");

function extToType(ext) {
  const map = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".bmp": "image/bitmap", ".emf": "image/x-emf", ".wmf": "image/x-wmf",
  };
  return map[ext] || "application/octet-stream";
}

const ImageOps = {
  listImages(docx) {
    return docx.listFiles()
      .filter((f) => f.startsWith("word/media/"))
      .map((f) => {
        const name = f.replace("word/media/", "");
        return { name, path: f, type: extToType(path.extname(name).toLowerCase()) };
      });
  },

  async extractImage(docx, imageName, outputDir) {
    const data = await docx.readFile(`word/media/${imageName}`);
    if (!data) return null;
    const outPath = path.join(outputDir, imageName);
    fs.writeFileSync(outPath, data);
    return outPath;
  },

  async replaceImage(docx, imageName, newImagePath) {
    const internalPath = `word/media/${imageName}`;
    if (!docx.fileExists(internalPath)) return false;
    docx.writeFile(internalPath, fs.readFileSync(newImagePath));
    return true;
  },
};

module.exports = { ImageOps };
