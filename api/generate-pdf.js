const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

module.exports = async function handleGeneratePDF(req, res) {
  try {
    const payload = req.body || {};
    const { type, title, coordinator, date, time, venue, round, judge, students, headers, rows } = payload;

    // Build standard headers and rows if type is attendance or registrations
    let tableHeaders = headers || [];
    let tableRows = rows || [];

    if ((type === 'attendance' || type === 'registrations') && Array.isArray(students)) {
      tableHeaders = ["Sl No", "Reg No", "Student Name", "Class", "Email Address", "Status"];
      tableRows = students.map((st, idx) => [
        idx + 1,
        st.regNo || "N/A",
        st.name || "N/A",
        st.class || "N/A",
        st.email || "N/A",
        st.checkedIn ? "PRESENT" : "ABSENT"
      ]);
    }

    // Determine layout: landscape if more than 6 columns
    const isLandscape = tableHeaders.length > 6;
    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 30,
      bufferPages: true
    });

    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': 'inline; filename="report.pdf"'
      });
      res.end(pdfBuffer);
    });

    const pageWidth = isLandscape ? 841.89 : 595.28;
    const pageHeight = isLandscape ? 595.28 : 841.89;
    const margin = 30;
    const contentWidth = pageWidth - (margin * 2);

    // Header Background Accent Bar
    doc.rect(margin, margin, contentWidth, 54).fill('#0f172a');

    // College & Event Header Text
    doc.fillColor('#00f3ff')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('TECH MANTHAN 6.0', margin + 15, margin + 8, { width: contentWidth - 30, align: 'left' });

    doc.fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Dr. B. B. HEGDE FIRST GRADE COLLEGE, KUNDAPURA', margin + 15, margin + 26, { width: contentWidth - 30, align: 'left' });

    let subTitleText = (title || 'EVENT REPORT').toUpperCase();
    if (type === 'attendance') subTitleText = `ATTENDANCE REPORT: ${subTitleText}`;
    else if (type === 'registrations') subTitleText = `REGISTRATIONS DIRECTORY: ${subTitleText}`;
    else if (type === 'marksheet') subTitleText = `MARKSHEET REPORT: ${subTitleText} ${round ? `(${round.toUpperCase()})` : ''}`;

    doc.fillColor('#cbd5e1')
      .font('Helvetica')
      .fontSize(8)
      .text(subTitleText, margin + 15, margin + 38, { width: contentWidth - 30, align: 'left' });

    let startY = margin + 64;

    // Metadata Summary Box (2 Rows for clean spacing)
    const metaBoxHeight = 36;
    doc.rect(margin, startY, contentWidth, metaBoxHeight).fill('#f1f5f9').stroke('#cbd5e1');

    // Row 1: Date, Time, Venue, Judge
    doc.fillColor('#334155').font('Helvetica-Bold').fontSize(8.5);
    const metaPartsRow1 = [];
    if (date) metaPartsRow1.push(`Date: ${date}`);
    if (time) metaPartsRow1.push(`Time: ${time}`);
    if (venue) metaPartsRow1.push(`Venue: ${venue}`);
    if (judge) metaPartsRow1.push(`Judge: ${judge}`);

    doc.text(metaPartsRow1.join('   |   '), margin + 10, startY + 6, { width: contentWidth - 20, align: 'left' });

    // Row 2: Event Coordinator
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.5);
    doc.text(`Event Coordinator: ${coordinator || 'Unassigned'}`, margin + 10, startY + 20, { width: contentWidth - 20, align: 'left' });

    startY += metaBoxHeight + 12;

    // Render Table
    if (tableHeaders.length > 0) {
      // Calculate Column Widths dynamically
      const colCount = tableHeaders.length;
      let colWidths = [];

      if (type === 'attendance' || type === 'registrations') {
        colWidths = [
          contentWidth * 0.08, // Sl No
          contentWidth * 0.18, // Reg No
          contentWidth * 0.26, // Name
          contentWidth * 0.16, // Class
          contentWidth * 0.20, // Email
          contentWidth * 0.12  // Status
        ];
      } else {
        colWidths = tableHeaders.map((h, i) => {
          const text = String(h).toLowerCase();
          if (text.includes('name')) return (contentWidth / colCount) * 1.4;
          if (text.includes('sl') || text.includes('no')) return (contentWidth / colCount) * 0.6;
          return contentWidth / colCount;
        });
        const currentSum = colWidths.reduce((a, b) => a + b, 0);
        colWidths = colWidths.map(w => (w / currentSum) * contentWidth);
      }

      // Draw Table Header
      const headerHeight = 22;
      doc.rect(margin, startY, contentWidth, headerHeight).fill('#1e293b');

      let currentX = margin;
      tableHeaders.forEach((h, i) => {
        const w = colWidths[i];
        doc.fillColor('#ffffff')
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(String(h).toUpperCase(), currentX + 4, startY + 6, {
            width: w - 8,
            align: (i === 0 || h.toString().toLowerCase().includes('score')) ? 'center' : 'left',
            lineBreak: false
          });
        currentX += w;
      });

      startY += headerHeight;

      // Draw Table Rows
      const rowHeight = 20;
      const maxY = pageHeight - margin - 35;

      tableRows.forEach((row, rowIndex) => {
        if (startY + rowHeight > maxY) {
          doc.addPage();
          startY = margin + 10;

          // Repeat Header on new page
          doc.rect(margin, startY, contentWidth, headerHeight).fill('#1e293b');
          let pageX = margin;
          tableHeaders.forEach((h, i) => {
            const w = colWidths[i];
            doc.fillColor('#ffffff')
              .font('Helvetica-Bold')
              .fontSize(8)
              .text(String(h).toUpperCase(), pageX + 4, startY + 6, {
                width: w - 8,
                align: (i === 0 || h.toString().toLowerCase().includes('score')) ? 'center' : 'left',
                lineBreak: false
              });
            pageX += w;
          });
          startY += headerHeight;
        }

        // Alternating row background
        const bg = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(margin, startY, contentWidth, rowHeight).fill(bg).stroke('#e2e8f0');

        let cellX = margin;
        row.forEach((cellVal, cellIdx) => {
          const w = colWidths[cellIdx];
          let valStr = String(cellVal !== undefined && cellVal !== null ? cellVal : '');

          if (valStr === 'PRESENT') {
            doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(8);
          } else if (valStr === 'ABSENT') {
            doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(8);
          } else {
            doc.fillColor('#334155').font('Helvetica').fontSize(8);
          }

          const isCenter = (cellIdx === 0 || tableHeaders[cellIdx].toString().toLowerCase().includes('score') || valStr === 'PRESENT' || valStr === 'ABSENT');
          doc.text(valStr, cellX + 4, startY + 5, {
            width: w - 8,
            align: isCenter ? 'center' : 'left',
            lineBreak: false
          });
          cellX += w;
        });

        startY += rowHeight;
      });

      // Signature & Coordinator Signoff at end of table
      if (startY + 45 > maxY) {
        doc.addPage();
        startY = margin + 20;
      } else {
        startY += 20;
      }

      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5);
      doc.text(`Event Coordinator: ${coordinator || 'Unassigned'}`, margin + 10, startY);
      doc.text(`Signature: ___________________________`, contentWidth - 190, startY);
    }

    // Add Page Numbers in Footer for all pages
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor('#64748b')
        .font('Helvetica')
        .fontSize(7.5)
        .text(
          `Tech Manthan 6.0 Report  |  Generated on: ${new Date().toLocaleString('en-IN')}  |  Page ${i + 1} of ${range.count}`,
          margin,
          pageHeight - margin + 10,
          { width: contentWidth, align: 'center' }
        );
    }

    doc.end();
  } catch (err) {
    console.error('PDF Generation Error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF document', details: err.message });
    }
  }
};
