import { jsPDF } from 'jspdf';

/**
 * Load image from URL as data URL
 * @param {string} url - Image URL
 * @returns {Promise<string|null>} - Data URL or null
 */
const loadImageFromUrl = async (url) => {
  if (!url) return null;
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load image from URL:', url, e);
    return null;
  }
};

/**
 * Infer jsPDF image format from a data URL.
 * @param {string} dataUrl
 * @returns {'PNG'|'JPEG'|null}
 */
const inferJsPdfImageFormat = (dataUrl) => {
  if (!dataUrl || typeof dataUrl !== 'string') return 'PNG';
  const head = dataUrl.slice(0, 64).toLowerCase();
  if (head.includes('data:image/jpeg') || head.includes('data:image/jpg')) return 'JPEG';
  if (head.includes('data:image/png')) return 'PNG';
  if (head.includes('data:image/webp')) return null;
  return 'PNG';
};

/**
 * Format business address from profile
 * @param {Object} businessProfile - Business profile data
 * @returns {string[]} - Array of address lines
 */
const formatBusinessAddress = (businessProfile) => {
  if (!businessProfile) return [];
  
  const lines = [];
  if (businessProfile.address_line_1) lines.push(businessProfile.address_line_1);
  if (businessProfile.address_line_2) lines.push(businessProfile.address_line_2);
  
  const cityStateZip = [
    businessProfile.city,
    businessProfile.state,
    businessProfile.postal_code
  ].filter(Boolean).join(', ');
  
  if (cityStateZip) lines.push(cityStateZip);
  
  return lines;
};

/**
 * Generate a professional branded PDF for the Service & Diagnostic Report
 * @param {Object} summary - The AI summary data
 * @param {Object} project - The work order/project data
 * @param {Object} businessProfile - The company business profile (logo, name, address)
 * @param {Object} additionalData - Optional additional data (parts, labor, signatures)
 */
