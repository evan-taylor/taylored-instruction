import {
  CertificateFileError,
  type ParsedCertificateFile,
  type PdfTextItem,
  parseAhaSheet,
  parseArcRoster,
  UNRECOGNIZED_FILE,
} from "./student-certificates";

export const MAX_CERTIFICATE_FILE_BYTES = 10 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const OLE_MAGIC = [0xd0, 0xcf, 0x11, 0xe0];

function startsWith(bytes: Uint8Array, magic: number[]) {
  return magic.every((byte, index) => bytes[index] === byte);
}

async function pdfItems(bytes: Uint8Array) {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const items: PdfTextItem[] = [];
  for (let page = 1; page <= pdf.numPages; page += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: pages are read in order
    const content = await (await pdf.getPage(page)).getTextContent();
    for (const item of content.items) {
      if ("str" in item) {
        items.push({
          page,
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
        });
      }
    }
  }
  return items;
}

/**
 * Reads an uploaded certificate file by its content, not its name: an Excel
 * workbook is an AHA eCard export, a PDF is a Red Cross class roster.
 */
export async function readCertificateFile(
  bytes: Uint8Array
): Promise<ParsedCertificateFile> {
  if (bytes.byteLength > MAX_CERTIFICATE_FILE_BYTES) {
    throw new CertificateFileError(
      "Certificate files must be 10 MB or smaller."
    );
  }
  const head = new TextDecoder().decode(bytes.slice(0, 1024));
  if (head.includes(PDF_MAGIC)) {
    let items: PdfTextItem[];
    try {
      items = await pdfItems(bytes);
    } catch (error) {
      throw new CertificateFileError(
        "This PDF could not be read. Download the class roster again and upload the new copy.",
        { cause: error }
      );
    }
    return parseArcRoster(items);
  }
  if (startsWith(bytes, ZIP_MAGIC) || startsWith(bytes, OLE_MAGIC)) {
    const { read, utils } = await import("xlsx");
    let rows: (string | number | boolean | null)[][];
    try {
      const workbook = read(bytes, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
      rows = sheet
        ? utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null })
        : [];
    } catch (error) {
      throw new CertificateFileError(UNRECOGNIZED_FILE, { cause: error });
    }
    return parseAhaSheet(rows);
  }
  throw new CertificateFileError(UNRECOGNIZED_FILE);
}
