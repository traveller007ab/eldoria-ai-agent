import { supabase } from './supabaseClient';
import { Memory } from '../types';

/**
 * Creates a vector embedding for the given content and stores it as a memory.
 * This function relies on a Supabase Edge Function named 'embed' to securely
 * generate the embedding using the Gemini API.
 * @param content The text content to commit to memory.
 */
export async function createMemory(content: string): Promise<void> {
  try {
    // Step 1: Call the 'embed' edge function to get the vector embedding.
    // Specify the taskType for storing a document.
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('embed', {
      body: { text: content, taskType: 'RETRIEVAL_DOCUMENT' },
    });

    if (embeddingError) throw embeddingError;
    if (!embeddingData.embedding) throw new Error("Embedding not found in function response.");

    // Step 2: Insert the content and its embedding into the 'memories' table.
    const { error: insertError } = await supabase
      .from('memories')
      .insert({ content, embedding: embeddingData.embedding });
    
    if (insertError) throw insertError;

  } catch (error) {
    console.error('Error creating memory:', error instanceof Error ? error.message : error);
    // In a production app, you might want to handle this more gracefully.
  }
}

/**
 * Searches for memories that are semantically similar to the given query text.
 * It first generates an embedding for the query and then uses a database function
 * to find the most relevant memories.
 * @param queryText The text to search for relevant memories.
 * @param limit The maximum number of memories to return.
 * @returns A promise that resolves to an array of relevant memories.
 */
export async function searchMemories(queryText: string, limit: number = 3): Promise<Memory[]> {
  try {
    // Step 1: Get the embedding for the query text.
    // Specify the taskType for a retrieval query.
    const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('embed', {
      body: { text: queryText, taskType: 'RETRIEVAL_QUERY' },
    });

    if (embeddingError) throw embeddingError;
    if (!embeddingData.embedding) throw new Error("Embedding not found in function response.");
    
    // Step 2: Call the RPC function to find matching memories.
    const { data: memories, error: matchError } = await supabase.rpc('match_memories', {
      query_embedding: embeddingData.embedding,
      match_threshold: 0.75, // Adjust this threshold as needed
      match_count: limit,
    });

    if (matchError) throw matchError;

    return (memories || []) as Memory[];

  } catch (error) {
    console.error('Error searching memories:', error instanceof Error ? error.message : error);
    return [];
  }
}