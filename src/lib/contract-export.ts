import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from "docx";
import { saveAs } from "file-saver";
import { buildContractSections, buildSignatureBlock, type ContractData } from "./contract-template";

export type ContractSection = { title: string; paragraphs: string[] };
export type ContractSig = { location: string; contratada: string; contratante: string; contratanteRole: string };
export type ExportOverrides = { sections?: ContractSection[]; sig?: ContractSig };

export function contractToPlainText(d: ContractData, ov: ExportOverrides = {}): string {
  const sections = ov.sections ?? buildContractSections(d);
  const sig = ov.sig ?? buildSignatureBlock(d);
  const out: string[] = [];
  for (const s of sections) {
    out.push(s.title);
    out.push("");
    for (const p of s.paragraphs) { out.push(p); out.push(""); }
  }
  out.push("");
  out.push(sig.location);
  out.push("");
  out.push("____________________________________");
  out.push(sig.contratada);
  out.push("CONTRATADA");
  out.push("");
  out.push("____________________________________");
  out.push(sig.contratante);
  out.push(sig.contratanteRole);
  return out.join("\n");
}

export function exportPDF(d: ContractData, ov: ExportOverrides = {}) {
  const sections = ov.sections ?? buildContractSections(d);
  const sig = ov.sig ?? buildSignatureBlock(d);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const writeLine = (text: string, opts: { bold?: boolean; size?: number; align?: "left"|"center" } = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 11);
    const lines = doc.splitTextToSize(text, maxW);
    for (const line of lines) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      doc.text(line, opts.align === "center" ? pageW / 2 : margin, y, { align: opts.align ?? "left" });
      y += (opts.size ?? 11) * 1.35;
    }
  };

  for (const s of sections) {
    y += 6;
    writeLine(s.title, { bold: true, size: 12 });
    y += 4;
    for (const p of s.paragraphs) {
      writeLine(p, { size: 11 });
      y += 4;
    }
  }
  y += 24;
  writeLine(sig.location, { size: 11 });
  y += 30;
  writeLine("____________________________________", { align: "center" });
  writeLine(sig.contratada, { bold: true, align: "center" });
  writeLine("CONTRATADA", { align: "center" });
  y += 20;
  writeLine("____________________________________", { align: "center" });
  writeLine(sig.contratante, { bold: true, align: "center" });
  writeLine(sig.contratanteRole, { align: "center" });

  doc.save(`${d.contract_number || "contrato"}.pdf`);
}

export async function exportDOCX(d: ContractData, ov: ExportOverrides = {}) {
  const sections = ov.sections ?? buildContractSections(d);
  const sig = ov.sig ?? buildSignatureBlock(d);
  const children: Paragraph[] = [];

  for (const s of sections) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: s.title, bold: true })],
      spacing: { before: 200, after: 120 },
    }));
    for (const p of s.paragraphs) {
      for (const line of p.split("\n")) {
        children.push(new Paragraph({
          children: [new TextRun({ text: line })],
          spacing: { after: 100 },
          alignment: AlignmentType.JUSTIFIED,
        }));
      }
    }
  }
  children.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun(sig.location)] }));
  children.push(new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun("____________________________________")] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sig.contratada, bold: true })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun("CONTRATADA")] }));
  children.push(new Paragraph({ spacing: { before: 300 }, alignment: AlignmentType.CENTER, children: [new TextRun("____________________________________")] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: sig.contratante, bold: true })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun(sig.contratanteRole)] }));

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1133, bottom: 1133, left: 1133, right: 1133 } } },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${d.contract_number || "contrato"}.docx`);
}
