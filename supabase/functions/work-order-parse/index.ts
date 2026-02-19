import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// OpenAI prompt for fleet maintenance work order extraction
// SIMPLIFIED: Focused on Complaint/Cause/Correction - Labor extraction removed
const EXTRACTION_PROMPT = `You are an expert fleet maintenance document extraction engine.
Your responsibility is to analyze Work Order documents and extract vehicle info, customer info, work order details, and repair information (Complaint, Cause, Correction).

**CRITICAL: COMPLAINT/CAUSE/CORRECTION EXTRACTION**
The most important data to extract is the Complaint, Cause, and Correction for each repair line:
- COMPLAINT: What the customer reported or what issue was observed
- CAUSE: What was diagnosed as the root cause of the problem
- CORRECTION: What repair or action was taken to fix the issue

**MULTI-PAGE LINE ITEM EXTRACTION**
Work orders typically have a table with columns: Line, Billable, Reason, Activity, Repair Description, Qty/Hours, Rate, UOM
For EACH line item, you MUST extract:
- LINE NUMBER: The numeric line identifier (1, 2, 3, etc.)
- BILLABLE: B=Billable, N=Non-billable, W=Warranty
- REASON: Category code like "(08) PREVENTIVE", "(01) BREAKDOWN", "(02) SCHEDULED"
- ACTIVITY: Activity code like "(PM 005-50)", "(BR 001-10)" - often includes PM codes
- DESCRIPTION: The repair description like "PERFORM PM TRAILER SERVICE"
- COMPLAINT/CAUSE/CORRECTION: Look for these blocks that appear AFTER each line's details

If the document has MULTIPLE LINE ITEMS, you MUST:
- Scan EVERY page for line items (numbered 1, 2, 3, etc.)
- Create a SEPARATE entry in line_items[] for EACH numbered line
- Each line item has its OWN complaint, cause, and correction - DO NOT merge them

**PARTS EXTRACTION**
Parts are listed throughout work orders. Extract parts if present:
- Look for "Parts Used", "Parts", "Materials" sections
- Parts often appear in tables with columns: Part #, Description, Qty, Unit Price
- Common part number formats: alphanumeric codes like "3960618", "23-14792", "K068633"

CRITICAL EXTRACTION RULES:
1. Extract ONLY information that is EXPLICITLY present in the document
2. Do NOT guess, infer, or hallucinate missing values - return null if not found
3. VINs are exactly 17 alphanumeric characters (Serial # field often contains VIN)
4. Dates should be extracted in YYYY-MM-DD format when possible
5. Preserve original text formatting and technical language EXACTLY - do NOT rewrite
6. Detect "Complaint", "Cause", "Correction" text and extract VERBATIM for EACH line
7. Do NOT merge multiple repair lines into one - keep them SEPARATE

CONFIDENCE SCORING (per field):
- "high": Field is clearly visible and unambiguous in the document
- "medium": Field is present but may be partially obscured or abbreviated
- "low": Field is inferred from context or partially visible
- If a value is not present, set value to null

Return a JSON object with this EXACT structure:
{
  "work_order": {
    "work_order_number": { "value": "WO/RO number or null", "confidence": "high|medium|low" },
    "status": { "value": "open|closed|in-progress or null", "confidence": "high|medium|low" },
    "open_date": { "value": "YYYY-MM-DD or null", "confidence": "high|medium|low" },
    "close_date": { "value": "YYYY-MM-DD or null", "confidence": "high|medium|low" },
    "date": { "value": "YYYY-MM-DD service date or null", "confidence": "high|medium|low" },
    "facility": { "value": "facility/shop name or null", "confidence": "high|medium|low" },
    "shop": { "value": "shop location or null", "confidence": "high|medium|low" },
    "primary_complaint": { "value": "FIRST/MAIN complaint from Line 1 only", "confidence": "high|medium|low" },
    "all_complaints_summary": { "value": "Brief summary of ALL complaints across all lines", "confidence": "high|medium|low" },
    "fault_codes": { "value": ["array of fault codes like SPN/FMI, P-codes, J1939 codes"], "confidence": "high|medium|low" }
  },
  "truck": {
    "vin": { "value": "17-char VIN from Serial # field or null", "confidence": "high|medium|low" },
    "unit_number": { "value": "Unit # field value or null", "confidence": "high|medium|low" },
    "year": { "value": "number or null", "confidence": "high|medium|low" },
    "make": { "value": "manufacturer or null", "confidence": "high|medium|low" },
    "model": { "value": "model or null", "confidence": "high|medium|low" },
    "odometer": { "value": "number or null", "confidence": "high|medium|low", "unit": "miles|km" },
    "engine_hours": { "value": "number or null", "confidence": "high|medium|low" },
    "license_plate": { "value": "license plate or null", "confidence": "high|medium|low" }
  },
  "customer": {
    "name": { "value": "customer/company name or null", "confidence": "high|medium|low" },
    "id_ref": { "value": "customer reference ID or null", "confidence": "high|medium|low" },
    "location": { "value": "city, state or full address or null", "confidence": "high|medium|low" }
  },
  "line_items": [
    {
      "line_number": "1, 2, 3, etc. - MUST match document line numbers",
      "billable": "B for billable, N for non-billable, W for warranty - from Billable column",
      "reason": "Reason code like (08) PREVENTIVE, (01) BREAKDOWN, etc. - VERBATIM from Reason column",
      "activity": "Activity code like (PM 005-50), (BR 001-10), etc. - VERBATIM from Activity column",
      "description": "Repair description like PERFORM PM TRAILER SERVICE - VERBATIM from Repair Description column",
      "complaint": "THIS LINE's specific complaint text - VERBATIM",
      "cause": "THIS LINE's specific cause text - VERBATIM or null",
      "correction": "THIS LINE's specific correction text - VERBATIM or null",
      "parts": [
        {
          "part_number": "part number like 3960618, 23-14792",
          "description": "part description like OIL FILTER, AIR FILTER",
          "quantity": "number - default to 1 if not specified",
          "unit_price": "price per unit (number, no $) or null"
        }
      ],
      "notes": "any additional notes for this line item"
    }
  ],
  "parts_summary": [
    {
      "part_number": "unique part number",
      "description": "part description",
      "quantity": "total quantity used",
      "unit_price": "unit price if available or null",
      "category": "filter|oil|brake|tire|electrical|misc - inferred from description"
    }
  ],
  "total_line_items_count": "number - how many line items were found",
  "total_parts_count": "number - how many unique parts were found",
  "service_categories": {
    "pm": true,
    "brakes": true,
    "tires": true,
    "emissions": false,
    "engine": false,
    "transmission": false,
    "electrical": false,
    "hvac": false,
    "suspension": true,
    "body": true,
    "steering": false,
    "fuel_system": false
  },
  "parts_listed": [],
  "parts_total_cost": "sum of all part costs or null",
  "additional_notes": "any other notes from document or null",
  "extraction_confidence": "high|medium|low"
}

FOCUS: The most critical fields are complaint, cause, and correction for each line item.
This extraction is used for Work Order creation and Diagnostic RAG context.`;

