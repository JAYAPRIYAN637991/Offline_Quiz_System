import { jsPDF } from "jspdf";
import { ExamAttempt } from "../types";

/**
 * Generates and downloads a formal Academic Integrity & AI Proctor PDF report.
 */
export function exportProctorReportPDF(attempt: ExamAttempt, examTitle: string): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageHeight = 297;
  const pageWidth = 210;
  const marginX = 20;
  let y = 25;

  // Set colors based on risk level
  const risk = attempt.cheatingAnalysis?.riskLevel || "Low";
  let primaryColor: [number, number, number] = [16, 185, 129]; // Green
  let verdictColor: [number, number, number] = [16, 185, 129]; // Green
  
  if (risk === "High") {
    primaryColor = [225, 29, 72]; // Rose/Red
  } else if (risk === "Medium") {
    primaryColor = [217, 119, 6]; // Amber/Orange
  }

  const verdict = attempt.cheatingAnalysis?.verdict || "Clear";
  if (verdict === "Suspicious") {
    verdictColor = [225, 29, 72];
  } else if (verdict === "Needs Review") {
    verdictColor = [217, 119, 6];
  }

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 25) {
      doc.addPage();
      y = 25;
      drawHeaderAndLines();
    }
  };

  const drawHeaderAndLines = () => {
    // Header Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("GUARDIAN EXAM INTEGRITY SUITE - CONFIDENTIAL PROCTOR AUDIT REPORT", marginX, 12);
    
    // Top Thin Separator Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.2);
    doc.line(marginX, 15, pageWidth - marginX, 15);
  };

  // Init first page header
  drawHeaderAndLines();

  // 1. Title Banner
  y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("Assessment Integrity Report", marginX, y);
  
  // Right side report ID
  doc.setFont("helvetica", "mono");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  const reportId = `REP-${attempt.id.substring(0, 8).toUpperCase()}-${Math.floor(Date.now() / 100000).toString()}`;
  doc.text(`REPORT VERIFICATION ID: ${reportId}`, pageWidth - marginX, y - 1, { align: "right" });

  y += 5;
  // Accent thick color strip representing Risk Level
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(marginX, y, pageWidth - 2 * marginX, 3, "F");

  y += 10;

  // 2. Candidate & Session Metadata Details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text("CANDIDATE AND SESSION METADATA", marginX, y);
  
  y += 5;
  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(marginX, y, pageWidth - 2 * marginX, 34, "FD");

  // Metadata Grid Lines and Text
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  
  // Left Column Labels
  doc.text("Candidate Name:", marginX + 4, y + 6);
  doc.text("Candidate Email:", marginX + 4, y + 14);
  doc.text("Assessment Title:", marginX + 4, y + 22);
  doc.text("Unique Session ID:", marginX + 4, y + 30);

  // Left Column Values
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(attempt.studentName, marginX + 42, y + 6);
  doc.text(attempt.studentEmail, marginX + 42, y + 14);
  doc.text(examTitle, marginX + 42, y + 22);
  doc.setFont("helvetica", "bold"); // bold the session ID for security look
  doc.setTextColor(71, 85, 105);
  doc.text(attempt.id, marginX + 42, y + 30);

  // Right Column Labels
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Submission Status:", marginX + 110, y + 6);
  doc.text("Completion Score:", marginX + 110, y + 14);
  doc.text("Session Timestamp:", marginX + 110, y + 22);
  doc.text("Total Logged Events:", marginX + 110, y + 30);

  // Right Column Values
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(attempt.status.toUpperCase(), marginX + 145, y + 6);
  
  const finalScore = attempt.score !== undefined ? `${attempt.score}%` : "Not Graded / Pending";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(finalScore, marginX + 145, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(new Date(attempt.lastUpdated).toLocaleString(), marginX + 145, y + 22);
  doc.text(`${attempt.tamperLogs.length} security flags`, marginX + 145, y + 30);

  y += 42;

  // 3. AI Cognitive Security Assessment Panel
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text("AI COGNITIVE PROCTORING EVALUATION", marginX, y);

  y += 5;
  
  // Outer Box for Security Evaluation
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(255, 255, 255);
  doc.rect(marginX, y, pageWidth - 2 * marginX, 48, "FD");

  // Grid background for proctor metrics
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(marginX + 3, y + 3, pageWidth - 2 * marginX - 6, 15, "F");

  // Integrity Status Cards inside evaluation
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("OVERALL FRAUD RISK RATING", marginX + 8, y + 8);
  doc.text("EVALUATION VERDICT", marginX + 66, y + 8);
  doc.text("DECISION CONFIDENCE SCORE", marginX + 124, y + 8);

  doc.setFontSize(12);
  // Risk Level Value
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`${risk.toUpperCase()} RISK`, marginX + 8, y + 14);

  // Verdict Value
  doc.setTextColor(verdictColor[0], verdictColor[1], verdictColor[2]);
  doc.text(verdict.toUpperCase(), marginX + 66, y + 14);

  // Confidence Value
  doc.setTextColor(15, 23, 42);
  doc.text(`${attempt.cheatingAnalysis?.confidenceScore || 100}%`, marginX + 124, y + 14);

  // Explanation Text Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("INTEGRITY VERDICT EXPLANATION & SUMMARY:", marginX + 6, y + 24);

  // Explanation Paragraph
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  
  const explanation = attempt.cheatingAnalysis?.explanation || 
    "Built-in heuristics analyzed student behaviors. No critical telemetry anomalies or security breaches were identified during the active session window.";
  
  doc.text(explanation, marginX + 6, y + 29, {
    maxWidth: pageWidth - 2 * marginX - 12,
    align: "left"
  });

  y += 58;

  // 4. Flagged Security Threat Signatures (if any)
  const patternList = attempt.cheatingAnalysis?.flaggedPatterns || [];
  if (patternList.length > 0) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text("DETECTED FRAUD & ESCAPE PATTERNS", marginX, y);

    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(225, 29, 72); // Red alerting text for threat patterns

    patternList.forEach((pattern) => {
      checkPageBreak(8);
      doc.text(`• ${pattern}`, marginX + 4, y);
      y += 5;
    });

    y += 5;
  }

  // 5. Complete Security Event Timeline Logs
  checkPageBreak(45);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text("CHRONOLOGICAL TELEMETRY EVENT TIMELINE", marginX, y);

  y += 5;

  // Table header
  doc.setFillColor(15, 23, 42); // slate-900 header
  doc.rect(marginX, y, pageWidth - 2 * marginX, 7, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TIMESTAMP / OFFSET", marginX + 4, y + 5);
  doc.text("EVENT CLASSIFICATION", marginX + 45, y + 5);
  doc.text("LOGGED EVENT DESCRIPTION & DIAGNOSTICS", marginX + 90, y + 5);

  y += 7;

  if (attempt.tamperLogs.length === 0) {
    checkPageBreak(15);
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, y, pageWidth - 2 * marginX, 12, "D");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Prinstine Record: Zero focus escapes, screen alterations, or window violations registered.", marginX + 6, y + 7);
    y += 18;
  } else {
    attempt.tamperLogs.forEach((log) => {
      const timeOffset = log.timestamp - attempt.startTime;
      const min = Math.floor(timeOffset / 60000);
      const sec = Math.floor((timeOffset % 60000) / 1000);
      const timeStr = `T+${min}m ${sec}s`;
      
      const logType = log.type.toUpperCase();
      const description = log.description;

      // Estimate height of explanation wrapping
      const wrappingOptions = { maxWidth: pageWidth - marginX - 94 };
      const descLines = doc.splitTextToSize(description, wrappingOptions.maxWidth);
      const rowHeight = Math.max(8, descLines.length * 4.5 + 4);

      checkPageBreak(rowHeight);

      // Draw light border line at the bottom of the row
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(marginX, y + rowHeight, pageWidth - marginX, y + rowHeight);

      // Draw values
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(timeStr, marginX + 4, y + 5);

      // Color classify events visually in table
      if (log.type === "tab-blur" || log.type === "fullscreen-exit") {
        doc.setTextColor(225, 29, 72); // Red for critical escapes
      } else if (log.type === "copy-paste" || log.type === "keyboard-shortcut") {
        doc.setTextColor(217, 119, 6); // Amber for copy paste
      } else {
        doc.setTextColor(51, 65, 85); // Slate for general
      }
      doc.text(logType, marginX + 45, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      
      // Draw wrapped description lines
      let lineY = y + 5;
      descLines.forEach((line: string) => {
        doc.text(line, marginX + 90, lineY);
        lineY += 4.5;
      });

      y += rowHeight;
    });

    y += 8;
  }

  // 6. Proctor Verification Snapshots (Visual Telemetry)
  const captures = attempt.screenCaptures || [];
  if (captures.length > 0) {
    checkPageBreak(65);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    doc.text("AUDITOR SCREEN SNAPSHOT EVIDENCE", marginX, y);

    y += 5;

    // Grid details
    const imgWidth = 52;
    const imgHeight = 31;
    let colIdx = 0;

    for (let i = 0; i < captures.length; i++) {
      const cap = captures[i];
      
      // Ensure space is available for image + timestamp label
      if (y + imgHeight + 10 > pageHeight - 25) {
        doc.addPage();
        y = 25;
        drawHeaderAndLines();
        
        // Re-write section heading on new page
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(51, 65, 85);
        doc.text("AUDITOR SCREEN SNAPSHOT EVIDENCE (CONTINUED)", marginX, y);
        y += 7;
        colIdx = 0;
      }

      const xPos = marginX + colIdx * (imgWidth + 6);
      
      // Draw outer box for screen captures
      doc.setDrawColor(226, 232, 240);
      doc.rect(xPos, y, imgWidth, imgHeight);

      try {
        doc.addImage(cap.dataUrl, "JPEG", xPos + 0.5, y + 0.5, imgWidth - 1, imgHeight - 1);
      } catch (err) {
        // Fallback placeholder if format is corrupted
        doc.setFillColor(241, 245, 249);
        doc.rect(xPos + 0.5, y + 0.5, imgWidth - 1, imgHeight - 1, "F");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("Image format error", xPos + imgWidth/2, y + imgHeight/2, { align: "center" });
      }

      // Draw offset text
      const imgOffset = cap.timestamp - attempt.startTime;
      const imgMin = Math.floor(imgOffset / 60000);
      const imgSec = Math.floor((imgOffset % 60000) / 1000);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Capture ${i + 1} (T+${imgMin}m ${imgSec}s)`, xPos, y + imgHeight + 4);

      colIdx++;
      if (colIdx >= 3) {
        colIdx = 0;
        y += imgHeight + 9;
      }
    }

    if (colIdx > 0) {
      y += imgHeight + 9;
    }
    y += 5;
  }

  // 7. Formal Auditor Sign-off Area
  checkPageBreak(42);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text("AUDIT VALIDATION & INTEGRITY CERTIFICATION", marginX, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "By signing below, the credentialing auditor certifies that the chronological session proctor telemetry has been reviewed and analyzed against standard academic integrity parameters.",
    marginX,
    y,
    { maxWidth: pageWidth - 2 * marginX }
  );

  y += 18;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  
  // Left: Authorized Signature Line
  doc.line(marginX + 2, y, marginX + 65, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorized Proctor/Auditor Signature", marginX + 2, y + 4.5);
  
  // Right: Date Line
  doc.line(pageWidth - marginX - 60, y, pageWidth - marginX - 2, y);
  doc.text("Verification Date", pageWidth - marginX - 60, y + 4.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(new Date().toLocaleDateString(), pageWidth - marginX - 60, y - 2);

  // Apply footer page numbers to all generated pages dynamically
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Thin gray bottom separator line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 15, pageWidth - marginX, pageHeight - 15);

    // Footer Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text("GUARDIAN INTEGRITY SYSTEMS", marginX, pageHeight - 10);
    doc.text("CLASSIFICATION: CONFIDENTIAL", pageWidth - marginX, pageHeight - 10, { align: "right" });
  }

  // Truncate name safely for filesystem title
  const cleanName = attempt.studentName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  doc.save(`integrity_report_${cleanName}_${attempt.id.substring(0, 6)}.pdf`);
}
