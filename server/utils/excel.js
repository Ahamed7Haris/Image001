const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../output');
const EXCEL_PATH = path.join(OUTPUT_DIR, 'members.xlsx');

function getMembers() {
  if (!fs.existsSync(EXCEL_PATH)) return [];
  const workbook = XLSX.readFile(EXCEL_PATH);
  const data = XLSX.utils.sheet_to_json(workbook.Sheets['Members']);
  return data;
}

function saveToExcel(data) {
  let workbook, worksheetData;

  if (fs.existsSync(EXCEL_PATH)) {
    workbook = XLSX.readFile(EXCEL_PATH);
    worksheetData = XLSX.utils.sheet_to_json(workbook.Sheets['Members']);
    worksheetData.push(data);
  } else {
    workbook = XLSX.utils.book_new();
    worksheetData = [data];
  }

  const newSheet = XLSX.utils.json_to_sheet(worksheetData);
  if (workbook.SheetNames.includes('Members')) {
    delete workbook.Sheets['Members'];
    const idx = workbook.SheetNames.indexOf('Members');
    workbook.SheetNames.splice(idx, 1);
  }

  XLSX.utils.book_append_sheet(workbook, newSheet, 'Members');
  XLSX.writeFile(workbook, EXCEL_PATH);
}

function updateMember(updated) {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Members'];
  let members = XLSX.utils.sheet_to_json(sheet);
  const index = members.findIndex(m => m.email === updated.email);
  if (index === -1) throw new Error('Member not found');
  members[index] = updated;
  const newSheet = XLSX.utils.json_to_sheet(members);
  workbook.Sheets['Members'] = newSheet;
  XLSX.writeFile(workbook, EXCEL_PATH);
}

function deleteMember(email, designation) {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets['Members'];
  let members = XLSX.utils.sheet_to_json(sheet);
  const filtered = members.filter(
    m => !(m.email === email && m.designation === designation)
  );
  const newSheet = XLSX.utils.json_to_sheet(filtered);
  workbook.Sheets['Members'] = newSheet;
  XLSX.writeFile(workbook, EXCEL_PATH);
}

function getMembersByDesignation(designation) {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const members = XLSX.utils.sheet_to_json(workbook.Sheets['Members']);
  return members.filter(m => m.designation === designation);
}

module.exports = {
  saveToExcel,
  getMembers,
  updateMember,
  deleteMember,
  getMembersByDesignation
};
