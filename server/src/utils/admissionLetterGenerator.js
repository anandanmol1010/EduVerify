import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

export const generateAdmissionLetterPdf = async ({
  admissionId,
  studentName,
  applicationNumber,
  courseTitle,
  courseCode,
  departmentName,
  academicSession,
  issueDate,
  verificationUrl,
  outputPath,
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Generate QR Code image buffer
      const qrBuffer = await QRCode.toBuffer(verificationUrl, {
        width: 130,
        margin: 1,
        color: {
          dark: '#254D3C',
          light: '#FFFFFF',
        },
      });

      const doc = new PDFDocument({ size: 'A4', margin: 45 });
      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Elegant double border
      doc.rect(25, 25, 545, 792).lineWidth(1.5).strokeColor('#254D3C').stroke();
      doc.rect(29, 29, 537, 784).lineWidth(0.5).strokeColor('#B18B56').stroke();

      // University Crest / Top Emblem
      doc.fillColor('#254D3C').fontSize(20).font('Helvetica-Bold')
         .text('ST. JUDE INSTITUTE OF HIGHER SCIENCES', 45, 50, { align: 'center', characterSpacing: 1 });
      
      doc.fillColor('#B18B56').fontSize(10).font('Helvetica-Bold')
         .text('ACCREDITED GRADE A+ BY NAAC • ESTABLISHED 1982', { align: 'center', characterSpacing: 1.5 });
      
      doc.fillColor('#6B716C').fontSize(9).font('Helvetica')
         .text('Affiliated to Apex State Technical University • Knowledge Boulevard, Bangalore 560012', { align: 'center' });
      
      doc.moveDown(0.8);
      doc.strokeColor('#DDDCD5').lineWidth(1).moveTo(45, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(1.2);

      // Document Title
      doc.fillColor('#254D3C').fontSize(14).font('Helvetica-Bold')
         .text('PROVISIONAL ADMISSION CONFIRMATION LETTER', { align: 'center' });
      doc.fillColor('#6B716C').fontSize(9).font('Helvetica')
         .text(`Academic Session: ${academicSession} • Official Letter of Admission`, { align: 'center' });

      doc.moveDown(1.5);

      // Details Block
      const startY = doc.y;
      doc.fillColor('#F7F6F2').rect(45, startY, 505, 90).fill();
      doc.strokeColor('#DDDCD5').rect(45, startY, 505, 90).stroke();

      doc.fillColor('#252824').fontSize(9.5).font('Helvetica-Bold');
      doc.text('Admission Reference ID:', 60, startY + 12);
      doc.fillColor('#254D3C').font('Helvetica-Bold').text(admissionId, 210, startY + 12);

      doc.fillColor('#252824').font('Helvetica-Bold').text('Application Number:', 60, startY + 30);
      doc.font('Helvetica').text(applicationNumber, 210, startY + 30);

      doc.font('Helvetica-Bold').text('Candidate Name:', 60, startY + 48);
      doc.font('Helvetica-Bold').text(studentName, 210, startY + 48);

      doc.font('Helvetica-Bold').text('Date of Confirmation:', 60, startY + 66);
      doc.font('Helvetica').text(new Date(issueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 210, startY + 66);

      // Program Details (Right Column of box)
      doc.font('Helvetica-Bold').text('Program Allotted:', 340, startY + 12);
      doc.font('Helvetica-Bold').fillColor('#254D3C').text(`${courseTitle} (${courseCode})`, 340, startY + 28, { width: 195 });

      doc.fillColor('#252824').font('Helvetica-Bold').text('Department:', 340, startY + 54);
      doc.font('Helvetica').text(departmentName || 'Engineering & Computing', 340, startY + 68);

      doc.y = startY + 110;

      // Admission Text Body
      doc.fillColor('#252824').fontSize(10).font('Helvetica')
         .text(`Dear ${studentName},`, 45, doc.y);
      doc.moveDown(0.8);

      doc.text(
        `We are pleased to inform you that your application for admission to ${courseTitle} (${courseCode}) for the academic academic session ${academicSession} has been formally approved and confirmed after thorough automated and manual credential verification through the EduVerify Admissions Gateway.`,
        45,
        doc.y,
        { width: 505, align: 'justify', lineGap: 4 }
      );
      doc.moveDown(0.8);

      doc.text(
        `Your seat allocation has been confirmed against merit ranking and institutional seat quotas. This provisional admission is subject to the submission and physical verification of all original qualifying certificates during reporting day at the Office of the Registrar.`,
        45,
        doc.y,
        { width: 505, align: 'justify', lineGap: 4 }
      );
      doc.moveDown(1.2);

      // Key Directives Table
      doc.fillColor('#254D3C').fontSize(10).font('Helvetica-Bold').text('REPORTING INSTRUCTIONS & CONDITIONS:', 45, doc.y);
      doc.moveDown(0.5);

      const bullets = [
        'Commencement of academic orientation: First Monday of August 2026.',
        'Carry two self-attested photocopies of Class 10th and 12th certificates along with this letter.',
        'Deposit first-semester term fees online through the student portal within 10 days of issuance.',
        'Hostel room allotment will commence post physical document verification on campus.',
      ];

      bullets.forEach((b) => {
        doc.fillColor('#6B716C').fontSize(9).font('Helvetica').text(`•  ${b}`, 55, doc.y, { width: 490, lineGap: 2 });
      });

      doc.moveDown(1.5);

      // Footer with QR Code and Signatures
      const footerY = 620;
      doc.strokeColor('#DDDCD5').lineWidth(0.8).moveTo(45, footerY).lineTo(550, footerY).stroke();

      // Embed QR code
      doc.image(qrBuffer, 55, footerY + 15, { width: 95 });
      doc.fillColor('#6B716C').fontSize(7.5).font('Helvetica')
         .text('Scan with any standard QR reader\nor visit eduverify public verification portal\nto confirm authenticity of this document.', 160, footerY + 35, { width: 170 });

      // Signatory Section
      doc.fillColor('#252824').fontSize(9).font('Helvetica-Bold')
         .text('Dr. S. K. Ramanathan, Ph.D.', 380, footerY + 55, { align: 'right' });
      doc.fillColor('#6B716C').fontSize(8).font('Helvetica')
         .text('Dean of Academic Admissions\nSt. Jude Institute of Technology\n(Digitally Authenticated via EduVerify)', 330, footerY + 70, { align: 'right' });

      doc.end();
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};
