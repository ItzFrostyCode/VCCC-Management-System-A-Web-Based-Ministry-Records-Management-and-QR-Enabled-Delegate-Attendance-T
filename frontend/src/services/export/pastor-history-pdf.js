import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

/**
 * Pastoral History PDF Generator
 * Uses jsPDF and jsPDF-AutoTable
 */
export async function exportPastorHistoryPDF(data) {
    const { pastor, history, ranks, trainings, pioneered } = data;
    
    // Create new pdf document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Header & Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(183, 28, 28); // VCCC Red
    doc.text('VCCC DAVAO METRO SOUTH', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(66, 66, 66);
    doc.text('PASTORAL HISTORY RECORD', pageWidth / 2, 28, { align: 'center' });
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 32, pageWidth - 20, 32);

    // 2. Profile Summary
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Profile Information', 20, 42);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const leftCol = 20;
    const midCol = 80;
    const rightCol = 140;

    let y = 50;
    doc.text(`Full Name: ${pastor.full_name}`, leftCol, y);
    doc.text(`Current Status: ${pastor.current_status_code?.toUpperCase() || 'UNKNOWN'}`, midCol, y);
    doc.text(`Rank: ${ranks && ranks.length > 0 ? ranks[0].rank_code : 'Worker'}`, rightCol, y);

    y += 7;
    doc.text(`Birthdate: ${formatDate(pastor.birthdate)}`, leftCol, y);
    doc.text(`Contact: ${pastor.contact_number || 'N/A'}`, midCol, y);
    doc.text(`Years Service: ${calculateServiceYears(pastor.pastoring_start_date)}`, rightCol, y);

    if (pastor.wife_name) {
        y += 7;
        doc.text(`Spouse: ${pastor.wife_name}`, leftCol, y);
    }

    // 3. Ministry Timeline Table
    y += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Ministry Timeline (Assignments & Transfers)', 20, y);

    const timelineRows = history.map(h => [
        formatDate(h.date, h.precision),
        h.title,
        h.subtitle,
        h.notes || '-'
    ]);

    doc.autoTable({
        startY: y + 5,
        head: [['Date', 'Event', 'Church/Location', 'Notes']],
        body: timelineRows,
        headStyles: { fillColor: [183, 28, 28] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 9 },
        margin: { left: 20, right: 20 }
    });

    // 4. Credentials & Training Table
    y = doc.lastAutoTable.finalY + 15;
    
    // Check for page overflow
    if (y > 240) {
        doc.addPage();
        y = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Credentials & Specialized Training', 20, y);

    const trainingRows = (trainings || []).map(t => [
        formatDate(t.completion_date, t.precision_flag),
        t.course_name,
        t.status_code,
        t.notes || '-'
    ]);

    if (trainingRows.length > 0) {
        doc.autoTable({
            startY: y + 5,
            head: [['Date', 'Course/Program', 'Status', 'Notes']],
            body: trainingRows,
            headStyles: { fillColor: [66, 66, 66] },
            styles: { fontSize: 9 },
            margin: { left: 20, right: 20 }
        });
    } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.text('No training records found.', 20, y + 10);
    }

    // 5. Spiritual Foundations (Pioneered)
    let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : y + 20;
    if (pioneered && pioneered.length > 0) {
        if (finalY > 240) { doc.addPage(); finalY = 20; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Foundations (Pioneered Churches)', 20, finalY + 10);
        
        const pioneeredText = pioneered.map(p => `• ${p.church_name} (${p.district_name || 'N/A'})`).join('\n');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(pioneeredText, 25, finalY + 18);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generated on ${new Date().toLocaleDateString()} - VCCC Davao Metro South Management System`, 20, doc.internal.pageSize.getHeight() - 10);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 40, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`Pastoral_Record_${pastor.full_name?.replace(/\s+/g, '_') || 'Unknown'}.pdf`);
}

function formatDate(date, precision) {
    if (!date) return 'Unknown';
    const d = new Date(date);
    if (precision === 'year') return d.getFullYear().toString();
    if (precision === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateServiceYears(startDate) {
    if (!startDate) return '0';
    const start = new Date(startDate);
    const now = new Date();
    let diff = now.getFullYear() - start.getFullYear();
    return diff <= 0 ? '0' : diff.toString();
}