export const generateSummaryPDF = async (summary, project, businessProfile = null, additionalData = {}) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);
  let yPos = margin;

  // Professional color palette
  const COLORS = {
    navy: [30, 41, 59],
    darkGray: [51, 65, 85],
    mediumGray: [100, 116, 139],
    lightGray: [148, 163, 184],
    white: [255, 255, 255],
    offWhite: [248, 250, 252],
    lightBg: [241, 245, 249],
    textPrimary: [15, 23, 42],
    textSecondary: [71, 85, 105],
    textMuted: [100, 116, 139],
    accentRed: [220, 38, 38],
    accentOrange: [234, 88, 12],
    accentGreen: [22, 163, 74],
    accentBlue: [37, 99, 235],
    accentPurple: [124, 58, 237],
    accentYellow: [202, 138, 4],
    bgRed: [254, 242, 242],
    bgOrange: [255, 247, 237],
    bgGreen: [240, 253, 244],
    bgBlue: [239, 246, 255],
    bgPurple: [245, 243, 255],
    bgYellow: [254, 252, 232],
  };

  const footerHeight = 14;
  const footerMargin = footerHeight + 8;

  // Format timestamps
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  const formattedDateTime = `${formattedDate} at ${formattedTime}`;

  // Helper: Check page break
  const checkPageBreak = (requiredSpace = 20) => {
    if (yPos + requiredSpace > pageHeight - footerMargin) {
      doc.addPage();
      yPos = margin + 5;
      return true;
    }
    return false;
  };

  // Helper: Wrap text
  const wrapText = (text, maxWidth) => {
    return doc.splitTextToSize(text || '', maxWidth);
  };

  // Helper: Draw section header
  const drawSectionHeader = (title, accentColor = COLORS.navy) => {
    checkPageBreak(22);
    yPos += 4;
    
    // Section title
    doc.setTextColor(...COLORS.navy);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), margin, yPos);
    
    // Accent underline
    yPos += 2;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.6);
    doc.line(margin, yPos, margin + 45, yPos);
    yPos += 7;
  };

  // Helper: Draw content box
  const drawContentBox = (bgColor, borderColor, content, paddingX = 8, paddingY = 6) => {
    const lines = wrapText(content, contentWidth - (paddingX * 2) - 4);
    const lineHeight = 5;
    const boxHeight = lines.length * lineHeight + (paddingY * 2);
    
    checkPageBreak(boxHeight + 6);
    
    doc.setFillColor(...bgColor);
    doc.roundedRect(margin, yPos - 2, contentWidth, boxHeight, 2.5, 2.5, 'F');
    
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(1.2);
    doc.line(margin + 0.6, yPos - 1, margin + 0.6, yPos + boxHeight - 3);
    
    doc.setTextColor(...COLORS.textPrimary);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    
    lines.forEach((line, idx) => {
      doc.text(line, margin + paddingX + 2, yPos + paddingY + (idx * lineHeight));
    });
    
    yPos += boxHeight + 5;
  };

  // Helper: Draw label-value pair
  const drawLabelValue = (label, value, x, y, labelWidth = 50) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(label, x, y);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(String(value || 'N/A'), x, y + 5);
  };

  const brandName = businessProfile?.display_name || 'Fleetwise AI';

  // Load company logo
  let companyLogoImg = null;
  if (businessProfile?.logo_url) {
    companyLogoImg = await loadImageFromUrl(businessProfile.logo_url);
  }

  // Load signatures if provided
  let techSignatureImg = null;
  let supervisorSignatureImg = null;
  if (additionalData.technicianSignature?.signature_url) {
    techSignatureImg = await loadImageFromUrl(additionalData.technicianSignature.signature_url);
  }
  if (additionalData.supervisorSignature?.signature_url) {
    supervisorSignatureImg = await loadImageFromUrl(additionalData.supervisorSignature.signature_url);
  }

  // ============================================
  // HEADER - Professional 2-Column Letterhead
  // ============================================
  
  const headerHeight = 48;
  
  // Navy header background
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  // Target logo height: 120px ≈ 33.87mm at 90 DPI
  const targetLogoHeight = 33.87;
  const leftColX = margin;
  let leftY = 8;
  
  // ============================================
  // LEFT COLUMN: Company Identity (grouped block)
  // ============================================
  
  // Helper: Get image dimensions from data URL
  const getImageDimensions = (dataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => resolve({ width: 1, height: 1 }); // Fallback to square
      img.src = dataUrl;
    });
  };
  
  // Draw logo directly (NO white background container)
  let logoBottomY = leftY;
  let calculatedLogoWidth = 0;
  
  if (companyLogoImg) {
    try {
      const logoFormat = inferJsPdfImageFormat(companyLogoImg);
      
      if (logoFormat) {
        // Properly load image dimensions
        const imgDimensions = await getImageDimensions(companyLogoImg);
        
        // Fixed height of 120px (≈ 33.87mm), width auto based on aspect ratio
        let logoHeight = targetLogoHeight;
        const aspectRatio = imgDimensions.width / imgDimensions.height;
        let logoWidth = logoHeight * aspectRatio;
        
        // Cap max width to avoid overflow (but maintain ratio)
        const maxLogoWidth = 60;
        if (logoWidth > maxLogoWidth) {
          logoWidth = maxLogoWidth;
          logoHeight = logoWidth / aspectRatio;
        }
        
        calculatedLogoWidth = logoWidth;
        
        // Vertically center logo in header
        const logoY = (headerHeight - logoHeight) / 2;
        
        doc.addImage(companyLogoImg, logoFormat, leftColX, logoY, logoWidth, logoHeight);
        
        // Company text starts after logo
        leftY = logoY;
        logoBottomY = logoY + logoHeight;
      }
    } catch (e) {
      console.warn('Could not add company logo to PDF:', e);
    }
  }
  
  // Company Legal Name (next to or below logo based on logo width)
  const companyName = businessProfile?.legal_name || businessProfile?.display_name || brandName;
  let textStartX = leftColX;
  
  // If we have a logo, position text to the right of it
  if (companyLogoImg && calculatedLogoWidth > 0) {
    textStartX = leftColX + calculatedLogoWidth + 6;
    leftY = 10; // Reset Y for text block
  }
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, textStartX, leftY);
  leftY += 5;
  
  // Company Address (street line)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 220);
  
  if (businessProfile?.address_line_1) {
    doc.text(businessProfile.address_line_1, textStartX, leftY);
    leftY += 4;
  }
  
  // City, State, ZIP
  const cityStateZip = [
    businessProfile?.city,
    businessProfile?.state,
    businessProfile?.postal_code
  ].filter(Boolean).join(', ');
  if (cityStateZip) {
    doc.text(cityStateZip, textStartX, leftY);
    leftY += 4;
  }
  
  // Contact line: Phone • Email
  const contactParts = [];
  if (businessProfile?.phone) contactParts.push(businessProfile.phone);
  if (businessProfile?.email) contactParts.push(businessProfile.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' • '), textStartX, leftY);
  }

  // ============================================
  // RIGHT COLUMN: Document Metadata ONLY
  // ============================================
  const rightX = pageWidth - margin;
  
  // Work Order Number (primary, emphasized)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`WO #${summary.workOrderNumber || 'N/A'}`, rightX, 14, { align: 'right' });
  
  // Generated Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 220);
  doc.text(formattedDate, rightX, 22, { align: 'right' });
  
  // Generated Time
  doc.setFontSize(9);
  doc.setTextColor(170, 180, 195);
  doc.text(formattedTime, rightX, 29, { align: 'right' });
  
  yPos = headerHeight + 10;

  // ============================================
  // SECTION 1: VEHICLE INFORMATION
  // ============================================
  if (summary.vehicleInfo) {
    drawSectionHeader('Vehicle Information', COLORS.accentBlue);
    
    // Vehicle info card
    const cardHeight = 52;
    doc.setFillColor(...COLORS.offWhite);
    doc.roundedRect(margin, yPos - 2, contentWidth, cardHeight, 3, 3, 'F');
    
    // Left accent
    doc.setDrawColor(...COLORS.accentBlue);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos - 2, margin, yPos + cardHeight - 2);
    
    const col1X = margin + 10;
    const col2X = margin + (contentWidth / 3) + 5;
    const col3X = margin + (contentWidth * 2 / 3) + 5;
    let infoY = yPos + 5;
    
    // Row 1
    const unitNumber = summary.vehicleInfo.unit_id || summary.vehicleInfo.truck_number || 'N/A';
    drawLabelValue('UNIT / TRUCK NUMBER', unitNumber, col1X, infoY);
    drawLabelValue('VIN', summary.vehicleInfo.vin || 'N/A', col2X, infoY);
    
    infoY += 16;
    
    // Row 2
    const ymm = `${summary.vehicleInfo.year || ''} ${summary.vehicleInfo.make || ''} ${summary.vehicleInfo.model || ''}`.trim() || 'N/A';
    drawLabelValue('YEAR / MAKE / MODEL', ymm, col1X, infoY);
    drawLabelValue('CUSTOMER', summary.customerName || project?.customer_name || 'N/A', col2X, infoY);
    
    infoY += 16;
    
    // Row 3
    const engine = summary.vehicleInfo.engine?.make ? 
      `${summary.vehicleInfo.engine.make} ${summary.vehicleInfo.engine.model || ''}`.trim() : 
      (typeof summary.vehicleInfo.engine === 'string' ? summary.vehicleInfo.engine : 'N/A');
    drawLabelValue('ENGINE', engine, col1X, infoY);
    
    const transmission = summary.vehicleInfo.transmission?.make ?
      `${summary.vehicleInfo.transmission.make} ${summary.vehicleInfo.transmission.model || ''}`.trim() :
      (typeof summary.vehicleInfo.transmission === 'string' ? summary.vehicleInfo.transmission : 'N/A');
    drawLabelValue('TRANSMISSION', transmission, col2X, infoY);
    
    const mileage = summary.vehicleInfo.odometer ? `${summary.vehicleInfo.odometer.toLocaleString()} miles` : 'N/A';
    drawLabelValue('ODOMETER', mileage, col3X, infoY);
    
    yPos += cardHeight + 8;
  }

  // ============================================
  // SECTION 2: WORK ORDER SUMMARY
  // ============================================
  drawSectionHeader('Work Order Summary', COLORS.accentPurple);
  
  const woCardHeight = 24;
  doc.setFillColor(...COLORS.bgPurple);
  doc.roundedRect(margin, yPos - 2, contentWidth, woCardHeight, 3, 3, 'F');
  
  doc.setDrawColor(...COLORS.accentPurple);
  doc.setLineWidth(1.2);
  doc.line(margin + 0.6, yPos - 1, margin + 0.6, yPos + woCardHeight - 3);
  
  const woCol1 = margin + 10;
  const woCol2 = margin + (contentWidth / 3);
  const woCol3 = margin + (contentWidth * 2 / 3);
  
  drawLabelValue('WORK ORDER #', summary.workOrderNumber || 'N/A', woCol1, yPos + 4);
  
  const woStatus = (project?.status || summary.status || 'Open').toUpperCase();
  drawLabelValue('STATUS', woStatus, woCol2, yPos + 4);
  
  const woDate = project?.work_order_date 
    ? new Date(project.work_order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'N/A';
  drawLabelValue('DATE IN', woDate, woCol3, yPos + 4);
  
  yPos += woCardHeight + 10;

  // ============================================
  // SECTION 3: CUSTOMER COMPLAINTS
  // ============================================
  if (summary.complaint) {
    drawSectionHeader('Customer Complaints', COLORS.accentRed);
    
    // Split complaints and deduplicate
    const rawComplaints = summary.complaint.split(/[;\n]/).filter(c => c.trim());
    const seenComplaints = new Set();
    const uniqueComplaints = rawComplaints.filter(c => {
      const normalized = c.trim().toLowerCase();
      if (seenComplaints.has(normalized)) return false;
      seenComplaints.add(normalized);
      return true;
    });
    
    if (uniqueComplaints.length > 1) {
      uniqueComplaints.forEach((complaint) => {
        checkPageBreak(12);
        
        doc.setFillColor(...COLORS.bgRed);
        const lines = wrapText(complaint.trim(), contentWidth - 20);
        const itemHeight = lines.length * 5 + 8;
        doc.roundedRect(margin, yPos - 2, contentWidth, itemHeight, 2, 2, 'F');
        
        // Bullet
        doc.setFillColor(...COLORS.accentRed);
        doc.circle(margin + 7, yPos + 4, 2, 'F');
        
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        lines.forEach((line, lineIdx) => {
          doc.text(line, margin + 14, yPos + 5 + (lineIdx * 5.5));
        });
        
        yPos += itemHeight + 5;
      });
    } else if (uniqueComplaints.length === 1) {
      drawContentBox(COLORS.bgRed, COLORS.accentRed, uniqueComplaints[0].trim());
    }
  }

  // ============================================
  // SECTION 4: AI DIAGNOSTIC SUMMARY
  // ============================================
  if (summary.diagnostic_summary) {
    yPos += 4;
    drawSectionHeader('AI Diagnostic Summary', COLORS.accentBlue);
    drawContentBox(COLORS.bgBlue, COLORS.accentBlue, summary.diagnostic_summary);
  }

  // Probable Root Cause
  if (summary.probable_root_cause) {
    yPos += 2;
    drawSectionHeader('Probable Root Cause', COLORS.accentOrange);
    drawContentBox(COLORS.bgOrange, COLORS.accentOrange, summary.probable_root_cause);
  }

  // ============================================
  // SECTION 5: RECOMMENDED ACTIONS / TASKS
  // ============================================
  const hasRepairSteps = summary.recommended_repair_steps && summary.recommended_repair_steps.length > 0;
  const hasTasks = summary.tasks && summary.tasks.length > 0;
  
  if (hasRepairSteps || hasTasks) {
    yPos += 4;
    drawSectionHeader('Recommended Actions & Tasks', COLORS.accentGreen);
    
    // Repair steps
    if (hasRepairSteps) {
      summary.recommended_repair_steps.forEach((step, idx) => {
        checkPageBreak(18);
        
        const cleanStep = step.replace(/^\d+[\.\)]\s*/, '');
        const stepLines = wrapText(cleanStep, contentWidth - 24);
        const stepHeight = stepLines.length * 5 + 6;
        
        // Background
        doc.setFillColor(...COLORS.bgGreen);
        doc.roundedRect(margin, yPos - 2, contentWidth, stepHeight, 2, 2, 'F');
        
        // Step number circle
        doc.setFillColor(...COLORS.accentGreen);
        doc.circle(margin + 10, yPos + 4, 4, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(String(idx + 1), margin + 10, yPos + 5.5, { align: 'center' });
        
        // Step text
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        stepLines.forEach((line, lineIdx) => {
          doc.text(line, margin + 20, yPos + 4 + (lineIdx * 5));
        });
        
        yPos += stepHeight + 4;
      });
    }
    
    // Work order tasks
    if (hasTasks) {
      yPos += 4;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.textSecondary);
      doc.text('Work Order Tasks:', margin, yPos);
      yPos += 6;
      
      summary.tasks.forEach((task, idx) => {
        checkPageBreak(14);
        
        // Alternating background
        if (idx % 2 === 0) {
          doc.setFillColor(...COLORS.offWhite);
        } else {
          doc.setFillColor(...COLORS.white);
        }
        doc.roundedRect(margin, yPos - 3, contentWidth, 12, 1.5, 1.5, 'F');
        
        // Task number
        doc.setFillColor(...COLORS.navy);
        doc.circle(margin + 7, yPos + 3, 3.5, 'F');
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(String(idx + 1), margin + 7, yPos + 4.2, { align: 'center' });
        
        // Task title
        doc.setTextColor(...COLORS.textPrimary);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        let displayTitle = task.title || 'Untitled Task';
        const maxTitleWidth = contentWidth - 50;
        if (doc.getTextWidth(displayTitle) > maxTitleWidth) {
          while (doc.getTextWidth(displayTitle + '...') > maxTitleWidth && displayTitle.length > 10) {
            displayTitle = displayTitle.slice(0, -1);
          }
          displayTitle = displayTitle + '...';
        }
        doc.text(displayTitle, margin + 15, yPos + 4);
        
        // Status badge
        const status = task.status || 'pending';
        let statusColor = COLORS.textMuted;
        let statusBg = COLORS.lightBg;
        
        if (status === 'completed') {
          statusColor = COLORS.accentGreen;
          statusBg = COLORS.bgGreen;
        } else if (status === 'in_progress') {
          statusColor = COLORS.accentBlue;
          statusBg = COLORS.bgBlue;
        }
        
        const statusText = status.replace('_', ' ').toUpperCase();
        const statusWidth = doc.getTextWidth(statusText) + 8;
        
        doc.setFillColor(...statusBg);
        doc.roundedRect(pageWidth - margin - statusWidth - 2, yPos, statusWidth, 8, 1.5, 1.5, 'F');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...statusColor);
        doc.text(statusText, pageWidth - margin - 5, yPos + 4.5, { align: 'right' });
        
        yPos += 14;
      });
    }
  }

  // ============================================
  // SECTION 6: PARTS USED (Conditional)
  // ============================================
  const parts = additionalData.parts || [];
  if (parts.length > 0) {
    yPos += 6;
    drawSectionHeader('Parts Used', COLORS.accentPurple);
    
    // Table header
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(margin, yPos - 2, contentWidth, 10, 1.5, 1.5, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('PART NAME', margin + 5, yPos + 4);
    doc.text('PART #', margin + 90, yPos + 4);
    doc.text('QTY', pageWidth - margin - 20, yPos + 4);
    
    yPos += 12;
    
    parts.forEach((part, idx) => {
      checkPageBreak(10);
      
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.offWhite);
        doc.rect(margin, yPos - 3, contentWidth, 9, 'F');
      }
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textPrimary);
      
      const partName = part.description || part.name || 'Part';
      doc.text(partName.substring(0, 45), margin + 5, yPos + 2);
      doc.text(part.part_number || 'N/A', margin + 90, yPos + 2);
      doc.text(String(part.quantity || 1), pageWidth - margin - 20, yPos + 2);
      
      yPos += 10;
    });
    
    yPos += 4;
  }

  // ============================================
  // SECTION 7: LABOR SUMMARY (Conditional)
  // ============================================
  const labor = additionalData.labor || [];
  if (labor.length > 0) {
    yPos += 4;
    drawSectionHeader('Labor Summary', COLORS.accentOrange);
    
    // Table header
    doc.setFillColor(...COLORS.navy);
    doc.roundedRect(margin, yPos - 2, contentWidth, 10, 1.5, 1.5, 'F');
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('TECHNICIAN', margin + 5, yPos + 4);
    doc.text('DESCRIPTION', margin + 60, yPos + 4);
    doc.text('HOURS', pageWidth - margin - 20, yPos + 4);
    
    yPos += 12;
    
    labor.forEach((entry, idx) => {
      checkPageBreak(10);
      
      if (idx % 2 === 0) {
        doc.setFillColor(...COLORS.offWhite);
        doc.rect(margin, yPos - 3, contentWidth, 9, 'F');
      }
      
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.textPrimary);
      
      doc.text(entry.technician_name || 'Technician', margin + 5, yPos + 2);
      doc.text((entry.description || 'Labor').substring(0, 35), margin + 60, yPos + 2);
      doc.text(String(entry.hours?.toFixed(2) || '0.00'), pageWidth - margin - 20, yPos + 2);
      
      yPos += 10;
    });
    
    yPos += 4;
  }

  // ============================================
  // FAULT CODES
  // ============================================
  if (summary.faultCodes && summary.faultCodes.length > 0) {
    yPos += 4;
    checkPageBreak(26);
    
    drawSectionHeader('Fault Codes Detected', COLORS.accentRed);
    
    let codeX = margin;
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    
    summary.faultCodes.forEach((code) => {
      const codeWidth = doc.getTextWidth(code) + 10;
      
      if (codeX + codeWidth > pageWidth - margin) {
        codeX = margin;
        yPos += 11;
      }
      
      doc.setFillColor(...COLORS.bgRed);
      doc.roundedRect(codeX, yPos - 4, codeWidth, 9, 1.5, 1.5, 'F');
      
      doc.setDrawColor(...COLORS.accentRed);
      doc.setLineWidth(0.3);
      doc.roundedRect(codeX, yPos - 4, codeWidth, 9, 1.5, 1.5, 'S');
      
      doc.setTextColor(...COLORS.accentRed);
      doc.text(code, codeX + 5, yPos + 1.5);
      
      codeX += codeWidth + 6;
    });
    
    yPos += 14;
  }

  // ============================================
  // SECTION 8: SIGNATURES
  // ============================================
  yPos += 8;
  checkPageBreak(50);
  
  drawSectionHeader('Signatures & Approval', COLORS.navy);
  
  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigBoxHeight = 35;
  
  // Technician Signature Box
  doc.setFillColor(...COLORS.offWhite);
  doc.roundedRect(margin, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('TECHNICIAN SIGNATURE', margin + 5, yPos + 6);
  
  if (techSignatureImg) {
    try {
      const sigFormat = inferJsPdfImageFormat(techSignatureImg);
      if (sigFormat) {
        doc.addImage(techSignatureImg, sigFormat, margin + 10, yPos + 10, 50, 15);
      }
    } catch (e) {
      console.warn('Could not add technician signature:', e);
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('Not signed', margin + 5, yPos + 22);
  }
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  const techName = additionalData.technicianSignature?.signer_name || additionalData.technicianName || '';
  if (techName) {
    doc.text(techName, margin + 5, yPos + 32);
  }
  doc.text(`Date: ${formattedDate}`, margin + sigBoxWidth - 5, yPos + 32, { align: 'right' });
  
  // Supervisor/Admin Signature Box
  const sig2X = margin + sigBoxWidth + 10;
  doc.setFillColor(...COLORS.offWhite);
  doc.roundedRect(sig2X, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'F');
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.5);
  doc.roundedRect(sig2X, yPos, sigBoxWidth, sigBoxHeight, 2, 2, 'S');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('SUPERVISOR / ADMIN APPROVAL', sig2X + 5, yPos + 6);
  
  if (supervisorSignatureImg) {
    try {
      const sigFormat = inferJsPdfImageFormat(supervisorSignatureImg);
      if (sigFormat) {
        doc.addImage(supervisorSignatureImg, sigFormat, sig2X + 10, yPos + 10, 50, 15);
      }
    } catch (e) {
      console.warn('Could not add supervisor signature:', e);
    }
  } else {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.lightGray);
    doc.text('Not signed', sig2X + 5, yPos + 22);
  }
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  const supName = additionalData.supervisorSignature?.signer_name || '';
  if (supName) {
    doc.text(supName, sig2X + 5, yPos + 32);
  }
  doc.text(`Date: ${formattedDate}`, sig2X + sigBoxWidth - 5, yPos + 32, { align: 'right' });
  
  yPos += sigBoxHeight + 12;

  // ============================================
  // KNOWLEDGE BASE SOURCES / CITATIONS
  // ============================================
  if (summary.citations && summary.citations.length > 0) {
    yPos += 4;
    checkPageBreak(35);
    
    // Deduplicate citations by title
    const seenTitles = new Set();
    const uniqueCitations = summary.citations.filter(c => {
      const title = (c.title || '').trim().toLowerCase();
      if (!title || seenTitles.has(title)) return false;
      seenTitles.add(title);
      return true;
    });
    
    if (uniqueCitations.length > 0) {
      drawSectionHeader(`Knowledge Base Sources (${uniqueCitations.length})`, COLORS.accentPurple);
      
      uniqueCitations.slice(0, 5).forEach((citation, idx) => {
        checkPageBreak(12);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...COLORS.accentPurple);
        doc.text(`[${idx + 1}]`, margin + 2, yPos);
        
        doc.setTextColor(...COLORS.textSecondary);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const citationText = wrapText(citation.title || 'Knowledge Base Document', contentWidth - 22);
        doc.text(citationText[0], margin + 14, yPos);
        
        yPos += 10;
      });
      yPos += 4;
    }
  }

  // ============================================
  // PAGE FOOTER - Every Page (lighter, consistent)
  // ============================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    const footerY = pageHeight - 10;
    
    // Subtle divider line
    doc.setDrawColor(...COLORS.lightGray);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    
    // Left - Generated by branding (smaller, lighter)
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.lightGray);
    doc.text(`Generated by ${brandName}`, margin, footerY);
    
    // Center - Timestamp (lighter)
    doc.setFontSize(6);
    doc.text(formattedDateTime, pageWidth / 2, footerY, { align: 'center' });
    
    // Right - Page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
    
    // Legal disclaimer (very subtle)
    doc.setFontSize(5);
    doc.setTextColor(180, 180, 180);
    doc.text('This document is for internal use. Information is provided as-is without warranty.', pageWidth / 2, footerY + 3.5, { align: 'center' });
  }

  // Save the PDF
  const fileName = `WO_${summary.workOrderNumber || 'Summary'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};
