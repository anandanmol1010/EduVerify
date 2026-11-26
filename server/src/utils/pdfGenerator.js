import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

// Generates a clean, mock document PDF clearly marked as fictional/demo
export const generateSamplePdf = ({ title, candidateName, rollNumber, board, passingYear, marksList, totalMarks, percentage, docType, outputPath, extraMeta }) => {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Decorative border
    doc.rect(20, 20, 555, 802).lineWidth(1.5).strokeColor('#254D3C').stroke();
    doc.rect(24, 24, 547, 794).lineWidth(0.5).strokeColor('#B18B56').stroke();

    // Prominent Demo Watermark Header
    doc.fillColor('#9E2A2B').fontSize(9).font('Helvetica-Bold')
       .text('*** FICTIONAL DEMO DOCUMENT — NOT A VALID ID OR GOVERNMENT RECORD ***', 40, 32, { align: 'center' });

    if (docType === 'aadhaar_card') {
      // Specialized Layout for Fictional Demo Identity Document
      doc.moveDown(0.8);
      doc.fillColor('#254D3C').fontSize(16).font('Helvetica-Bold')
         .text('UNIQUE DEMO IDENTIFICATION REPOSITORY (SIMULATED)', { align: 'center' });
      doc.fillColor('#6B716C').fontSize(9).font('Helvetica')
         .text('DigiLocker Demo Provider • Fictional Demo Identity Document for Educational Use', { align: 'center' });
      doc.moveDown(1);
      doc.strokeColor('#DDDCD5').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      doc.fillColor('#252824').fontSize(14).font('Helvetica-Bold')
         .text('FICTIONAL DEMO IDENTITY DOCUMENT', { align: 'center', underline: true });
      doc.moveDown(1);

      const startY = doc.y;
      doc.fillColor('#F7F6F2').rect(40, startY, 515, 140).fill();
      doc.strokeColor('#DDDCD5').rect(40, startY, 515, 140).stroke();

      doc.fillColor('#252824').fontSize(10).font('Helvetica-Bold');
      doc.text('Name / Full Legal Name:', 55, startY + 14);
      doc.font('Helvetica').text(candidateName, 210, startY + 14);

      doc.font('Helvetica-Bold').text('Date of Birth (DOB):', 55, startY + 34);
      doc.font('Helvetica').text(extraMeta?.dob || '15-08-2006', 210, startY + 34);

      doc.font('Helvetica-Bold').text('Gender:', 55, startY + 54);
      doc.font('Helvetica').text(extraMeta?.gender || 'Not Specified', 210, startY + 54);

      doc.font('Helvetica-Bold').text('Simulated Reference ID:', 55, startY + 74);
      doc.font('Helvetica').text(`DEMO-ID-${rollNumber.replace(/[^a-zA-Z0-9]/g, '')}`, 210, startY + 74);

      doc.font('Helvetica-Bold').text('Permanent Address:', 55, startY + 94);
      const addrStr = extraMeta?.address ? `${extraMeta.address.street}, ${extraMeta.address.city}, ${extraMeta.address.state} - ${extraMeta.address.pincode}` : '14 Temple Street, Malleshwaram, Bangalore, Karnataka - 560003';
      doc.font('Helvetica').text(addrStr, 210, startY + 94, { width: 330 });

      doc.y = startY + 160;

      doc.fillColor('#9E2A2B').fontSize(11).font('Helvetica-Bold')
         .text('ACADEMIC SIMULATION NOTICE & DISCLAIMER', 40, doc.y);
      doc.moveDown(0.5);
      doc.fillColor('#252824').fontSize(10).font('Helvetica')
         .text('This document is a synthetic, fictional representation of an identity document created strictly for the EduVerify college full-stack development project. It contains NO genuine government identity data, NO valid Aadhaar numbers, and CANNOT be used for genuine official or legal identity verification under any circumstances.', 40, doc.y, { width: 515, align: 'justify', lineGap: 4 });

      // Watermark in center of page
      doc.save();
      doc.fillColor('#9E2A2B').opacity(0.12).fontSize(30).font('Helvetica-Bold')
         .rotate(-30, { origin: [297, 421] })
         .text('FICTIONAL DEMO IDENTITY — NOT A VALID ID', 60, 420, { align: 'center' });
      doc.restore();

      doc.y = 670;
      doc.strokeColor('#DDDCD5').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);
      doc.fillColor('#6B716C').fontSize(8).font('Helvetica')
         .text('SECURITY NOTICE: Simulated identity certificate provided by EduVerify Mock Identity Provider. Not affiliated with any government agency or official statutory authority.', 40, doc.y, { width: 350, align: 'left', lineGap: 2 });
      doc.fillColor('#254D3C').fontSize(8).font('Helvetica-Bold')
         .text('[DEMO IDENTITY ARCHIVE]', 410, 690, { align: 'center' });
      doc.fillColor('#6B716C').fontSize(7).font('Helvetica')
         .text('EduVerify Mock Service\nRegistrar of Demographics (Demo)', 400, 705, { align: 'center' });

      doc.end();
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
      return;
    }

    // Organization Header
    doc.moveDown(0.8);
    doc.fillColor('#254D3C').fontSize(16).font('Helvetica-Bold')
       .text(`${board.toUpperCase()} ACADEMIC CERTIFICATION REPOSITORY`, { align: 'center' });
    
    doc.fillColor('#6B716C').fontSize(9).font('Helvetica')
       .text(`DigiLocker Demo Provider • Document Verification Archive • Session ${passingYear - 1}-${passingYear}`, { align: 'center' });
    
    doc.moveDown(1);
    doc.strokeColor('#DDDCD5').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Title
    doc.fillColor('#252824').fontSize(14).font('Helvetica-Bold')
       .text(title.toUpperCase(), { align: 'center', underline: true });
    doc.moveDown(1);

    // Metadata Table / Box
    const startY = doc.y;
    doc.fillColor('#F7F6F2').rect(40, startY, 515, 85).fill();
    doc.strokeColor('#DDDCD5').rect(40, startY, 515, 85).stroke();

    doc.fillColor('#252824').fontSize(10).font('Helvetica-Bold');
    doc.text('Candidate Name:', 55, startY + 12);
    doc.font('Helvetica').text(candidateName, 170, startY + 12);

    doc.font('Helvetica-Bold').text('Roll Number:', 55, startY + 30);
    doc.font('Helvetica').text(rollNumber, 170, startY + 30);

    doc.font('Helvetica-Bold').text('Examination Board:', 55, startY + 48);
    doc.font('Helvetica').text(board, 170, startY + 48);

    doc.font('Helvetica-Bold').text('Year of Passing:', 55, startY + 66);
    doc.font('Helvetica').text(String(passingYear), 170, startY + 66);

    doc.font('Helvetica-Bold').text('Document Status:', 330, startY + 12);
    doc.fillColor('#2B6E4E').font('Helvetica-Bold').text('VERIFIED ARCHIVE', 430, startY + 12);

    doc.fillColor('#252824').font('Helvetica-Bold').text('Doc Reference:', 330, startY + 30);
    doc.font('Helvetica').text(`DL-${board.substring(0, 3)}-${rollNumber}`, 430, startY + 30);

    doc.font('Helvetica-Bold').text('Issue Date:', 330, startY + 48);
    doc.font('Helvetica').text(`15-June-${passingYear}`, 430, startY + 48);

    doc.y = startY + 105;

    // Subject Breakdown if provided
    if (marksList && marksList.length > 0) {
      doc.fillColor('#254D3C').fontSize(11).font('Helvetica-Bold')
         .text('STATEMENT OF MARKS & EVALUATION', 40, doc.y);
      doc.moveDown(0.5);

      const tableY = doc.y;
      // Header row
      doc.fillColor('#254D3C').rect(40, tableY, 515, 22).fill();
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
      doc.text('Code / Subject Name', 50, tableY + 6);
      doc.text('Max Marks', 280, tableY + 6);
      doc.text('Marks Obtained', 370, tableY + 6);
      doc.text('Grade', 480, tableY + 6);

      let currentY = tableY + 22;
      doc.font('Helvetica').fontSize(9).fillColor('#252824');

      marksList.forEach((sub, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F7F6F2';
        doc.fillColor(rowBg).rect(40, currentY, 515, 20).fill();
        doc.strokeColor('#DDDCD5').rect(40, currentY, 515, 20).stroke();

        doc.fillColor('#252824');
        doc.text(sub.subjectName, 50, currentY + 5);
        doc.text(String(sub.maxMarks || 100), 295, currentY + 5);
        doc.font('Helvetica-Bold').text(String(sub.marksObtained), 390, currentY + 5);
        doc.font('Helvetica').text(sub.grade || 'A', 490, currentY + 5);

        currentY += 20;
      });

      // Total Row
      doc.fillColor('#ECEBE4').rect(40, currentY, 515, 24).fill();
      doc.strokeColor('#254D3C').rect(40, currentY, 515, 24).stroke();
      doc.fillColor('#254D3C').font('Helvetica-Bold').fontSize(9);
      doc.text('AGGREGATE / OVERALL PERCENTAGE', 50, currentY + 7);
      doc.text(`Total: ${totalMarks}`, 280, currentY + 7);
      doc.text(`Score: ${percentage}%`, 370, currentY + 7);
      doc.text(percentage >= 50 ? 'PASSED' : 'ELIGIBLE', 480, currentY + 7);

      doc.y = currentY + 35;
    } else {
      // General Certificate Body
      doc.fillColor('#252824').fontSize(11).font('Helvetica')
         .text(`This is to certify that ${candidateName}, Roll No. ${rollNumber}, has completed the prescribed secondary education examination requirements under ${board} in the year ${passingYear}.`, 40, doc.y, { width: 515, align: 'justify', lineGap: 4 });
      doc.moveDown(1.5);
      doc.text('The candidate has fulfilled standard academic criteria for course completion, moral discipline, and academic migration under standard secondary board regulations.', { width: 515, align: 'justify', lineGap: 4 });
      doc.moveDown(2);
    }

    // Disclaimer & Signatures Box
    doc.y = 670;
    doc.strokeColor('#DDDCD5').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    doc.fillColor('#6B716C').fontSize(8).font('Helvetica')
       .text('SECURITY NOTICE: This electronic transcript was generated automatically through the EduVerify DigiLocker Demo Simulation Gateway. It serves as an academic demonstration for automated admission verification workflows. Digitally logged and indexed in the demo repository.', 40, doc.y, { width: 350, align: 'left', lineGap: 2 });

    doc.fillColor('#254D3C').fontSize(8).font('Helvetica-Bold')
       .text('[DIGITALLY VERIFIED]', 430, 690, { align: 'center' });
    doc.fillColor('#6B716C').fontSize(7).font('Helvetica')
       .text('EduVerify Mock Service Authority\nController of Examinations (Demo)', 400, 705, { align: 'center' });

    doc.end();
    writeStream.on('finish', () => resolve(outputPath));
    writeStream.on('error', reject);
  });
};
