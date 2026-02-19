import { jsPDF } from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

// Brand colors (HSL converted to RGB for jsPDF)
const BRAND_PRIMARY = { r: 30, g: 112, b: 131 }; // #1E7083 - Teal
const BRAND_SECONDARY = { r: 45, g: 55, b: 72 }; // Dark slate
const MUTED_GRAY = { r: 120, g: 120, b: 120 };

/**
 * Fetch business profile for a company
 * @param {string} companyId - The company ID
 * @returns {Object|null} - Business profile or null
 */
const fetchBusinessProfile = async (companyId) => {
  if (!companyId) return null;
  
  try {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('company_id', companyId)
      .single();
    
    if (error) {
      console.warn('Could not fetch business profile:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('Error fetching business profile:', e);
    return null;
  }
};

/**
 * Fetch signatures for a work order
 * @param {string} companyId - The company ID
 * @param {string} workOrderId - The work order ID
 * @returns {Array} - Array of signatures
 */
const fetchSignatures = async (companyId, workOrderId) => {
  if (!companyId) return [];
  
  try {
    const { data, error } = await supabase
      .from('business_signatures')
      .select('*')
      .eq('company_id', companyId)
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.warn('Could not fetch signatures:', error.message);
      return [];
    }
    return data || [];
  } catch (e) {
    console.warn('Error fetching signatures:', e);
    return [];
  }
};

/**
 * Load image from URL as data URL
 * @param {string} url - Image URL
 * @returns {string|null} - Data URL or null
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
 * Generate a Repair Order (RO) Packet PDF for a work order
 * @param {Object} workOrder - The work order data
 * @param {Object} truck - The associated truck data
 * @param {Object} diagnosticContent - Optional AI-generated diagnostic content
 * @returns {void} - Downloads the PDF
 */
export const generateROPacketPDF = async (workOrder, truck, diagnosticContent = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = 20;
  const now = new Date();
  const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

  // Fetch business profile and signatures
  const companyId = workOrder.company_id;
  const [businessProfile, signatures] = await Promise.all([
    fetchBusinessProfile(companyId),
    fetchSignatures(companyId, workOrder.id)
  ]);

  // Load business logo if available
  let businessLogoImg = null;
  if (businessProfile?.logo_url) {
    businessLogoImg = await loadImageFromUrl(businessProfile.logo_url);
  }

  // Fallback to FleetWise logo
  let logoImg = null;
  try {
    const response = await fetch('/fleetwise-logo.png');
    const blob = await response.blob();
    logoImg = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Could not load FleetWise logo for PDF:', e);
  }

  // Use business logo if available, otherwise FleetWise logo
  const headerLogo = businessLogoImg || logoImg;

  // Track total pages for footer
  let totalPages = 1;

  // Get signature by type
  const getSignatureByType = (type) => {
    return signatures.find(s => s.signature_type === type) || null;
  };

  // Format business address
  const formatBusinessAddress = () => {
    if (!businessProfile) return null;
    
    const parts = [];
    if (businessProfile.address_line_1) parts.push(businessProfile.address_line_1);
    if (businessProfile.address_line_2) parts.push(businessProfile.address_line_2);
    
    const cityStateZip = [
      businessProfile.city,
      businessProfile.state,
      businessProfile.postal_code
    ].filter(Boolean).join(', ');
    
    if (cityStateZip) parts.push(cityStateZip);
    if (businessProfile.country && businessProfile.country !== 'USA' && businessProfile.country !== 'US') {
      parts.push(businessProfile.country);
    }
    
    return parts.length > 0 ? parts : null;
  };

  // Add branded footer to a page - clean single-line format
  const addBrandedFooter = (pageNum) => {
    const footerY = pageHeight - 10;
    
    // Footer divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    
    // Footer text - single line format
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED_GRAY.r, MUTED_GRAY.g, MUTED_GRAY.b);
    
    const generatedBy = businessProfile?.display_name || 'FleetWise AI';
    const footerText = `Generated by ${generatedBy} | ${timestamp} | Page ${pageNum}`;
    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
  };

  // Add branded header with logo image and business info
  const addBrandedHeader = (logoDataUrl, isFirstPage = false) => {
    if (logoDataUrl) {
      // Add logo image - left aligned, professional size
      const logoWidth = 38;
      const logoHeight = 7;
      doc.addImage(logoDataUrl, 'PNG', margin, 8, logoWidth, logoHeight);
    } else if (businessProfile?.display_name) {
      // Use business name if no logo
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b);
      doc.text(businessProfile.display_name, margin, 13);
    } else {
      // Fallback to FleetWise AI text
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b);
      doc.text('FleetWise AI', margin, 13);
    }

    // Add business contact info on first page (right side of header)
    if (isFirstPage && businessProfile) {
      const rightX = pageWidth - margin;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED_GRAY.r, MUTED_GRAY.g, MUTED_GRAY.b);
      
      let contactY = 8;
      
      // Phone
      if (businessProfile.phone) {
        doc.text(businessProfile.phone, rightX, contactY, { align: 'right' });
        contactY += 3.5;
      }
      
      // Email
      if (businessProfile.email) {
        doc.text(businessProfile.email, rightX, contactY, { align: 'right' });
        contactY += 3.5;
      }
      
      // Address (abbreviated)
      const addressParts = formatBusinessAddress();
      if (addressParts && addressParts.length > 0) {
        // Show just city, state on header
        const shortAddress = [businessProfile.city, businessProfile.state].filter(Boolean).join(', ');
        if (shortAddress) {
          doc.text(shortAddress, rightX, contactY, { align: 'right' });
        }
      }
      
      doc.setTextColor(0, 0, 0);
    }
    
    // Header divider line
    doc.setDrawColor(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b);
    doc.setLineWidth(0.6);
    doc.line(margin, 18, pageWidth - margin, 18);
    
    doc.setTextColor(0, 0, 0);
    doc.setLineWidth(0.2);
  };

  // Helper functions - SECTION HEADERS PRESERVED AS-IS (teal background)
  const addSectionHeader = (text) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(BRAND_PRIMARY.r, BRAND_PRIMARY.g, BRAND_PRIMARY.b);
    doc.rect(margin, yPos - 5, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(text, margin + 3, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 10;
  };

  const addField = (label, value) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const labelWidth = doc.getTextWidth(`${label}: `);
    doc.text(value || 'N/A', margin + labelWidth + 2, yPos);
    yPos += 6; // Slightly reduced for consistency
  };

  const addMultiLineField = (label, value) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    if (value) {
      const lines = doc.splitTextToSize(value, pageWidth - margin * 2 - 5);
      doc.text(lines, margin + 5, yPos);
      yPos += lines.length * 5.5 + 2; // Slightly increased line height
    } else {
      doc.text('N/A', margin + 5, yPos);
      yPos += 6;
    }
  };

  const addMultiLineText = (text) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (text) {
      const lines = doc.splitTextToSize(text, pageWidth - margin * 2 - 5);
      doc.text(lines, margin + 5, yPos);
      yPos += lines.length * 5.5 + 2; // Increased line height for readability
    } else {
      doc.text('N/A', margin + 5, yPos);
      yPos += 6;
    }
  };

  // Fixed numbering - properly incremented, no duplicates
  const addNumberedList = (items) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (items && items.length > 0) {
      items.forEach((item, index) => {
        checkPageBreak(15);
        // Clean the item text - remove any existing numbering at the start
        let cleanItem = item.toString().trim();
        // Remove patterns like "1. ", "1) ", "1 - " at the beginning
        cleanItem = cleanItem.replace(/^\d+[\.\)\-\s]+\s*/, '');
        
        const numberedText = `${index + 1}. ${cleanItem}`;
        const lines = doc.splitTextToSize(numberedText, pageWidth - margin * 2 - 10);
        doc.text(lines, margin + 5, yPos);
        yPos += lines.length * 5.5 + 2;
      });
    } else {
      doc.text('No steps specified', margin + 5, yPos);
      yPos += 6;
    }
  };

  const checkPageBreak = (neededSpace = 30) => {
    if (yPos > pageHeight - neededSpace - 15) {
      doc.addPage();
      totalPages++;
      addBrandedHeader(headerLogo, false);
      yPos = 26;
    }
  };

  // Add signature with image if available
  const addSignatureWithImage = async (label, signature, xOffset = 0) => {
    const sigX = margin + xOffset;
    
    if (signature?.signature_image_url) {
      // Try to load and add signature image
      const sigImg = await loadImageFromUrl(signature.signature_image_url);
      if (sigImg) {
        doc.addImage(sigImg, 'PNG', sigX, yPos - 12, 50, 12);
      }
    }
    
    // Signature line
    doc.setDrawColor(0);
    doc.line(sigX, yPos, sigX + 70, yPos);
    doc.setFontSize(9);
    doc.text(label, sigX, yPos + 5);
    
    // Add signer name and date if available
    if (signature?.signer_name) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(signature.signer_name, sigX, yPos + 9);
      doc.setFont('helvetica', 'normal');
    }
    
    // Date column
    doc.line(sigX + 90, yPos, sigX + 130, yPos);
    doc.setFontSize(9);
    doc.text('Date', sigX + 90, yPos + 5);
    
    if (signature?.signed_at) {
      const signedDate = new Date(signature.signed_at).toLocaleDateString();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(signedDate, sigX + 90, yPos + 9);
    }
  };

  // ========== PAGE 1 HEADER ==========
  addBrandedHeader(headerLogo, true);
  yPos = 26;

  // ========== BUSINESS INFO BLOCK (if profile exists) ==========
  if (businessProfile) {
    const addressParts = formatBusinessAddress();
    if (addressParts && addressParts.length > 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(MUTED_GRAY.r, MUTED_GRAY.g, MUTED_GRAY.b);
      addressParts.forEach((line) => {
        doc.text(line, margin, yPos);
        yPos += 3.5;
      });
      doc.setTextColor(0, 0, 0);
      yPos += 2;
    }
  }

  // ========== MAIN TITLE - Left aligned, sentence case, smaller ==========
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(BRAND_SECONDARY.r, BRAND_SECONDARY.g, BRAND_SECONDARY.b);
  doc.text('Repair Order Packet', margin, yPos);
  yPos += 5;
  
  // ========== SUBTITLE - Muted gray, normal weight ==========
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED_GRAY.r, MUTED_GRAY.g, MUTED_GRAY.b);
  doc.text('AI-Assisted Diagnostic Report', margin, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 8;

  // ========== METADATA BLOCK - Compact two-column layout ==========
  doc.setFontSize(9);
  const woNumber = workOrder.work_order_number || workOrder.id?.slice(0, 8) || 'N/A';
  const woStatus = workOrder.status?.replace('_', ' ')?.toUpperCase() || 'PENDING';
  
  // Left column: Work Order #
  doc.setFont('helvetica', 'bold');
  doc.text('Work Order:', margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(woNumber, margin + doc.getTextWidth('Work Order: ') + 1, yPos);
  
  // Middle: Status
  const statusX = margin + 60;
  doc.setFont('helvetica', 'bold');
  doc.text('Status:', statusX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(woStatus, statusX + doc.getTextWidth('Status: ') + 1, yPos);
  
  // Right: Generated date
  const dateX = margin + 110;
  doc.setFont('helvetica', 'bold');
  doc.text('Generated:', dateX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED_GRAY.r, MUTED_GRAY.g, MUTED_GRAY.b);
  doc.text(timestamp, dateX + doc.getTextWidth('Generated: ') + 1, yPos);
  doc.setTextColor(0, 0, 0);
  
  yPos += 10;

  // ========== VEHICLE INFORMATION ==========
  checkPageBreak();
  addSectionHeader('VEHICLE INFORMATION');
  
  // Handle both flat structure and nested identity structure from truckAPI
  const truckVin = truck?.identity?.vin || truck?.vin;
  const truckUnitId = truck?.identity?.unit_id || truck?.identity?.truck_number || truck?.unit_id;
  const truckYear = truck?.identity?.year || truck?.year;
  const truckMake = truck?.identity?.make || truck?.make;
  const truckModel = truck?.identity?.model || truck?.model;
  const truckOdometer = truck?.identity?.odometer_mi || truck?.odometer_miles;
  const truckEngineHours = truck?.identity?.engine_hours || truck?.engine_hours;
  
  // Engine info
  const engineInfo = truck?.engine?.manufacturer && truck?.engine?.model
    ? `${truck.engine.manufacturer} ${truck.engine.model}`
    : (truck?.engine?.model || truck?.engine?.manufacturer || null);
  
  addField('VIN', workOrder.extracted_vin || truckVin);
  addField('Make / Model / Year', `${workOrder.extracted_make || truckMake || 'N/A'} ${workOrder.extracted_model || truckModel || ''} (${workOrder.extracted_year || truckYear || 'N/A'})`);
  addField('Engine', engineInfo || 'N/A');
  addField('Odometer', workOrder.extracted_odometer ? `${workOrder.extracted_odometer.toLocaleString()} miles` : (truckOdometer ? `${Number(truckOdometer).toLocaleString()} miles` : 'N/A'));
  yPos += 4;

  // ========== CUSTOMER INFORMATION ==========
  checkPageBreak();
  addSectionHeader('CUSTOMER INFORMATION');
  addField('Customer Name', workOrder.customer_name || 'N/A');
  yPos += 4;

  // ========== WORK ORDER DETAILS ==========
  checkPageBreak();
  addSectionHeader('WORK ORDER DETAILS');
  addField('Work Order ID', workOrder.work_order_number || workOrder.id?.slice(0, 8) || 'N/A');
  addField('Status', workOrder.status?.replace('_', ' ')?.toUpperCase() || 'N/A');
  // Use work_order_date if available, otherwise fall back to current date
  const woDate = workOrder.work_order_date 
    ? new Date(workOrder.work_order_date).toLocaleDateString() 
    : new Date().toLocaleDateString();
  addField('Date', woDate);
  yPos += 2;

  // Complaint
  addMultiLineField('Complaint', workOrder.complaint);
  
  // Fault Codes
  if (workOrder.fault_codes && workOrder.fault_codes.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Fault Codes:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    workOrder.fault_codes.forEach((code) => {
      doc.text(`• ${code}`, margin + 5, yPos);
      yPos += 5;
    });
  }
  yPos += 4;

  // ========== AI-GENERATED DIAGNOSTIC SECTIONS ==========
  if (diagnosticContent) {
    // Diagnostic Summary (AI-generated)
    checkPageBreak(50);
    addSectionHeader('DIAGNOSTIC SUMMARY (AI-GENERATED)');
    addMultiLineText(diagnosticContent.diagnostic_summary);
    yPos += 4;

    // Probable Root Cause
    checkPageBreak(40);
    addSectionHeader('PROBABLE ROOT CAUSE');
    addMultiLineText(diagnosticContent.probable_root_cause);
    yPos += 4;

    // Recommended Repair Steps (AI-generated, numbered - FIXED)
    checkPageBreak(50);
    addSectionHeader('RECOMMENDED REPAIR STEPS');
    addNumberedList(diagnosticContent.recommended_repair_steps);
    yPos += 4;

    // Safety Notes
    if (diagnosticContent.safety_notes) {
      checkPageBreak(40);
      addSectionHeader('SAFETY / NOTES');
      addMultiLineText(diagnosticContent.safety_notes);
      yPos += 4;
    }

    // Citations
    if (diagnosticContent.citations && diagnosticContent.citations.length > 0) {
      checkPageBreak(50);
      addSectionHeader('CITATIONS (KNOWLEDGE BASE SOURCES)');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      diagnosticContent.citations.forEach((citation, index) => {
        checkPageBreak(15);
        const title = citation.title || `Source ${citation.source_index || index + 1}`;
        const relevance = citation.relevance ? ` - ${citation.relevance}` : '';
        const similarity = citation.similarity ? ` (${(citation.similarity * 100).toFixed(0)}% match)` : '';
        const citationText = `${index + 1}. ${title}${similarity}${relevance}`;
        const lines = doc.splitTextToSize(citationText, pageWidth - margin * 2 - 10);
        doc.text(lines, margin + 5, yPos);
        yPos += lines.length * 4.5 + 2;
      });
      yPos += 4;
    }
  } else {
    // Fallback to database fields if no AI content
    // Cause Section
    checkPageBreak(40);
    addSectionHeader('CAUSE / DIAGNOSIS');
    addMultiLineText(workOrder.cause || 'No diagnosis recorded');
    yPos += 4;

    // Correction Section
    checkPageBreak(40);
    addSectionHeader('CORRECTION / WORK PERFORMED');
    addMultiLineText(workOrder.correction || 'No correction recorded');
    yPos += 4;
  }

  // ========== SIGNATURE SECTION ==========
  checkPageBreak(80);
  yPos += 8;
  addSectionHeader('SIGNATURES');
  yPos += 12;

  // Get signatures from database
  const technicianSig = getSignatureByType('technician');
  const authorizedRepSig = getSignatureByType('authorized_rep');
  const customerSig = getSignatureByType('customer');

  // Technician signature
  await addSignatureWithImage('Technician Signature', technicianSig, 0);
  yPos += 22;

  // Authorized representative signature (if exists)
  if (authorizedRepSig) {
    await addSignatureWithImage('Authorized Representative', authorizedRepSig, 0);
    yPos += 22;
  }

  // Customer signature
  await addSignatureWithImage('Customer Signature', customerSig, 0);

  // ========== ADD FOOTERS TO ALL PAGES ==========
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addBrandedFooter(i);
  }

  // Generate filename and download
  const woNum = workOrder.work_order_number || workOrder.id?.slice(0, 8) || 'WO';
  const filename = `RO_Packet_${woNum}_${new Date().toISOString().split('T')[0]}.pdf`;
  
  doc.save(filename);
};