const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { headers: jsonHeaders, status });
}

function parseModelJson(raw: unknown) {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('AI returned an empty response');
  }

  let text = raw.trim();

  // Remove markdown fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\s*/m, '').replace(/```\s*$/m, '').trim();
  }

  // Extract the first JSON object if there is surrounding text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  return JSON.parse(text);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...params } = await req.json();

    console.log(`Work Order Parse action: ${action}`);

    switch (action) {
      case 'parse_ocr': {
        // OCR: Extract text from page images using vision API
        const { pageImages, fileName, companyId, userId } = params;
        
        console.log(`[parse_ocr] OCR extraction for: ${fileName}`);
        console.log(`[parse_ocr] Processing ${pageImages?.length || 0} page images`);

        if (!pageImages || pageImages.length === 0) {
          return jsonResponse(
            {
              success: false,
              error: 'No page images provided for OCR',
            },
            200
          );
        }

        if (!openAIApiKey) {
          console.error('[parse_ocr] OpenAI API key not configured');
          return jsonResponse({ success: false, error: 'OpenAI API key not configured' }, 200);
        }

        // Build vision API request with images
        const imageContents = pageImages.map((img: { base64: string; pageNumber: number }) => ({
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${img.base64}`,
            detail: 'high', // High detail for work orders
          }
        }));

        console.log('[parse_ocr] Calling OpenAI Vision API for OCR + extraction...');
        
        const ocrResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { 
                role: 'system', 
                content: `You are a work order OCR and extraction specialist. You will be given images of a vehicle work order document.

TASK 1: First, perform OCR to read ALL text visible in the images.
TASK 2: Then extract structured data from the text you read.

${EXTRACTION_PROMPT}

Add an "ocr_text" field at the root level containing the full OCR text you extracted from the images.`
              },
              { 
                role: 'user', 
                content: [
                  { type: 'text', text: `CRITICAL: This is a MULTI-PAGE work order. You MUST:
1. Read ALL pages carefully (there may be 6+ pages)
2. Find EVERY numbered line item (Line 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, etc.)
3. Extract the complaint, cause, and correction for EACH line - they are different for each line!
4. Include ALL technicians with their IDs and hours for each line

Extract the complete structured data from these work order pages:` },
                  ...imageContents
                ]
              }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 12000,
            temperature: 0.1,
          }),
        });

        if (!ocrResponse.ok) {
          const error = await ocrResponse.json();
          console.error('[parse_ocr] OpenAI Vision error:', error);
          throw new Error(`OpenAI Vision API error: ${error.error?.message || 'Unknown error'}`);
        }

        const ocrData = await ocrResponse.json();
        const ocrJson = ocrData.choices?.[0]?.message?.content;
        const finishReason = ocrData.choices?.[0]?.finish_reason;

        let extracted: any;
        try {
          extracted = parseModelJson(ocrJson);
        } catch (parseError) {
          console.error('[parse_ocr] Failed to parse OCR response:', parseError);
          const hint = finishReason === 'length'
            ? 'AI response was truncated (token limit).'
            : 'AI response was not valid JSON.';
          return jsonResponse({ success: false, error: `Failed to parse OCR response from AI. ${hint}` }, 200);
        }

        console.log(`[parse_ocr] OCR extraction complete. Line items found: ${extracted.line_items?.length || 0}`);

        const ocrText = typeof extracted.ocr_text === 'string' ? extracted.ocr_text.slice(0, 20000) : '';

        // Return extracted data for user review - focused on complaint/cause/correction
        return jsonResponse({
          success: true,
          ready_to_save: true,
          ocr_text: ocrText,
          extracted_data: {
            truck: extracted.truck || {},
            customer: extracted.customer || {},
            work_order: extracted.work_order || {},
            line_items: extracted.line_items || [],
            parts_summary: extracted.parts_summary || [],
            service_categories: extracted.service_categories || {},
            parts_listed: extracted.parts_listed || [],
            parts_total_cost: extracted.parts_total_cost,
            total_parts_count: extracted.total_parts_count,
            extraction_confidence: extracted.extraction_confidence || 'medium',
            source_file_name: fileName,
          },
        });
      }

      case 'parse_text': {
        // Parse pre-extracted text from PDF
        const { content, fileName, companyId, userId } = params;
        
        console.log(`[parse_text] Parsing work order from: ${fileName}`);
        console.log(`[parse_text] Content length: ${content?.length || 0} characters`);

        if (!content || content.length < 50) {
          return jsonResponse(
            {
              success: false,
              error: 'Insufficient text content extracted from PDF. Document may be scanned or image-based.',
            },
            200
          );
        }

        if (!openAIApiKey) {
          console.error('[parse_text] OpenAI API key not configured');
          return new Response(
            JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        // Call OpenAI to extract structured data
        console.log('[parse_text] Calling OpenAI for extraction...');
        const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: EXTRACTION_PROMPT },
              { role: 'user', content: `CRITICAL MULTI-PAGE WORK ORDER EXTRACTION:

This document has MULTIPLE PAGES with MULTIPLE LINE ITEMS. You MUST:
1. Find ALL numbered line items (Line 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, etc.)
2. Each line has its OWN Complaint, Cause, and Correction - extract them ALL separately
3. Include ALL technicians with their IDs (like 1162, 1091) and hours for each line
4. Do NOT merge lines - if there are 11 lines, return 11 line_items entries

Document content:
${content.slice(0, 30000)}` }
            ],
            response_format: { type: 'json_object' },
            max_tokens: 12000,
            temperature: 0.1,
          }),
        });

        if (!extractionResponse.ok) {
          const error = await extractionResponse.json();
          console.error('[parse_text] OpenAI error:', error);
          throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
        }

        const extractionData = await extractionResponse.json();
        const extractedJson = extractionData.choices?.[0]?.message?.content;
        const finishReason = extractionData.choices?.[0]?.finish_reason;

        let extracted: any;
        try {
          extracted = parseModelJson(extractedJson);
        } catch (parseError) {
          console.error('[parse_text] Failed to parse extraction response:', parseError);
          const hint = finishReason === 'length'
            ? 'AI response was truncated (token limit).'
            : 'AI response was not valid JSON.';
          return jsonResponse({ success: false, error: `Failed to parse extraction response from AI. ${hint}` }, 200);
        }

        console.log(`[parse_text] Extraction complete. Line items: ${extracted.line_items?.length || 0}, Parts: ${extracted.parts_summary?.length || 0}`);

        // Return extracted data for user review - focused on complaint/cause/correction
        return new Response(
          JSON.stringify({
            success: true,
            ready_to_save: true,
            extracted_data: {
              truck: extracted.truck || {},
              customer: extracted.customer || {},
              work_order: extracted.work_order || {},
              line_items: extracted.line_items || [],
              parts_summary: extracted.parts_summary || [],
              service_categories: extracted.service_categories || {},
              parts_listed: extracted.parts_listed || [],
              parts_total_cost: extracted.parts_total_cost,
              total_parts_count: extracted.total_parts_count,
              extraction_confidence: extracted.extraction_confidence || 'medium',
              source_file_name: fileName,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'scan_and_create': {
        // FULL PIPELINE: Parse PDF, resolve truck/customer, create work order, start diagnostic session
        const { content, fileName, companyId, userId, mode, confirmedData } = params;
        
        console.log(`[scan_and_create] Processing work order from: ${fileName}`);
        console.log(`[scan_and_create] Company: ${companyId}, User: ${userId}, Mode: ${mode}`);
        console.log(`[scan_and_create] Has confirmed data: ${!!confirmedData}`);

        // Helper to extract value from either {value, confidence} format or plain value
        const getValue = (field: unknown): unknown => {
          if (field === null || field === undefined) return null;
          if (typeof field === 'object' && field !== null && 'value' in field) {
            return (field as { value: unknown }).value;
          }
          return field;
        };

        // Normalize confirmed data to extract plain values from {value, confidence} format
        interface ExtractedSection {
          vin?: string;
          unit_number?: string;
          year?: number;
          make?: string;
          model?: string;
          odometer?: number;
          engine_hours?: number;
          license_plate?: string;
          name?: string;
          id_ref?: string;
          location?: string;
          work_order_number?: string;
          date?: string;
          complaint?: string;
          cause?: string;
          correction?: string;
          fault_codes?: string[];
          [key: string]: unknown;
        }

        const normalizeSection = (section: Record<string, unknown> | undefined): ExtractedSection => {
          if (!section) return {};
          const normalized: ExtractedSection = {};
          for (const [key, value] of Object.entries(section)) {
            normalized[key] = getValue(value);
          }
          return normalized;
        };

        interface PartItem {
          description?: string;
          quantity?: number;
          part_number?: string;
        }

        let truckData: ExtractedSection;
        let customerData: ExtractedSection;
        let work_order: ExtractedSection;
        let service_categories: Record<string, boolean>;
        let parts_listed: PartItem[];
        let labor_hours: number | null;

        // Use confirmed/edited data if provided, otherwise extract from content
        if (confirmedData) {
          // User has reviewed and potentially edited the extracted data
          console.log('[scan_and_create] Using user-confirmed data');
          // Normalize to extract plain values from {value, confidence} format
          truckData = normalizeSection(confirmedData.truck);
          customerData = normalizeSection(confirmedData.customer);
          work_order = normalizeSection(confirmedData.work_order);
          service_categories = confirmedData.service_categories || {};
          parts_listed = confirmedData.parts_listed || [];
          labor_hours = getValue(confirmedData.labor_hours) as number | null;
        } else {
          // Extract from content using AI (backward compatibility)
          console.log(`[scan_and_create] Content length: ${content?.length || 0} characters`);

          if (!content || content.length < 50) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Insufficient text content extracted from PDF. Document may be scanned or image-based.'
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
            );
          }

          if (!openAIApiKey) {
            console.error('[scan_and_create] OpenAI API key not configured');
            return new Response(
              JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            );
          }

          // Step 1: Extract structured data using OpenAI
          console.log('[scan_and_create] Step 1: Calling OpenAI for extraction...');
          const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: EXTRACTION_PROMPT },
                { role: 'user', content: `Extract data from this work order:\n\n${content.slice(0, 15000)}` }
              ],
              response_format: { type: 'json_object' },
              max_tokens: 6000,
              temperature: 0.1,
            }),
          });

          if (!extractionResponse.ok) {
            const error = await extractionResponse.json();
            console.error('[scan_and_create] OpenAI error:', error);
            throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
          }

           const extractionData = await extractionResponse.json();
           const extractedJson = extractionData.choices?.[0]?.message?.content;
           const finishReason = extractionData.choices?.[0]?.finish_reason;
           
           let extracted: any;
           try {
             extracted = parseModelJson(extractedJson);
           } catch (parseError) {
             console.error('[scan_and_create] Failed to parse extraction response:', parseError);
             const hint = finishReason === 'length'
               ? 'AI response was truncated (token limit).'
               : 'AI response was not valid JSON.';
             return jsonResponse({ success: false, error: `Failed to parse extraction response from AI. ${hint}` }, 200);
           }

          console.log('[scan_and_create] Extraction complete');
          // Normalize AI response as well (new format includes {value, confidence})
          truckData = normalizeSection(extracted.truck);
          customerData = normalizeSection(extracted.customer);
          work_order = normalizeSection(extracted.work_order);
          service_categories = extracted.service_categories || {};
          parts_listed = extracted.parts_listed || [];
          labor_hours = getValue(extracted.labor_hours) as number | null;
        }

        // Step 2: Resolve truck (find or create)
        console.log('[scan_and_create] Step 2: Resolving truck...');
        let truckId = null;
        let truckAutoCreated = false;
        let resolvedTruck = null;
        const vin = truckData?.vin?.toUpperCase();

        if (vin && vin.length === 17) {
          // Check if truck exists
          const { data: existingTruck, error: truckLookupError } = await supabase
            .from('trucks')
            .select('*')
            .eq('vin', vin)
            .eq('company_id', companyId)
            .maybeSingle();

          if (truckLookupError) {
            console.error('[scan_and_create] Truck lookup error:', truckLookupError);
          }

          if (existingTruck) {
            truckId = existingTruck.id;
            resolvedTruck = existingTruck;
            console.log('[scan_and_create] Found existing truck:', truckId);
            
            // Update truck with latest data from work order
            const updateData: Record<string, unknown> = {};
            if (work_order?.date) {
              updateData.last_service_date = work_order.date;
            }
            if (truckData?.odometer) {
              updateData.last_service_odometer = truckData.odometer;
              updateData.odometer_miles = truckData.odometer;
            }
            if (truckData?.engine_hours) {
              updateData.engine_hours = truckData.engine_hours;
            }
            
            if (Object.keys(updateData).length > 0) {
              updateData.updated_at = new Date().toISOString();
              const { data: updatedTruck } = await supabase
                .from('trucks')
                .update(updateData)
                .eq('id', truckId)
                .select()
                .single();
              
              if (updatedTruck) {
                resolvedTruck = updatedTruck;
              }
            }
          } else {
            // Auto-create truck with extracted data
            console.log('[scan_and_create] Creating new truck with VIN:', vin);
            
            const newTruckData = {
              company_id: companyId,
              vin: vin,
              unit_id: truckData?.unit_number || null,
              truck_number: truckData?.unit_number || null,
              year: truckData?.year || null,
              make: truckData?.make || null,
              model: truckData?.model || null,
              odometer_miles: truckData?.odometer || null,
              engine_hours: truckData?.engine_hours || null,
              license_plate: truckData?.license_plate || null,
              last_service_date: work_order?.date || null,
              last_service_odometer: truckData?.odometer || null,
              customer_name: customerData?.name || null,
            };

            const { data: newTruck, error: truckError } = await supabase
              .from('trucks')
              .insert(newTruckData)
              .select()
              .single();

            if (truckError) {
              console.error('[scan_and_create] Error creating truck:', truckError);
            } else {
              truckId = newTruck.id;
              resolvedTruck = newTruck;
              truckAutoCreated = true;
              console.log('[scan_and_create] Created new truck:', truckId);
            }
          }
        } else {
          console.log('[scan_and_create] No valid VIN found, skipping truck resolution');
        }

        // Step 3: Resolve customer (find by name or create)
        console.log('[scan_and_create] Step 3: Resolving customer...');
        let customerId = null;
        let customerAutoCreated = false;
        const customerName = customerData?.name?.trim();

        if (customerName) {
          // Try to find existing customer by name within the company
          const { data: existingCustomer, error: customerLookupError } = await supabase
            .from('customers')
            .select('id, name')
            .eq('company_id', companyId)
            .ilike('name', customerName)
            .maybeSingle();

          if (customerLookupError) {
            console.error('[scan_and_create] Customer lookup error:', customerLookupError);
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
            console.log('[scan_and_create] Found existing customer:', customerId);
          } else {
            // Create new customer
            console.log('[scan_and_create] Creating new customer:', customerName);
            
            // Parse location into city/state if available
            let city = null;
            let state = null;
            const location = customerData?.location;
            if (location) {
              const locationParts = location.split(',').map((p: string) => p.trim());
              if (locationParts.length >= 2) {
                city = locationParts[0];
                state = locationParts[1];
              } else if (locationParts.length === 1) {
                city = locationParts[0];
              }
            }

            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_id: companyId,
                name: customerName,
                external_id: customerData?.id_ref || null,
                city: city,
                state: state,
              })
              .select('id')
              .single();

            if (customerError) {
              console.error('[scan_and_create] Error creating customer:', customerError);
            } else {
              customerId = newCustomer.id;
              customerAutoCreated = true;
              console.log('[scan_and_create] Created new customer:', customerId);
            }
          }

          // Link truck to customer if both exist and truck doesn't have a customer
          if (truckId && customerId && resolvedTruck && !resolvedTruck.customer_id) {
            await supabase
              .from('trucks')
              .update({ 
                customer_id: customerId, 
                customer_name: customerName,
                updated_at: new Date().toISOString() 
              })
              .eq('id', truckId);
            console.log('[scan_and_create] Linked truck to customer');
          }
        }

        // Step 4: Create work order record
        console.log('[scan_and_create] Step 4: Creating work order...');
        const workOrderData = {
          company_id: companyId,
          truck_id: truckId,
          customer_id_ref: customerData?.id_ref || null,
          work_order_number: work_order?.work_order_number || null,
          source_file_name: fileName || null,
          extracted_vin: vin || null,
          extracted_unit_number: truckData?.unit_number || null,
          extracted_year: truckData?.year || null,
          extracted_make: truckData?.make || null,
          extracted_model: truckData?.model || null,
          extracted_odometer: truckData?.odometer || null,
          customer_name: customerName || null,
          customer_location: customerData?.location || null,
          complaint: work_order?.complaint || null,
          cause: work_order?.cause || null,
          correction: work_order?.correction || null,
          fault_codes: work_order?.fault_codes || [],
          work_order_date: work_order?.date || new Date().toISOString().split('T')[0],
          status: 'linked',
          truck_auto_created: truckAutoCreated,
        };

        const { data: savedWorkOrder, error: woError } = await supabase
          .from('work_orders')
          .insert(workOrderData)
          .select()
          .single();

        if (woError) {
          console.error('[scan_and_create] Error saving work order:', woError);
          throw new Error(`Failed to save work order: ${woError.message}`);
        }

        console.log('[scan_and_create] Created work order:', savedWorkOrder.id);

        // Step 5: Create maintenance records for each service category
        console.log('[scan_and_create] Step 5: Creating maintenance records...');
        const maintenanceRecords = [];
        const categories = service_categories || {};

        for (const [category, isPresent] of Object.entries(categories)) {
          if (isPresent && ['pm', 'brakes', 'tires', 'emissions', 'engine', 'transmission', 'electrical', 'hvac', 'suspension'].includes(category)) {
            maintenanceRecords.push({
              company_id: companyId,
              truck_id: truckId,
              work_order_id: savedWorkOrder.id,
              service_category: category,
              service_type: getCategoryLabel(category),
              description: work_order?.correction || work_order?.complaint || null,
              service_date: work_order?.date || new Date().toISOString().split('T')[0],
              odometer_at_service: truckData?.odometer || null,
              engine_hours_at_service: truckData?.engine_hours || null,
              parts_used: (parts_listed || []).filter((p: { description?: string }) => p.description),
              labor_hours: labor_hours || null,
              source: 'work_order',
              notes: work_order?.cause || null,
            });
          }
        }

        // If no categories detected but we have data, create a generic "other" record
        if (maintenanceRecords.length === 0 && (work_order?.complaint || work_order?.correction)) {
          maintenanceRecords.push({
            company_id: companyId,
            truck_id: truckId,
            work_order_id: savedWorkOrder.id,
            service_category: 'other',
            service_type: 'General Service',
            description: work_order?.correction || work_order?.complaint || null,
            service_date: work_order?.date || new Date().toISOString().split('T')[0],
            odometer_at_service: truckData?.odometer || null,
            engine_hours_at_service: truckData?.engine_hours || null,
            parts_used: parts_listed || [],
            labor_hours: labor_hours || null,
            source: 'work_order',
            notes: work_order?.cause || null,
          });
        }

        if (maintenanceRecords.length > 0 && truckId) {
          const { error: maintError } = await supabase
            .from('maintenance_records')
            .insert(maintenanceRecords);

          if (maintError) {
            console.error('[scan_and_create] Error creating maintenance records:', maintError);
          } else {
            console.log(`[scan_and_create] Created ${maintenanceRecords.length} maintenance records`);
          }
        }

        // Step 6: Save parts to work_order_parts table
        const allParts = confirmedData?.parts_summary || parts_listed || [];
        if (allParts.length > 0) {
          console.log(`[scan_and_create] Step 6: Saving ${allParts.length} parts...`);
          
          const partsToInsert = allParts.map((part: any) => ({
            work_order_id: savedWorkOrder.id,
            company_id: companyId,
            part_number: part.part_number || null,
            description: part.description || null,
            quantity: parseInt(part.quantity) || 1,
            unit_price: parseFloat(part.unit_price) || null,
            extended_price: parseFloat(part.extended_price) || null,
            category: part.category || null,
            notes: part.notes || null,
          }));
          
          const { error: partsError } = await supabase
            .from('work_order_parts')
            .insert(partsToInsert);
          
          if (partsError) {
            console.error('[scan_and_create] Error saving parts:', partsError);
          } else {
            console.log(`[scan_and_create] Saved ${partsToInsert.length} parts`);
          }
        }

        // Step 7: Save labor to work_order_labor table
        const laborSummary = confirmedData?.labor_summary || [];
        const lineItems = confirmedData?.line_items || [];
        
        // Collect labor from both labor_summary and line_items
        const allLabor: any[] = [...laborSummary];
        lineItems.forEach((item: any) => {
          if (item.labor && Array.isArray(item.labor)) {
            item.labor.forEach((l: any) => {
              allLabor.push({
                ...l,
                line_item_number: item.line_number,
              });
            });
          }
        });
        
        if (allLabor.length > 0) {
          console.log(`[scan_and_create] Step 7: Saving ${allLabor.length} labor entries...`);
          
          const laborToInsert = allLabor.map((labor: any) => ({
            work_order_id: savedWorkOrder.id,
            company_id: companyId,
            technician_id: labor.technician_id || null,
            technician_name: labor.technician_name || null,
            hours: parseFloat(labor.hours || labor.total_hours) || 0,
            line_item_number: labor.line_item_number || null,
            description: labor.description || null,
          }));
          
          const { error: laborError } = await supabase
            .from('work_order_labor')
            .insert(laborToInsert);
          
          if (laborError) {
            console.error('[scan_and_create] Error saving labor:', laborError);
          } else {
            console.log(`[scan_and_create] Saved ${laborToInsert.length} labor entries`);
          }
        }

        // Step 8: Create tasks from line items
        let tasksCreated = 0;
        if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
          console.log(`[scan_and_create] Step 8: Creating ${lineItems.length} tasks from line items...`);
          
          const tasksToInsert = lineItems.map((item: {
            line_number?: string;
            billable?: string;
            reason?: string;
            activity?: string;
            description?: string;
            complaint?: string;
            cause?: string;
            correction?: string;
          }) => {
            // Build task title: "(08) PREVENTIVE (PM 005-50) PERFORM PM TRAILER SERVICE"
            const titleParts = [
              item.reason,
              item.activity,
              item.description
            ].filter(Boolean);
            const taskTitle = titleParts.join(' ') || `Line ${item.line_number || 'Item'}`;

            return {
              work_order_id: savedWorkOrder.id,
              company_id: companyId,
              title: taskTitle,
              description: item.complaint || null,
              complaint: item.complaint || null,
              cause: item.cause || null,
              correction: item.correction || null,
              reason: item.reason || null,
              activity: item.activity || null,
              billable: item.billable || null,
              status: 'pending',
              priority: 'medium',
              task_type: 'repair',
            };
          });

          if (tasksToInsert.length > 0) {
            const { error: tasksError } = await supabase
              .from('work_order_tasks')
              .insert(tasksToInsert);

            if (tasksError) {
              console.error('[scan_and_create] Error creating tasks:', tasksError);
            } else {
              tasksCreated = tasksToInsert.length;
              console.log(`[scan_and_create] Created ${tasksCreated} tasks from line items`);
            }
          }
        }

        // Step 9: Start diagnostic session (if mode is diagnostic)
        let diagnosticSessionId = null;
        if (mode === 'diagnostic') {
          console.log('[scan_and_create] Step 9: Creating diagnostic chat session...');
          
          const sessionData = {
            company_id: companyId,
            work_order_id: savedWorkOrder.id,
            truck_id: truckId,
            complaint: work_order?.complaint || null,
            fault_codes: work_order?.fault_codes || [],
            status: 'active',
          };

          const { data: newSession, error: sessionError } = await supabase
            .from('diagnostic_chat_sessions')
            .insert(sessionData)
            .select('id')
            .single();

          if (sessionError) {
            console.error('[scan_and_create] Error creating diagnostic session:', sessionError);
          } else {
            diagnosticSessionId = newSession.id;
            console.log('[scan_and_create] Created diagnostic session:', diagnosticSessionId);
          }
        }

        console.log('[scan_and_create] Pipeline complete!');

        return new Response(
          JSON.stringify({
            success: true,
            project_id: savedWorkOrder.id,
            work_order_id: savedWorkOrder.id,
            truck_id: truckId,
            customer_id: customerId,
            diagnostic_session_id: diagnosticSessionId,
            truck_auto_created: truckAutoCreated,
            customer_auto_created: customerAutoCreated,
            maintenance_records_created: maintenanceRecords.length,
            extracted_data: {
              vin: vin,
              customer_name: customerName,
              complaint: work_order?.complaint,
              fault_codes: work_order?.fault_codes,
              work_order_number: work_order?.work_order_number,
            },
            message: `Work order created${truckAutoCreated ? ' with new truck profile' : ''}${customerAutoCreated ? ' and new customer' : ''}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'save_work_order': {
        // Save reviewed work order data to database
        const { extractedData, companyId, userId } = params;
        
        console.log('[save_work_order] Saving work order data...');
        console.log('[save_work_order] Company:', companyId);

        const { truck, customer, work_order, service_categories, parts_listed, labor_hours, source_file_name, line_items } = extractedData;

        // Step 1: Find or create truck
        let truckId = null;
        let truckAutoCreated = false;
        const vin = truck?.vin?.toUpperCase();

        if (vin && vin.length === 17) {
          // Check if truck exists
          const { data: existingTruck } = await supabase
            .from('trucks')
            .select('id')
            .eq('vin', vin)
            .eq('company_id', companyId)
            .maybeSingle();

          if (existingTruck) {
            truckId = existingTruck.id;
            console.log('[save_work_order] Found existing truck:', truckId);
            
            // Update last service date on existing truck
            const updateData: Record<string, unknown> = {};
            if (work_order?.date) {
              updateData.last_service_date = work_order.date;
            }
            if (truck?.odometer) {
              updateData.last_service_odometer = truck.odometer;
              updateData.odometer_miles = truck.odometer;
            }
            
            if (Object.keys(updateData).length > 0) {
              await supabase
                .from('trucks')
                .update(updateData)
                .eq('id', truckId);
            }
          } else {
            // Auto-create truck with ONLY safe data (no guessing)
            console.log('[save_work_order] Auto-creating truck with VIN:', vin);
            
            const newTruckData = {
              company_id: companyId,
              vin: vin,
              unit_id: truck?.unit_number || null,
              truck_number: truck?.unit_number || null,
              year: truck?.year || null,
              make: truck?.make || null,
              model: truck?.model || null,
              odometer_miles: truck?.odometer || null,
              engine_hours: truck?.engine_hours || null,
              last_service_date: work_order?.date || null,
              last_service_odometer: truck?.odometer || null,
            };

            const { data: newTruck, error: truckError } = await supabase
              .from('trucks')
              .insert(newTruckData)
              .select('id')
              .single();

            if (truckError) {
              console.error('[save_work_order] Error creating truck:', truckError);
            } else {
              truckId = newTruck.id;
              truckAutoCreated = true;
              console.log('[save_work_order] Created new truck:', truckId);
            }
        }
        }

        // Step 2: Find or create customer and link to truck
        let customerId: string | null = null;
        let customerAutoCreated = false;
        const customerName = customer?.name?.trim();

        if (customerName) {
          // Try to find existing customer by external_id first, then by name
          let existingCustomer = null;
          
          if (customer?.id_ref) {
            const { data: byExternalId } = await supabase
              .from('customers')
              .select('id')
              .eq('company_id', companyId)
              .eq('external_id', customer.id_ref)
              .maybeSingle();
            existingCustomer = byExternalId;
          }
          
          if (!existingCustomer) {
            const { data: byName } = await supabase
              .from('customers')
              .select('id')
              .eq('company_id', companyId)
              .eq('name', customerName)
              .maybeSingle();
            existingCustomer = byName;
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
            console.log('[save_work_order] Found existing customer:', customerId);
          } else {
            // Parse location into city/state if available
            let city = null;
            let state = null;
            const location = customer?.location;
            if (location) {
              const locationParts = location.split(',').map((p: string) => p.trim());
              if (locationParts.length >= 2) {
                city = locationParts[0];
                state = locationParts[1];
              } else if (locationParts.length === 1) {
                city = locationParts[0];
              }
            }

            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                company_id: companyId,
                name: customerName,
                external_id: customer?.id_ref || null,
                city: city,
                state: state,
              })
              .select('id')
              .single();

            if (customerError) {
              console.error('[save_work_order] Error creating customer:', customerError);
            } else {
              customerId = newCustomer.id;
              customerAutoCreated = true;
              console.log('[save_work_order] Created new customer:', customerId);
            }
          }

          // Link truck to customer if both exist and truck doesn't have a customer yet
          if (truckId && customerId) {
            // Check if truck already has a customer
            const { data: currentTruck } = await supabase
              .from('trucks')
              .select('customer_id')
              .eq('id', truckId)
              .maybeSingle();

            if (currentTruck && !currentTruck.customer_id) {
              await supabase
                .from('trucks')
                .update({ 
                  customer_id: customerId, 
                  customer_name: customerName,
                  updated_at: new Date().toISOString() 
                })
                .eq('id', truckId);
              console.log('[save_work_order] Linked truck to customer');
            }
          }
        }

        // Step 3: Create work order record
        const workOrderData = {
          company_id: companyId,
          truck_id: truckId,
          work_order_number: work_order?.work_order_number || null,
          source_file_name: source_file_name || null,
          extracted_vin: vin || null,
          extracted_unit_number: truck?.unit_number || null,
          extracted_year: truck?.year || null,
          extracted_make: truck?.make || null,
          extracted_model: truck?.model || null,
          extracted_odometer: truck?.odometer || null,
          customer_name: customerName || null,
          customer_id_ref: customer?.id_ref || null,
          customer_location: customer?.location || null,
          complaint: work_order?.complaint || null,
          cause: work_order?.cause || null,
          correction: work_order?.correction || null,
          fault_codes: work_order?.fault_codes || [],
          work_order_date: work_order?.date || null,
          status: 'linked',
          truck_auto_created: truckAutoCreated,
        };

        const { data: savedWorkOrder, error: woError } = await supabase
          .from('work_orders')
          .insert(workOrderData)
          .select()
          .single();

        if (woError) {
          console.error('[save_work_order] Error saving work order:', woError);
          throw new Error(`Failed to save work order: ${woError.message}`);
        }

        console.log('[save_work_order] Created work order:', savedWorkOrder.id);

        // Step 4: Create maintenance records for each service category
        const maintenanceRecords = [];
        const categories = service_categories || {};

        for (const [category, isPresent] of Object.entries(categories)) {
          if (isPresent && ['pm', 'brakes', 'tires', 'emissions', 'engine', 'transmission', 'electrical', 'hvac', 'suspension'].includes(category)) {
            maintenanceRecords.push({
              company_id: companyId,
              truck_id: truckId,
              work_order_id: savedWorkOrder.id,
              service_category: category,
              service_type: getCategoryLabel(category),
              description: work_order?.correction || work_order?.complaint || null,
              service_date: work_order?.date || new Date().toISOString().split('T')[0],
              odometer_at_service: truck?.odometer || null,
              engine_hours_at_service: truck?.engine_hours || null,
              parts_used: (parts_listed || []).filter((p: { description?: string }) => p.description),
              labor_hours: labor_hours || null,
              source: 'work_order',
              notes: work_order?.cause || null,
            });
          }
        }

        // If no categories detected but we have data, create a generic "other" record
        if (maintenanceRecords.length === 0 && (work_order?.complaint || work_order?.correction)) {
          maintenanceRecords.push({
            company_id: companyId,
            truck_id: truckId,
            work_order_id: savedWorkOrder.id,
            service_category: 'other',
            service_type: 'General Service',
            description: work_order?.correction || work_order?.complaint || null,
            service_date: work_order?.date || new Date().toISOString().split('T')[0],
            odometer_at_service: truck?.odometer || null,
            engine_hours_at_service: truck?.engine_hours || null,
            parts_used: parts_listed || [],
            labor_hours: labor_hours || null,
            source: 'work_order',
            notes: work_order?.cause || null,
          });
        }

        if (maintenanceRecords.length > 0) {
          const { error: maintError } = await supabase
            .from('maintenance_records')
            .insert(maintenanceRecords);

          if (maintError) {
            console.error('[save_work_order] Error creating maintenance records:', maintError);
          } else {
            console.log(`[save_work_order] Created ${maintenanceRecords.length} maintenance records`);
          }
        }

        // Step 5: Create tasks from line items
        let tasksCreated = 0;
        if (line_items && Array.isArray(line_items) && line_items.length > 0) {
          const tasksToInsert = line_items.map((item: {
            line_number?: string;
            billable?: string;
            reason?: string;
            activity?: string;
            description?: string;
            complaint?: string;
            cause?: string;
            correction?: string;
          }) => {
            // Build task title: "(08) PREVENTIVE (PM 005-50) PERFORM PM TRAILER SERVICE"
            const titleParts = [
              item.reason,
              item.activity,
              item.description
            ].filter(Boolean);
            const taskTitle = titleParts.join(' ') || `Line ${item.line_number || 'Item'}`;

            return {
              work_order_id: savedWorkOrder.id,
              company_id: companyId,
              title: taskTitle,
              description: item.complaint || null, // Also store complaint in description for backwards compatibility
              complaint: item.complaint || null,
              cause: item.cause || null,
              correction: item.correction || null,
              reason: item.reason || null,
              activity: item.activity || null,
              billable: item.billable || null,
              status: 'pending',
              priority: 'medium',
              task_type: 'repair',
            };
          });

          if (tasksToInsert.length > 0) {
            const { error: tasksError } = await supabase
              .from('work_order_tasks')
              .insert(tasksToInsert);

            if (tasksError) {
              console.error('[save_work_order] Error creating tasks:', tasksError);
            } else {
              tasksCreated = tasksToInsert.length;
              console.log(`[save_work_order] Created ${tasksCreated} tasks from line items`);
            }
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            work_order_id: savedWorkOrder.id,
            truck_id: truckId,
            customer_id: customerId,
            truck_auto_created: truckAutoCreated,
            customer_auto_created: customerAutoCreated,
            maintenance_records_created: maintenanceRecords.length,
            tasks_created: tasksCreated,
            message: `Work order saved${truckAutoCreated ? ' with new truck profile' : ''}${customerAutoCreated ? ' and new customer' : ''}${tasksCreated > 0 ? ` with ${tasksCreated} tasks` : ''}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('Work Order Parse error:', error);
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 200);
  }
});

// Helper to get human-readable category labels
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    pm: 'Preventive Maintenance',
    brakes: 'Brake Service',
    tires: 'Tire Service',
    emissions: 'Emissions/Aftertreatment',
    engine: 'Engine Repair',
    transmission: 'Transmission Service',
    electrical: 'Electrical Repair',
    hvac: 'HVAC/Climate Control',
    suspension: 'Suspension Service',
    other: 'General Service',
  };
  return labels[category] || 'General Service';
}
