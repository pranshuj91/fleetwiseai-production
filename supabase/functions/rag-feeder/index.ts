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

// Chunk text into smaller pieces for embedding
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }
  
  return chunks;
}

// Estimate token count
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Generate embeddings for a batch of texts (up to 2048 inputs)
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: texts,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI embedding error:', error);
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data.map((item: any) => item.embedding);
}

// Generate single embedding
async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddingsBatch([text]);
  return embeddings[0];
}

// Process chunks in background with batching
async function processChunksInBackground(
  supabase: any, 
  documentId: string, 
  companyId: string, 
  chunks: string[],
  tags: string[] = []
) {
  const BATCH_SIZE = 50; // Process 50 chunks at a time
  let successCount = 0;
  
  try {
    console.log(`Background: Processing ${chunks.length} chunks for document ${documentId}`);
    
    for (let batchStart = 0; batchStart < chunks.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, chunks.length);
      const batchChunks = chunks.slice(batchStart, batchEnd);
      
      console.log(`Background: Processing batch ${batchStart / BATCH_SIZE + 1}, chunks ${batchStart + 1}-${batchEnd}/${chunks.length}`);
      
      try {
        // Generate embeddings for entire batch at once
        const embeddings = await generateEmbeddingsBatch(batchChunks);
        
        // Prepare inserts
        const chunkInserts = batchChunks.map((chunk, idx) => ({
          document_id: documentId,
          company_id: companyId,
          chunk_index: batchStart + idx,
          content: chunk,
          embedding: embeddings[idx],
          token_count: estimateTokens(chunk),
          tags: tags, // Include tags from document
        }));
        
        // Insert batch
        const { error: insertError } = await supabase
          .from('document_chunks')
          .insert(chunkInserts);
        
        if (insertError) {
          console.error(`Background: Batch insert error:`, insertError);
        } else {
          successCount += batchChunks.length;
          console.log(`Background: Inserted ${successCount}/${chunks.length} chunks`);
        }
        
        // Update progress
        await supabase
          .from('knowledge_documents')
          .update({ chunk_count: successCount })
          .eq('id', documentId);
          
      } catch (batchError) {
        console.error(`Background: Batch ${batchStart / BATCH_SIZE + 1} failed:`, batchError);
      }
    }
    
    // Mark as complete
    await supabase
      .from('knowledge_documents')
      .update({
        processing_status: 'completed',
        chunk_count: successCount,
        error_message: successCount < chunks.length 
          ? `Processed ${successCount}/${chunks.length} chunks` 
          : null,
      })
      .eq('id', documentId);
    
    console.log(`Background: Document ${documentId} completed with ${successCount} chunks`);
    
  } catch (error) {
    console.error(`Background: Fatal error processing document ${documentId}:`, error);
    await supabase
      .from('knowledge_documents')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId);
  }
}

