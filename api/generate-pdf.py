from http.server import BaseHTTPRequestHandler
import json
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
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
        
        # 1. Header (College Name & Logo)
        import os
        logo_path = os.path.join(os.path.dirname(__file__), '..', 'college_logo.png')
        event_logo_path = os.path.join(os.path.dirname(__file__), '..', 'event_logo.png')
        
        report_titles = {
            'attendance': 'REGISTRANTS DIRECTORY & ATTENDANCE SHEET',
            'registrations': 'REGISTRATIONS DIRECTORY',
            'marksheet': f"OFFICIAL JUDGING MARKSHEET - {data.get('round', '').upper()}" if data.get('round') else 'OFFICIAL JUDGING MARKSHEET'
        }
        report_title = report_titles.get(pdf_type, 'EVENT REPORT')
        
        header_table = None
        has_logo = os.path.exists(logo_path)
        has_event_logo = os.path.exists(event_logo_path)
        
        try:
            if has_logo and has_event_logo:
                logo_img = Image(logo_path, width=40, height=40)
                event_logo_img = Image(event_logo_path, width=40, height=40)
                
                header_text = [
                    Paragraph("DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA", ParagraphStyle('T1', parent=title_style, fontSize=11, leading=13)),
                    Spacer(1, 2),
                    Paragraph("TECH MANTHAN 6.0", ParagraphStyle('S1', parent=subtitle_style, fontSize=9, leading=11)),
                    Spacer(1, 1),
                    Paragraph(report_title, ParagraphStyle('R1', parent=subtitle_style, fontSize=8, fontName='Helvetica-Oblique', textColor=colors.HexColor('#555555')))
                ]
                header_table = Table([[logo_img, header_text, event_logo_img]], colWidths=[45, 360, 45], hAlign='CENTER')
                header_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                ]))
            elif has_logo:
                logo_img = Image(logo_path, width=40, height=40)
                header_text = [
                    Paragraph("DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA", ParagraphStyle('T2', parent=title_style, fontSize=11, leading=13, alignment=0)),
                    Spacer(1, 2),
                    Paragraph("TECH MANTHAN 6.0", ParagraphStyle('S2', parent=subtitle_style, fontSize=9, leading=11, alignment=0)),
                    Spacer(1, 1),
                    Paragraph(report_title, ParagraphStyle('R2', parent=subtitle_style, fontSize=8, fontName='Helvetica-Oblique', textColor=colors.HexColor('#555555'), alignment=0))
                ]
                header_table = Table([[logo_img, header_text]], colWidths=[45, 405], hAlign='CENTER')
                header_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('LEFTPADDING', (0,0), (-1,-1), 0),
                    ('RIGHTPADDING', (0,0), (-1,-1), 0),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 0),
                    ('TOPPADDING', (0,0), (-1,-1), 0),
                ]))
            else:
                header_text = [
                    Paragraph("DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA", ParagraphStyle('T3', parent=title_style, fontSize=11, leading=13)),
                    Spacer(1, 2),
                    Paragraph("TECH MANTHAN 6.0", ParagraphStyle('S3', parent=subtitle_style, fontSize=9, leading=11)),
                    Spacer(1, 1),
                    Paragraph(report_title, ParagraphStyle('R3', parent=subtitle_style, fontSize=8, fontName='Helvetica-Oblique', textColor=colors.HexColor('#555555')))
                ]
                header_table = Table([[header_text]], colWidths=[450], hAlign='CENTER')
                header_table.setStyle(TableStyle([
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                ]))
            story.append(header_table)
        except Exception as e:
            story.append(Paragraph("DR. B.B HEGDE FIRST GRADE COLLEGE, KUNDAPURA", title_style))
            story.append(Spacer(1, 2))
            story.append(Paragraph("TECH MANTHAN 6.0", subtitle_style))
            story.append(Spacer(1, 1))
            story.append(Paragraph(report_title, subtitle_style))

        story.append(Spacer(1, 10))
        
        # 2. Event Metadata Box
        meta_data = [
            [
                Paragraph(f"<b>Event Name:</b> {title}", body_style),
                Paragraph(f"<b>Coordinator:</b> {coordinator}", body_style)
            ],
            [
                Paragraph(f"<b>Date & Time:</b> {date} | {time}", body_style),
                Paragraph(f"<b>Venue:</b> {venue}", body_style)
            ]
        ]
        meta_table = Table(meta_data, colWidths=[270, 270])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
            ('PADDING', (0,0), (-1,-1), 6),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 12))
        
        # 3. Students Table
        if data.get('headers') and data.get('rows'):
            # Dynamic Excel-style PDF table
            raw_headers = data.get('headers')
            raw_rows = data.get('rows')
            
            table_data = [[Paragraph(str(h), header_cell_style) for h in raw_headers]]
            for row in raw_rows:
                table_data.append([Paragraph(str(cell), body_style) for cell in row])
                
            num_cols = len(raw_headers)
            available_width = 540
            col_widths = [available_width / num_cols] * num_cols
        elif pdf_type in ['attendance', 'registrations']:
            # Attendance columns: Sl No, Reg No, Student Name, Class, Email, Attendance, Signature
            table_data = [[
                Paragraph("Sl No", header_cell_style),
                Paragraph("Reg No", header_cell_style),
                Paragraph("Student Name", header_cell_style),
                Paragraph("Class", header_cell_style),
                Paragraph("Email Address", header_cell_style),
                Paragraph("Attendance", header_cell_style),
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
