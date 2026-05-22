/**
 * XmlTableOps — 表格列表、读取、单元格修改
 */

const {
  extractAllXmlBlocks, extractParagraphText,
  extractRunProps, encodeXmlEntities,
} = require("./xml_utils");

const XmlTableOps = {
  listTables(documentXml) {
    const tables = extractAllXmlBlocks(documentXml, "w:tbl");
    return tables.map((t, i) => {
      const rows = extractAllXmlBlocks(t.xml, "w:tr");
      let maxCols = 0;
      for (const row of rows) {
        const cells = extractAllXmlBlocks(row.xml, "w:tc");
        maxCols = Math.max(maxCols, cells.length);
      }
      return { index: i, rows: rows.length, cols: maxCols };
    });
  },

  readTable(documentXml, tableIndex) {
    const tables = extractAllXmlBlocks(documentXml, "w:tbl");
    if (tableIndex >= tables.length) return null;

    const rows = extractAllXmlBlocks(tables[tableIndex].xml, "w:tr");
    return rows.map((row) => {
      const cells = extractAllXmlBlocks(row.xml, "w:tc");
      return cells.map((cell) => {
        const cellParas = extractAllXmlBlocks(cell.xml, "w:p");
        return cellParas.map((p) => extractParagraphText(p.xml)).join("\n");
      });
    });
  },

  updateTableCell(documentXml, tableIndex, rowIdx, colIdx, newText, dryRun = false) {
    const tables = extractAllXmlBlocks(documentXml, "w:tbl");
    if (tableIndex >= tables.length) return { xml: documentXml, updated: false };

    const table = tables[tableIndex];
    const rows = extractAllXmlBlocks(table.xml, "w:tr");
    if (rowIdx >= rows.length) return { xml: documentXml, updated: false };

    const row = rows[rowIdx];
    const cells = extractAllXmlBlocks(row.xml, "w:tc");
    if (colIdx >= cells.length) return { xml: documentXml, updated: false };

    if (dryRun) return { xml: documentXml, updated: true };

    const cell = cells[colIdx];
    const origParas = extractAllXmlBlocks(cell.xml, "w:p");
    const tcPr = cell.xml.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] || "";
    const pPr = origParas[0]?.xml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] || "";
    const runs = origParas[0] ? extractAllXmlBlocks(origParas[0].xml, "w:r") : [];
    const rPr = runs.length > 0 ? extractRunProps(runs[0].xml) : "";

    const newCellXml = `<w:tc>${tcPr}<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${encodeXmlEntities(newText)}</w:t></w:r></w:p></w:tc>`;

    const newRowXml = row.xml.substring(0, cell.start - row.start) + newCellXml + row.xml.substring(cell.end - row.start);
    const newTableXml = table.xml.substring(0, row.start - table.start) + newRowXml + table.xml.substring(row.end - table.start);
    const newDocXml = documentXml.substring(0, table.start) + newTableXml + documentXml.substring(table.end);

    return { xml: newDocXml, updated: true };
  },
};

module.exports = { XmlTableOps };
