/**
 * Phase 1: Supabase Edge Function for legal Q&A
 *
 * Endpoint: /ask
 * Method: POST
 *
 * Request body:
 * {
 *   "query": "what are my rights during a police stop?",
 *   "language": "en|bn|auto",
 *   "stream": true
 * }
 *
 * Response (streaming):
 * {
 *   "answer": "Based on Article 33 of the Constitution...",
 *   "citations": [
 *     {
 *       "section_label": "Article 33",
 *       "act_name": "Constitution",
 *       "source_url": "...",
 *       "excerpt": "..."
 *     }
 *   ],
 *   "groundedness": 0.95,
 *   "model": "claude-3-5-sonnet-20241022"
 * }
 *
 * NOT IMPLEMENTED YET — This is the specification and example implementation.
 * Deployment:
 *   supabase functions deploy ask --project-id=xxx
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AskRequest {
  query: string;
  language: "en" | "bn" | "auto";
  stream: boolean;
}

interface Chunk {
  id: string;
  section_label: string;
  section_text_en: string;
  section_text_bn?: string;
  act_name_en: string;
  act_name_bn?: string;
  source_url: string;
  metadata: Record<string, unknown>;
}

interface Citation {
  section_label: string;
  act_name: string;
  source_url: string;
  excerpt: string;
}

/**
 * Step 1: Query normalization for Bangla/Banglish
 * (Phase 2 feature; for now, pass through)
 */
function normalizeQuery(query: string, lang: string): string {
  // TODO: Use Haiku to rewrite Banglish → standard Bangla
  return query;
}

/**
 * Step 2: Retrieve relevant chunks from Supabase
 */
async function retrieveChunks(
  query: string,
  limit: number = 6
): Promise<Chunk[]> {
  // TODO: Implement vector search via Supabase client
  // For now, mock return:
  return [];
}

/**
 * Step 3: Format chunks for Claude with document_blocks
 */
function formatSourceDocuments(chunks: Chunk[]): string {
  let formatted = "## Source Documents\n\n";
  for (const chunk of chunks) {
    formatted += `### ${chunk.section_label} (${chunk.act_name_en})\n`;
    formatted += `${chunk.section_text_en}\n`;
    formatted += `[Source](${chunk.source_url})\n\n`;
  }
  return formatted;
}

/**
 * Step 4: System prompt with guardrails
 */
const SYSTEM_PROMPT = `You are a legal information assistant for Bangladesh. Your role is to answer questions about constitutional rights, criminal procedures, and legal processes in Bangladesh using only the provided source documents.

CRITICAL CONSTRAINTS:
1. GROUNDED ONLY: Every claim must be directly cited from the source documents. If asked something not in the documents, say "I don't have information about that in the current knowledge base."
2. INFORMATION NOT ADVICE: You provide information about laws, not legal advice. Always end with: "This is legal information, not advice. Consult a lawyer for your specific situation."
3. REFUSAL: Refuse requests for advice on how to evade laws, avoid prosecution, or engage in illegal activity.
4. EMERGENCY: For immediate dangers or rights violations, direct users to: National Human Rights Commission (1819), Emergency (999), or local police (calling 999).
5. BILINGUAL: Provide answers in both English and Bangla when relevant.
6. CITATIONS: Use inline citations like [Article 27, Constitution].

Your tone is professional, clear, and accessible to people without legal training.`;

/**
 * Step 5: Stream response from Claude with citations
 */
async function* streamAnswer(
  query: string,
  chunks: Chunk[],
  language: string
) {
  const sourceText = formatSourceDocuments(chunks);

  const stream = await client.messages.stream({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `${sourceText}\n\nQuery (${language}): ${query}`,
      },
    ],
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      yield {
        type: "text_delta",
        text: event.delta.text,
      };
    }
  }

  // Post-generation: extract citations from fullText
  // (Phase 2: Use Claude to parse citations; for now, regex)
  const citations = extractCitations(fullText, chunks);
  yield {
    type: "citations",
    citations: citations,
  };

  yield {
    type: "done",
    groundedness: computeGroundedness(fullText, chunks),
  };
}

/**
 * Extract citations from generated text
 */
function extractCitations(text: string, chunks: Chunk[]): Citation[] {
  const citations: Citation[] = [];
  // Regex pattern: [Article 27] or [Section 33(1)]
  const pattern = /\[(Article|Section|Clause|Act)\s+([^\]]+)\]/g;
  const matches = text.matchAll(pattern);

  for (const match of matches) {
    const label = match[0]; // e.g., "[Article 27]"
    const chunk = chunks.find((c) => c.section_label.includes(match[2]));
    if (chunk) {
      citations.push({
        section_label: chunk.section_label,
        act_name: chunk.act_name_en,
        source_url: chunk.source_url,
        excerpt: chunk.section_text_en.substring(0, 200) + "...",
      });
    }
  }
  return citations;
}

/**
 * Compute groundedness score (Phase 2)
 */
function computeGroundedness(answer: string, _chunks: Chunk[]): number {
  // TODO: Use Claude to verify each claim against sources
  return 0.95; // Stub
}

/**
 * Main handler
 */
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await req.json()) as AskRequest;
  const { query, language = "auto", stream = true } = body;

  if (!query) {
    return new Response(JSON.stringify({ error: "query required" }), {
      status: 400,
    });
  }

  const normalizedQuery = normalizeQuery(query, language);
  const chunks = await retrieveChunks(normalizedQuery);

  if (stream) {
    // Streaming response
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamAnswer(
            normalizedQuery,
            chunks,
            language
          )) {
            controller.enqueue(
              encoder.encode("data: " + JSON.stringify(event) + "\n\n")
            );
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } else {
    // Non-streaming response
    const events = [];
    for await (const event of streamAnswer(
      normalizedQuery,
      chunks,
      language
    )) {
      events.push(event);
    }

    // Combine events into a single response
    let answer = "";
    let citations: Citation[] = [];

    for (const event of events) {
      if (event.type === "text_delta") {
        answer += event.text;
      } else if (event.type === "citations") {
        citations = event.citations;
      }
    }

    return new Response(
      JSON.stringify({
        answer,
        citations,
        groundedness: 0.95,
        model: "claude-3-5-sonnet-20241022",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
