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

// Generate single embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: [text],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Search documents using vector similarity
async function searchDocuments(
  supabase: any,
  queryEmbedding: number[],
  companyId: string | null,
  matchCount: number = 10,
  matchThreshold: number = 0.5
) {
  const { data, error } = await supabase.rpc('search_documents', {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
    filter_company_id: companyId,
  });

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  return data || [];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const params = await req.json();
    
    const {
      workOrderId,
      companyId,
      vehicleInfo,
      complaint,
      faultCodes,
      conversationHistory = []
    } = params;

    console.log(`[generate-ro-diagnostic] Starting for work order: ${workOrderId}`);
    console.log(`[generate-ro-diagnostic] Vehicle: ${vehicleInfo?.year} ${vehicleInfo?.make} ${vehicleInfo?.model}`);
    console.log(`[generate-ro-diagnostic] Fault codes: ${faultCodes?.join(', ') || 'None'}`);
    console.log(`[generate-ro-diagnostic] Complaint: ${complaint || 'None'}`);

    // Build comprehensive search query from all available context
    const searchParts = [];
    
    if (vehicleInfo) {
      if (vehicleInfo.make) searchParts.push(vehicleInfo.make);
      if (vehicleInfo.model) searchParts.push(vehicleInfo.model);
      if (vehicleInfo.engine) searchParts.push(vehicleInfo.engine);
    }
    
    if (faultCodes && faultCodes.length > 0) {
      searchParts.push(...faultCodes);
    }
    
    if (complaint) {
      searchParts.push(complaint);
    }

    const searchQuery = searchParts.join(' ');
    console.log(`[generate-ro-diagnostic] Search query: ${searchQuery}`);

    // Generate embedding and search for relevant documents
    let searchResults: any[] = [];
    let documentTitles: Map<string, string> = new Map();
    
    if (searchQuery.trim()) {
      const queryEmbedding = await generateEmbedding(searchQuery);
      searchResults = await searchDocuments(supabase, queryEmbedding, companyId, 8, 0.5);
      console.log(`[generate-ro-diagnostic] Found ${searchResults.length} relevant chunks`);

      // Get document titles for citations
      if (searchResults.length > 0) {
        const documentIds = [...new Set(searchResults.map((r: any) => r.document_id))];
        const { data: documents } = await supabase
          .from('knowledge_documents')
          .select('id, title')
          .in('id', documentIds);
        
        if (documents) {
          documents.forEach((d: any) => documentTitles.set(d.id, d.title));
        }
      }
    }

    // Load diagnostic chat history for this work order
    let chatContext = '';
    if (workOrderId) {
      const { data: sessions } = await supabase
        .from('diagnostic_chat_sessions')
        .select('id')
        .eq('work_order_id', workOrderId)
        .limit(1);

      if (sessions && sessions.length > 0) {
        const { data: chatMessages } = await supabase
          .from('diagnostic_chat_messages')
          .select('role, content')
          .eq('session_id', sessions[0].id)
          .order('created_at', { ascending: true })
          .limit(20);

        if (chatMessages && chatMessages.length > 0) {
          chatContext = chatMessages
            .map((m: any) => `${m.role === 'user' ? 'Technician' : 'AI Assistant'}: ${m.content}`)
            .join('\n\n');
          console.log(`[generate-ro-diagnostic] Loaded ${chatMessages.length} chat messages`);
        }
      }
    }

    // Build context from search results
    const ragContext = searchResults.map((r: any, idx: number) => {
      const title = documentTitles.get(r.document_id) || 'Knowledge Base Document';
      return `[Source ${idx + 1}: ${title}]\n${r.content}`;
    }).join('\n\n---\n\n');

    // Build the vehicle context string
    const vehicleDescription = vehicleInfo 
      ? `${vehicleInfo.year || ''} ${vehicleInfo.make || ''} ${vehicleInfo.model || ''}`.trim() || 'Unknown Vehicle'
      : 'Unknown Vehicle';
    
    const vehicleDetails = [];
    if (vehicleInfo?.vin) vehicleDetails.push(`VIN: ${vehicleInfo.vin}`);
    if (vehicleInfo?.engine) vehicleDetails.push(`Engine: ${vehicleInfo.engine}`);
    if (vehicleInfo?.odometer) vehicleDetails.push(`Odometer: ${vehicleInfo.odometer} miles`);

    // Create the structured prompt for diagnostic generation
    const systemPrompt = `You are a professional heavy-duty truck diagnostic specialist creating a formal Repair Order diagnostic report. Generate a comprehensive but concise diagnostic analysis based on the provided information.

VEHICLE INFORMATION:
- Vehicle: ${vehicleDescription}
${vehicleDetails.length > 0 ? vehicleDetails.map(d => `- ${d}`).join('\n') : ''}

CUSTOMER COMPLAINT:
${complaint || 'No specific complaint recorded'}

FAULT CODES:
${faultCodes && faultCodes.length > 0 ? faultCodes.map((c: string) => `- ${c}`).join('\n') : 'No fault codes recorded'}

${chatContext ? `DIAGNOSTIC CONVERSATION HISTORY:\n${chatContext}\n` : ''}

KNOWLEDGE BASE CONTEXT:
${ragContext || 'No specific technical documents found for this vehicle/issue.'}

Based on ALL the above information, generate a professional diagnostic report with these EXACT sections:

1. DIAGNOSTIC_SUMMARY: A 2-4 sentence natural language summary of the diagnosis based on the symptoms, fault codes, and available technical documentation.

2. PROBABLE_ROOT_CAUSE: Identify the most likely root cause(s) of the issue based on the evidence.

3. RECOMMENDED_REPAIR_STEPS: Provide 3-7 numbered repair/diagnostic steps in order of priority. Be specific and actionable.

4. SAFETY_NOTES: Any relevant safety warnings or important notes (if applicable, otherwise state "Standard safety procedures apply").

5. CITATIONS: List the source documents that informed this diagnosis (use the [Source X] references from the context).

Format your response as JSON with these exact keys:
{
  "diagnostic_summary": "string",
  "probable_root_cause": "string", 
  "recommended_repair_steps": ["step 1", "step 2", ...],
  "safety_notes": "string",
  "citations": [{"source_index": 1, "title": "Document Title", "relevance": "Brief note on how this source was used"}]
}

IMPORTANT:
- If no knowledge base documents are found, still provide your best professional assessment but note the limitations.
- Be concise but thorough.
- Focus on actionable diagnostic and repair guidance.
- Always prioritize safety.`;

    // Call OpenAI to generate the diagnostic content
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the diagnostic report in JSON format.' }
        ],
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    });

    if (!chatResponse.ok) {
      const errData = await chatResponse.json();
      console.error('[generate-ro-diagnostic] OpenAI error:', errData);
      throw new Error(errData.error?.message || 'Failed to generate diagnostic');
    }

    const chatData = await chatResponse.json();
    const responseText = chatData.choices?.[0]?.message?.content;
    
    console.log(`[generate-ro-diagnostic] Raw response: ${responseText?.substring(0, 200)}...`);

    // Parse the JSON response
    let diagnosticResult;
    try {
      diagnosticResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[generate-ro-diagnostic] JSON parse error:', parseError);
      // Fallback to a basic structure if parsing fails
      diagnosticResult = {
        diagnostic_summary: responseText || 'Unable to generate diagnostic summary.',
        probable_root_cause: 'Unable to determine root cause.',
        recommended_repair_steps: ['Perform visual inspection', 'Check fault codes', 'Consult technical documentation'],
        safety_notes: 'Standard safety procedures apply.',
        citations: []
      };
    }

    // Enrich citations with actual document titles
    const enrichedCitations = (diagnosticResult.citations || []).map((citation: any) => {
      if (citation.source_index && searchResults[citation.source_index - 1]) {
        const result = searchResults[citation.source_index - 1];
        return {
          ...citation,
          document_id: result.document_id,
          title: documentTitles.get(result.document_id) || citation.title || 'Knowledge Base Document',
          similarity: result.similarity
        };
      }
      return citation;
    });

    // Add any sources that weren't explicitly cited but were highly relevant
    const citedIndices = new Set(enrichedCitations.map((c: any) => c.source_index));
    searchResults.forEach((result, idx) => {
      if (result.similarity >= 0.7 && !citedIndices.has(idx + 1)) {
        enrichedCitations.push({
          source_index: idx + 1,
          document_id: result.document_id,
          title: documentTitles.get(result.document_id) || 'Knowledge Base Document',
          relevance: 'Highly relevant technical document',
          similarity: result.similarity
        });
      }
    });

    const finalResult = {
      success: true,
      diagnostic_summary: diagnosticResult.diagnostic_summary,
      probable_root_cause: diagnosticResult.probable_root_cause,
      recommended_repair_steps: diagnosticResult.recommended_repair_steps || [],
      safety_notes: diagnosticResult.safety_notes,
      citations: enrichedCitations,
      generated_at: new Date().toISOString(),
      work_order_id: workOrderId,
      sources_searched: searchResults.length,
      chat_history_used: chatContext.length > 0
    };

    console.log(`[generate-ro-diagnostic] Successfully generated diagnostic with ${enrichedCitations.length} citations`);

    return new Response(
      JSON.stringify(finalResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-ro-diagnostic] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        // Provide fallback content so PDF can still be generated
        diagnostic_summary: 'Diagnostic analysis could not be generated automatically. Manual review required.',
        probable_root_cause: 'Unable to determine - manual inspection required.',
        recommended_repair_steps: ['Perform comprehensive vehicle inspection', 'Review fault codes with diagnostic tool', 'Consult technical service bulletins'],
        safety_notes: 'Standard safety procedures apply.',
        citations: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