// Search documents using vector similarity
async function searchDocuments(
  supabase: any,
  queryEmbedding: number[],
  companyId: string | null,
  matchCount: number = 10,
  matchThreshold: number = 0.7
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

  return data;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, ...params } = await req.json();

    console.log(`RAG Feeder action: ${action}`);

    switch (action) {
      case 'process_text': {
        // Handle pre-extracted text from client - uses background processing
        const { title, description, documentType, content, fileName, fileSize, uploadedBy, companyId, tags = [], filePath = null } = params;
        
        console.log(`[process_text] Received document: "${title}"`);
        console.log(`[process_text] Content length: ${content?.length || 0} characters`);
        console.log(`[process_text] File: ${fileName}, Size: ${fileSize} bytes`);
        console.log(`[process_text] User: ${uploadedBy}, Company: ${companyId}`);
        console.log(`[process_text] Tags: ${tags.join(', ') || 'none'}`);
        console.log(`[process_text] File path: ${filePath || 'none'}`);

        if (!content) {
          console.error('[process_text] No content provided');
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'No content provided - extraction may have failed'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        if (content.length < 50) {
          console.error(`[process_text] Content too short: ${content.length} characters`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Content too short (${content.length} characters). PDF may be scanned or image-based.`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Insert document immediately
        const { data: doc, error: insertError } = await supabase
          .from('knowledge_documents')
          .insert({
            title,
            description,
            document_type: documentType,
            content,
            file_name: fileName,
            file_size: fileSize,
            uploaded_by: uploadedBy,
            company_id: companyId,
            processing_status: 'processing',
            tags: tags,
            file_path: filePath,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }

        console.log(`Document inserted with ID: ${doc.id}`);

        // Chunk the content
        const chunks = chunkText(content);
        console.log(`Created ${chunks.length} chunks - starting background processing`);

        if (chunks.length === 0) {
          await supabase
            .from('knowledge_documents')
            .update({
              processing_status: 'completed',
              chunk_count: 0,
              error_message: 'No substantial text content found.',
            })
            .eq('id', doc.id);

          return new Response(
            JSON.stringify({ 
              success: true, 
              warning: 'Document uploaded but no chunks created.',
              documentId: doc.id,
              contentLength: content.length,
              chunkCount: 0
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Start background processing using EdgeRuntime.waitUntil
        // @ts-ignore - EdgeRuntime is available in Supabase edge functions
        EdgeRuntime.waitUntil(processChunksInBackground(supabase, doc.id, companyId, chunks, tags));

        // Return immediately
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Document uploaded - processing in background',
            documentId: doc.id,
            contentLength: content.length,
            chunkCount: chunks.length,
            status: 'processing'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_document': {
        const { documentId } = params;
        
        // Update status to processing
        await supabase
          .from('knowledge_documents')
          .update({ processing_status: 'processing' })
          .eq('id', documentId);

        // Get document
        const { data: doc, error: docError } = await supabase
          .from('knowledge_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError || !doc) {
          throw new Error('Document not found');
        }

        console.log(`Processing document: ${doc.title}`);

        // Chunk the content
        const chunks = chunkText(doc.content || '');
        console.log(`Created ${chunks.length} chunks - starting background processing`);

        // Start background processing
        // @ts-ignore
        EdgeRuntime.waitUntil(processChunksInBackground(supabase, documentId, doc.company_id, chunks, doc.tags || []));

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Document processing started',
            chunkCount: chunks.length,
            status: 'processing'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'search': {
        const { query, companyId, matchCount = 10, matchThreshold = 0.7 } = params;
        
        console.log(`Searching for: ${query}`);
        
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);
        
        // Search documents
        const results = await searchDocuments(
          supabase,
          queryEmbedding,
          companyId,
          matchCount,
          matchThreshold
        );
        
        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'chat': {
        // Support both 'query' and 'userMessage' for backwards compatibility
        const { query, userMessage, companyId, conversationHistory = [], vehicleContext = '' } = params;
        const actualQuery = query || userMessage;
        
        console.log(`Chat query: ${actualQuery}`);
        console.log(`Company ID: ${companyId}`);
        
        // Validate query is not empty
        if (!actualQuery || typeof actualQuery !== 'string' || actualQuery.trim().length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Query is required for chat action'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(actualQuery);
        
        // Search for relevant context
        const searchResults = await searchDocuments(
          supabase,
          queryEmbedding,
          companyId,
          5,
          0.5
        );
        
        console.log(`Found ${searchResults?.length || 0} relevant chunks`);
        
        // Get document titles for sources
        const documentIds = [...new Set(searchResults.map((r: any) => r.document_id))];
        const { data: documents } = await supabase
          .from('knowledge_documents')
          .select('id, title')
          .in('id', documentIds);
        
        const docTitleMap = new Map((documents || []).map((d: any) => [d.id, d.title]));
        
        // Build context from search results with source info
        const contextParts = searchResults.map((r: any, idx: number) => {
          const title = docTitleMap.get(r.document_id) || 'Unknown Document';
          return `[Source ${idx + 1}: ${title}]\n${r.content}`;
        });
        const context = contextParts.join('\n\n---\n\n');
        
        // Build messages including conversation history
        const systemContent = vehicleContext 
          ? `You are a knowledgeable assistant for a truck repair shop. You are helping summarize and analyze truck service history.

Vehicle Context:
${vehicleContext}

${context ? `Additional context from knowledge base:\n${context}` : ''}

IMPORTANT INSTRUCTIONS:
- Be concise but thorough
- Focus on key patterns, recurring issues, and overall vehicle health
- If summarizing history, highlight important repairs and maintenance trends`
          : `You are a knowledgeable assistant for a truck repair shop. Answer questions based on the provided context from service manuals and technical documents. 

IMPORTANT INSTRUCTIONS:
- Always cite your sources by referencing [Source X] when using information from the context
- If the answer comes from multiple sources, cite all relevant sources
- If the answer is not in the context, clearly say you don't have that information in the knowledge base
- Be concise but thorough

Context from knowledge base:
${context || 'No relevant documents found in the knowledge base.'}`;

        const messages: any[] = [
          {
            role: 'system',
            content: systemContent
          }
        ];
        
        // Add conversation history for context
        conversationHistory.slice(-6).forEach((msg: any) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({ role: msg.role, content: msg.content });
          }
        });
        
        // Add current query - use actualQuery which handles both 'query' and 'userMessage' params
        messages.push({ role: 'user', content: actualQuery });
        
        // Generate response using GPT
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 1000,
            temperature: 0.7,
          }),
        });
        
        if (!chatResponse.ok) {
          const errData = await chatResponse.json();
          console.error('OpenAI Chat error:', errData);
          throw new Error(errData.error?.message || 'Failed to generate response');
        }
        
        const chatData = await chatResponse.json();
        const answer = chatData.choices?.[0]?.message?.content || 'Unable to generate response.';
        
        // Group sources by document with all chunk details
        const sourceMap = new Map<string, any>();
        searchResults.forEach((r: any, idx: number) => {
          const existing = sourceMap.get(r.document_id);
          const chunkDetail = {
            chunkId: r.id,
            content: r.content,
            similarity: r.similarity,
            sourceIndex: idx + 1, // [Source X] reference
          };
          
          if (!existing) {
            sourceMap.set(r.document_id, {
              documentId: r.document_id,
              title: docTitleMap.get(r.document_id) || 'Unknown Document',
              similarity: r.similarity, // highest similarity
              chunks: [chunkDetail],
            });
          } else {
            existing.chunks.push(chunkDetail);
            if (r.similarity > existing.similarity) {
              existing.similarity = r.similarity;
            }
          }
        });
        const sources = Array.from(sourceMap.values()).map(s => ({
          ...s,
          chunkCount: s.chunks.length,
        }));
        
        console.log(`Chat response generated with ${sources.length} sources`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            response: answer,  // Frontend expects 'response' not 'answer'
            sources
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_vision': {
        // Handle photo-based PDFs using GPT-4 Vision
        const { title, description, documentType, images, fileName, fileSize, uploadedBy, companyId, tags = [], filePath = null } = params;
        
        console.log(`[process_vision] Processing ${images?.length || 0} images for: "${title}"`);
        
        if (!images || images.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No images provided' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Use GPT-4 Vision to extract text and descriptions from images
        const extractedParts: string[] = [];
        
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          console.log(`[process_vision] Processing page ${image.pageNumber || i + 1}`);
          
          try {
            const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                    content: `You are an expert at extracting text and describing visual content from technical documents, manuals, and repair guides. 
                    
For each image:
1. Extract ALL readable text, preserving structure (headers, lists, tables)
2. Describe any diagrams, photos, or illustrations in detail
3. Note any part numbers, measurements, specifications, or procedures shown
4. If there are warning labels or safety notices, transcribe them exactly

Format your response as structured text that can be searched later.`
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `Extract all text and describe all visual content from this page (page ${image.pageNumber || i + 1}). Include any diagrams, photos, part numbers, and procedures shown.`
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:image/jpeg;base64,${image.base64}`,
                          detail: 'high'
                        }
                      }
                    ]
                  }
                ],
                max_tokens: 2000,
                temperature: 0.2,
              }),
            });

            if (!visionResponse.ok) {
              const errData = await visionResponse.json();
              console.error(`[process_vision] Vision API error for page ${i + 1}:`, errData);
              continue;
            }

            const visionData = await visionResponse.json();
            const pageContent = visionData.choices?.[0]?.message?.content || '';
            
            if (pageContent) {
              extractedParts.push(`--- Page ${image.pageNumber || i + 1} ---\n${pageContent}`);
              console.log(`[process_vision] Page ${i + 1}: ${pageContent.length} characters extracted`);
            }
          } catch (pageError) {
            console.error(`[process_vision] Error processing page ${i + 1}:`, pageError);
          }
        }

        const fullContent = extractedParts.join('\n\n');
        console.log(`[process_vision] Total extracted: ${fullContent.length} characters from ${extractedParts.length} pages`);

        if (fullContent.length < 50) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Could not extract meaningful content from images' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        // Insert document
        const { data: doc, error: insertError } = await supabase
          .from('knowledge_documents')
          .insert({
            title,
            description: description || 'Extracted via Vision AI from scanned document',
            document_type: documentType || 'manual',
            content: fullContent,
            file_name: fileName,
            file_size: fileSize,
            uploaded_by: uploadedBy,
            company_id: companyId,
            processing_status: 'processing',
            tags: tags,
            file_path: filePath,
          })
          .select()
          .single();

        if (insertError) {
          console.error('[process_vision] Insert error:', insertError);
          throw insertError;
        }

        console.log(`[process_vision] Document inserted with ID: ${doc.id}`);

        // Chunk and process embeddings
        const chunks = chunkText(fullContent);
        console.log(`[process_vision] Created ${chunks.length} chunks - starting background processing`);

        // @ts-ignore
        EdgeRuntime.waitUntil(processChunksInBackground(supabase, doc.id, companyId, chunks, tags));

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Vision document uploaded - processing in background',
            documentId: doc.id,
            contentLength: fullContent.length,
            chunkCount: chunks.length,
            pagesProcessed: extractedParts.length,
            status: 'processing'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_document': {
        const { documentId } = params;
        
        console.log(`Deleting document: ${documentId}`);
        
        // Delete chunks first
        await supabase
          .from('document_chunks')
          .delete()
          .eq('document_id', documentId);
        
        // Delete document
        const { error } = await supabase
          .from('knowledge_documents')
          .delete()
          .eq('id', documentId);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, message: 'Document deleted' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }
  } catch (error) {
    console.error('RAG Feeder error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Handle shutdown gracefully
addEventListener('beforeunload', (ev: any) => {
  console.log('Function shutdown:', ev.detail?.reason);
});
