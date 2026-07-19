from http.server import BaseHTTPRequestHandler
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        data = json.loads(post_data.decode('utf-8'))
        
        pdf_type = data.get('type', 'attendance')
        title = data.get('title', 'Event')
        coordinator = data.get('coordinator', 'N/A')
        date = data.get('date', 'N/A')
        time = data.get('time', 'N/A')
        venue = data.get('venue', 'N/A')
        students = data.get('students', [])
        
        # Create a file-like buffer to receive PDF data
        buffer = BytesIO()
        
        # Setup document (portrait, 0.5 inch margins)
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        # Define styles
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#000000'),
            alignment=1 # Center
        )
        subtitle_style = ParagraphStyle(
            'SubtitleStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#111111'),
            alignment=1 # Center
        )
        
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=8.5,
            leading=11
        )
        
        header_cell_style = ParagraphStyle(
            'HeaderCellStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=8.5,
            leading=11,
            textColor=colors.white,
            alignment=1 # Center
        )
        
        # 1. Header (College Name)
        story.append(Paragraph("DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA", title_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph("TECH MANTHAN 6.0", subtitle_style))
        story.append(Spacer(1, 2))
        
        report_titles = {
            'attendance': 'REGISTRANTS DIRECTORY & ATTENDANCE SHEET',
            'registrations': 'REGISTRATIONS DIRECTORY',
            'marksheet': 'OFFICIAL JUDGING MARKSHEET'
        }
        report_title = report_titles.get(pdf_type, 'EVENT REPORT')
        story.append(Paragraph(report_title, ParagraphStyle('ReportTitleStyle', parent=subtitle_style, fontSize=9, fontName='Helvetica-Oblique', textColor=colors.HexColor('#555555'))))
        story.append(Spacer(1, 10))
        
        # 2. Event Info block (Table)
        info_data = [
            [Paragraph(f"<b>🏆 Event Name:</b> {title}", body_style), Paragraph(f"<b>👤 Coordinator:</b> {coordinator}", body_style)],
            [Paragraph(f"<b>📅 Event Date:</b> {date}", body_style), Paragraph(f"<b>🕒 Event Time:</b> {time}", body_style)],
            [Paragraph(f"<b>📍 Venue:</b> {venue}", body_style), Paragraph(f"<b>📊 Total Students:</b> {len(students)}", body_style)]
        ]
        info_table = Table(info_data, colWidths=[270, 270])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fafafa')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#f0f0f0')),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 15))
        
        # 3. Students Table
        if pdf_type in ['attendance', 'registrations']:
            # Attendance columns: Sl No, Reg No, Student Name, Class, Email, Check-in/App Status, Signature
            table_data = [[
                Paragraph("Sl No", header_cell_style),
                Paragraph("Reg No", header_cell_style),
                Paragraph("Student Name", header_cell_style),
                Paragraph("Class", header_cell_style),
                Paragraph("Email Address", header_cell_style),
                Paragraph("App Status", header_cell_style),
                Paragraph("Signature / Sign", header_cell_style)
            ]]
            
            for idx, st in enumerate(students):
                status = "Present" if st.get('checkedIn', False) else "Absent"
                status_color = "#16a34a" if st.get('checkedIn', False) else "#dc2626"
                
                table_data.append([
                    Paragraph(str(idx + 1), body_style),
                    Paragraph(f"<b>{st.get('regNo', '')}</b>", body_style),
                    Paragraph(st.get('name', 'N/A'), body_style),
                    Paragraph(st.get('class', 'N/A'), body_style),
                    Paragraph(st.get('email', 'N/A'), body_style),
                    Paragraph(f"<font color='{status_color}'><b>{status}</b></font>", body_style),
                    Paragraph("", body_style) # Empty for signature
                ])
                
            col_widths = [30, 70, 110, 70, 120, 60, 80]
        else:
            # Marksheet columns: Sl No, Reg No, Student Name, Evaluation Breakdown, Final Score
            table_data = [[
                Paragraph("Sl No", header_cell_style),
                Paragraph("Reg No", header_cell_style),
                Paragraph("Student Name", header_cell_style),
                Paragraph("Judge Evaluation Breakdowns", header_cell_style),
                Paragraph("Final Average Score", header_cell_style)
            ]]
            
            for idx, st in enumerate(students):
                table_data.append([
                    Paragraph(str(idx + 1), body_style),
                    Paragraph(f"<b>{st.get('regNo', '')}</b>", body_style),
                    Paragraph(st.get('name', 'N/A'), body_style),
                    Paragraph(st.get('breakdownText', 'N/A'), body_style),
                    Paragraph(f"<b>{st.get('avgTotal', 0)} pts</b>", body_style)
                ])
                
            col_widths = [30, 80, 130, 210, 90]
            
        student_table = Table(table_data, colWidths=col_widths)
        student_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#5b21b6')), # Purple header
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#fafafa')]),
        ]))
        story.append(student_table)
        
        # 4. Footer signature
        story.append(Spacer(1, 30))
        footer_style = ParagraphStyle(
            'FooterStyle',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=9,
            alignment=2 # Right
        )
        story.append(Paragraph("Coordinator Signature: _______________________", footer_style))
        
        # Build PDF
        doc.build(story)
        
        pdf_data = buffer.getvalue()
        buffer.close()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/pdf')
        self.send_header('Content-Disposition', f'attachment; filename="{pdf_type}_{title.lower().replace(" ", "_")}.pdf"')
        self.send_header('Content-Length', str(len(pdf_data)))
        self.end_headers()
        self.wfile.write(pdf_data)
