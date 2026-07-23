# Laravel AI SDK (`laravel/ai`)

## What

Laravel 13's first-party PHP API for building AI-native features. It provides a consistent interface
across multiple AI providers — OpenAI, Anthropic, Gemini, Azure, Groq, xAI, DeepSeek, Mistral,
Ollama, Cohere, ElevenLabs, Jina, and VoyageAI.

**Agents** are the fundamental building block — dedicated PHP classes that wrap provider calls with tools, middleware, conversation memory, structured output, streaming, and queueing.

Key capabilities: text generation, image generation, TTS, STT, embeddings, reranking, vector search (pgvector), file/vector store management, failover across providers.

Provider support matrix:

| Feature | Providers |
|---|---|
| Text | OpenAI, Anthropic, Gemini, Azure, Groq, xAI, DeepSeek, Mistral, Ollama |
| Images | OpenAI, Gemini, xAI |
| TTS | OpenAI, ElevenLabs |
| STT | OpenAI, ElevenLabs, Mistral |
| Embeddings | OpenAI, Gemini, Azure, Cohere, Mistral, Jina, VoyageAI |
| Reranking | Cohere, Jina |
| Files | OpenAI, Anthropic, Gemini |

Key dependencies: Agent calls should be wrapped in Actions (see `service-layer.md`). Agent responses should go through API Resources (see `api-resources.md`). Queued agents use Horizon (see `queues-jobs.md`). Conversation tables require migrations (see `database.md`). Agent testing uses the same Pest patterns as the rest of the stack (see `testing.md`).

Related packages: **Boost** (`boost.md`) helps AI agents write better Laravel code during development. **Laravel MCP** (`mcp.md`) exposes your app to external AI clients. The AI SDK adds AI features your *users* interact with.

Key rules:
- Create dedicated Agent classes — don't inline provider calls
- Use PHP attributes for agent configuration — `#[Provider]`, `#[Model]`, `#[MaxSteps]`, `#[Temperature]`
- Use `RemembersConversations` trait for persistent chat — it handles DB storage automatically
- Always fake agents in tests — `SalesCoach::fake()`, `Image::fake()`, etc.
- Use failover arrays for resilience — `provider: [Lab::OpenAI, Lab::Anthropic]`
- Treat vector search as an explicit database architecture choice: Laravel's native vector columns
  and queries require PostgreSQL with `pgvector`, not this skill's default MySQL stack

## How

### Installation

```bash
composer require laravel/ai
php artisan vendor:publish --provider="Laravel\Ai\AiServiceProvider"
php artisan migrate  # Creates agent_conversations and agent_conversation_messages tables
```

Set API keys in `.env`:

```env
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
# Also supported: COHERE_API_KEY, ELEVENLABS_API_KEY, MISTRAL_API_KEY,
# OLLAMA_API_KEY, JINA_API_KEY, VOYAGEAI_API_KEY, XAI_API_KEY
```

Custom base URLs supported for proxies (LiteLLM, Azure OpenAI Gateway, etc.).

### Agent — create and configure

```bash
php artisan make:agent SalesCoach
php artisan make:agent ProductAnalyzer --structured  # structured output
```

```php
<?php
namespace App\Ai\Agents;

use App\Ai\Middleware\LogPrompts;
use App\Ai\Tools\{GetCustomerHistory, SearchKnowledgeBase};
use Laravel\Ai\Contracts\{Agent, Conversational, HasMiddleware, HasTools};
use Laravel\Ai\Concerns\RemembersConversations;
use Laravel\Ai\Promptable;
use Laravel\Ai\Attributes\{Provider, Model, MaxSteps, MaxTokens, Temperature, Timeout};
use Laravel\Ai\Enums\Lab;

#[Provider(Lab::Anthropic)]
#[Model('claude-haiku-4-5-20251001')]
#[MaxSteps(10)]
#[MaxTokens(4096)]
#[Temperature(0.7)]
#[Timeout(120)]
final class SalesCoach implements Agent, Conversational, HasTools, HasMiddleware
{
    use Promptable, RemembersConversations;

    public function instructions(): string
    {
        return 'You are a sales coach who helps reps improve their pitch. '
            . 'Use the knowledge base and customer history to personalize advice.';
    }

    public function tools(): array
    {
        return [
            new SearchKnowledgeBase,
            new GetCustomerHistory,
        ];
    }

    public function middleware(): array
    {
        return [
            new LogPrompts,
        ];
    }
}
```

Shorthand attributes: `#[UseCheapestModel]` / `#[UseSmartestModel]` — auto-select model tier.

### Prompting

```php
// Basic
$response = (new SalesCoach)->prompt('Analyze this deal');

// Override provider/model at call site
$response = (new SalesCoach)->prompt(
    'Analyze this deal',
    provider: Lab::Anthropic,
    model: 'claude-haiku-4-5-20251001',
    timeout: 120,
);

// Anonymous agent — quick ad-hoc usage
$response = agent(
    instructions: 'You summarize text concisely.',
    tools: [],
)->prompt('Summarize: ...');
```

### Streaming

Returns an SSE-compatible `StreamableAgentResponse`. Use from a controller route that returns the stream. A `then` callback receives the completed `StreamedAgentResponse`:

```php
use Laravel\Ai\Responses\StreamableAgentResponse;

// In a controller — returns SSE stream to the client
public function __invoke(AnalyzeRequest $request): StreamableAgentResponse
{
    return (new SalesCoach)->stream($request->validated('prompt'));
}

// Vercel AI SDK protocol (for Next.js / React frontends using useChat/useCompletion)
public function __invoke(AnalyzeRequest $request): StreamableAgentResponse
{
    return (new SalesCoach)->stream($request->validated('prompt'))->usingVercelDataProtocol();
}
```

### Broadcasting

Push agent events to WebSocket channels for real-time UI updates (requires Reverb — see `queues-jobs.md`):

```php
// In a controller — broadcast each streamed event to a private channel
public function __invoke(AnalyzeRequest $request): void
{
    $channel = new PrivateChannel("analysis.{$request->user()->id}");

    foreach ((new SalesCoach)->stream($request->validated('prompt')) as $event) {
        $event->broadcast($channel);
    }
}

// Or broadcast via queue worker to avoid blocking the request
(new SalesCoach)->broadcastOnQueue(
    $request->validated('prompt'),
    new PrivateChannel("analysis.{$request->user()->id}"),
);
```

### Queueing

Dispatch agent work to a background job (processed by Horizon — see `queues-jobs.md`):

```php
(new SalesCoach)->queue('Analyze this quarterly deal pipeline')
    ->then(fn ($response) => Notification::send($user, new AnalysisReady($response)))
    ->catch(fn ($e) => Log::error('Agent failed', ['error' => $e->getMessage()]));
```

### Conversation memory

Uses `RemembersConversations` trait. Requires the published migration (creates `agent_conversations` and `agent_conversation_messages` tables).

```php
// Start new conversation for a user
$response = (new SalesCoach)->forUser($user)->prompt('Hello!');

// Continue existing conversation
$response = (new SalesCoach)->continue($conversationId, as: $user)->prompt('Tell me more');
```

### Structured output

Create with `php artisan make:agent ProductAnalyzer --structured`. The agent returns typed JSON matching `schema()` — the provider enforces the structure:

```php
<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\{Agent, HasStructuredOutput};
use Laravel\Ai\Promptable;
use Laravel\Ai\Attributes\{Provider, Model};
use Laravel\Ai\Enums\Lab;

#[Provider(Lab::OpenAI)]
#[Model('gpt-4o')]
final class ProductAnalyzer implements Agent, HasStructuredOutput
{
    use Promptable;

    public function instructions(): string
    {
        return 'Analyze product reviews and extract structured sentiment data.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'sentiment' => $schema->string()
                ->enum(['positive', 'negative', 'neutral'])->required(),
            'score' => $schema->number()->min(0)->max(1)->required(),
            'summary' => $schema->string()->required(),
            'key_themes' => $schema->array()->items($schema->string())->required(),
        ];
    }
}
```

Use from an Action (see `service-layer.md` for Action patterns):

```php
$analysis = (new ProductAnalyzer)->prompt("Analyze these reviews: {$reviewText}");
$score = $analysis['score'];
$sentiment = $analysis['sentiment'];
```

### Provider-specific options

Implement `HasProviderOptions` for provider-specific parameters like OpenAI reasoning effort or Anthropic extended thinking budget:

```php
use Laravel\Ai\Contracts\HasProviderOptions;
use Laravel\Ai\Enums\Lab;

final class DeepAnalyzer implements Agent, HasProviderOptions
{
    use Promptable;

    public function providerOptions(): array
    {
        return [
            Lab::Anthropic->value => ['thinking' => ['budget_tokens' => 10000]],
            Lab::OpenAI->value => ['reasoning_effort' => 'high'],
        ];
    }

    // ...
}
```

### Attachments

```php
use Laravel\Ai\Files;

// Images — from storage, path, URL, or upload
$response = (new SalesCoach)->prompt('Describe this', attachments: [
    Files\Image::fromStorage('photos/product.jpg'),
    Files\Image::fromPath('/tmp/product.jpg'),
    $request->file('photo'),
]);

// Documents
$response = (new SalesCoach)->prompt('Summarize this PDF', attachments: [
    Files\Document::fromStorage('docs/report.pdf'),
    Files\Document::fromPath('/tmp/contract.pdf'),
]);
```

### Tools

```bash
php artisan make:tool RandomNumberGenerator
```

```php
<?php
namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

final class RandomNumberGenerator implements Tool
{
    public function description(): Stringable|string
    {
        return 'Generate a random number between min and max.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'min' => $schema->integer()->min(0)->required(),
            'max' => $schema->integer()->required(),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        return (string) random_int($request['min'], $request['max']);
    }
}
```

**Built-in tools:**
- `SimilaritySearch` — RAG via vector embeddings with Eloquent models
- `WebSearch` — Anthropic, OpenAI, Gemini
- `WebFetch` — Anthropic, Gemini
- `FileSearch` — OpenAI, Gemini

### Middleware

Pipeline pattern — intercept and modify prompts before they reach the provider, or inspect responses after. Same concept as HTTP middleware.

```bash
php artisan make:agent-middleware LogPrompts
```

```php
<?php

namespace App\Ai\Middleware;

use Closure;
use Illuminate\Support\Facades\Log;
use Laravel\Ai\Prompts\AgentPrompt;

final class LogPrompts
{
    public function handle(AgentPrompt $prompt, Closure $next): mixed
    {
        Log::info('Agent prompted', ['prompt' => $prompt->prompt]);

        return $next($prompt)->then(fn ($response) => Log::info(
            'Agent responded',
            ['text' => $response->text],
        ));
    }
}
```

Assign in the agent's `middleware()` method (see agent example above). Middleware executes in order — put logging first, content filtering second, etc.

### Image generation

```php
use Laravel\Ai\Files;
use Laravel\Ai\Image;

$image = Image::of('A donut on a plate')
    ->quality('high')
    ->landscape()
    ->timeout(120)
    ->generate();

$path = $image->store();          // store to default disk
$path = $image->storeAs('images/donut.png');
$image->storePublicly();

// With reference images
$image = Image::of('Make it blue')->attachments([
    Files\Image::fromStorage('original.png'),
])->generate();

// Queued
$image = Image::of('A donut')->queue()
    ->then(fn ($img) => $img->store());
```

### Audio (TTS)

```php
use Laravel\Ai\Audio;

$audio = Audio::of('Hello, welcome to our app')
    ->female()
    ->instructions('Said like a friendly receptionist')
    ->generate();

$audio->store();
```

### Transcription (STT)

```php
use Laravel\Ai\Transcription;

$transcript = Transcription::fromStorage('recordings/meeting.mp3')
    ->diarize()   // speaker identification
    ->generate();
```

### Embeddings and vector search

```php
use Illuminate\Support\Str;
use Laravel\Ai\Embeddings;
use Laravel\Ai\Enums\Lab;

// Single
$embeddings = Str::of('Napa Valley wine tasting')->toEmbeddings();

// Batch
$embeddings = Embeddings::for(['text1', 'text2'])
    ->dimensions(1536)
    ->generate(Lab::OpenAI, 'text-embedding-3-small');

// Caching — in config/ai.php or per-request
$embeddings = Embeddings::for(['query'])->cache()->generate();
```

**PostgreSQL pgvector only** — this feature is unavailable on the default MySQL stack. Adopt it only
after an explicit database decision, then enable the extension, add an indexed `vector()` column, and
query by similarity:

```php
// Migration
Schema::ensureVectorExtensionExists();
$table->vector('embedding', dimensions: 1536)->index();

// Query
$results = Product::query()
    ->whereVectorSimilarTo('embedding', $queryEmbedding, minSimilarity: 0.4)
    ->limit(10)
    ->get();

// Also: whereVectorDistanceLessThan(), selectVectorDistance()
```

### Reranking

```php
use Laravel\Ai\Reranking;

// Raw documents
$ranked = Reranking::of($documents)->limit(5)->rerank('PHP frameworks');

// Eloquent collections
$ranked = $posts->rerank('body', 'Laravel tutorials');
```

### Files and vector stores

```php
use Laravel\Ai\Files\Document;
use Laravel\Ai\{Files, Stores};

// Upload to provider
$file = Document::fromPath('/path/report.pdf')->put();

// Vector stores
$store = Stores::create('Knowledge Base');
$store->add(Document::fromStorage('manual.pdf'));
```

### Failover

```php
// Automatically falls back to Anthropic if OpenAI fails
$response = (new SalesCoach)->prompt('Analyze', provider: [Lab::OpenAI, Lab::Anthropic]);
```

### Testing

Full faking for all AI capabilities — same pattern as `Queue::fake()`, `Http::fake()`, etc. (see `testing.md` for general test patterns). Always use Pest `it()` syntax:

```php
// tests/Feature/Http/Controllers/API/V1/AnalysisControllerTest.php
use App\Ai\Agents\{ProductAnalyzer, SalesCoach};
use Laravel\Ai\{Audio, Embeddings, Image, Reranking, Transcription};

it('returns AI analysis for a deal', function () {
    SalesCoach::fake([
        'This deal looks promising. Focus on the ROI angle.',
    ])->preventStrayPrompts();

    $this->actingAs(authenticatedUser())
        ->postJson('/api/v1/analysis', ['prompt' => 'Analyze this deal'])
        ->assertOk()
        ->assertJsonPath('data.response', 'This deal looks promising. Focus on the ROI angle.');

    SalesCoach::assertPrompted(fn ($prompt) => $prompt->contains('deal'));
});

it('returns structured product analysis', function () {
    ProductAnalyzer::fake([
        ['sentiment' => 'positive', 'score' => 0.85, 'summary' => 'Great', 'key_themes' => []],
    ])->preventStrayPrompts();

    $result = app(\App\Actions\Product\AnalyzeReviews::class)->execute($product);

    expect($result)->sentiment->toBe('positive')->score->toBe(0.85);
    ProductAnalyzer::assertPrompted();
});

it('generates product image', function () {
    Image::fake()->preventStrayImages();

    $this->actingAs(authenticatedUser())
        ->postJson('/api/v1/products/1/generate-image', ['prompt' => 'Product photo'])
        ->assertOk();

    Image::assertGenerated();
});

```

**Fakeable AI surfaces:** `SalesCoach::fake()`, `Image::fake()`, `Audio::fake()`, `Transcription::fake()`, `Embeddings::fake()`, `Reranking::fake()`, `Files::fake()`, `Stores::fake()`.

**All assertion methods:** `assertPrompted()`, `assertPrompted(fn ($prompt) => ...)`, `assertQueued()`, `assertNeverPrompted()`, `preventStrayPrompts()`, `assertGenerated()`.

### Events

The SDK dispatches lifecycle events for logging, metrics, and side effects (see `queues-jobs.md` for event/listener patterns), including:

`PromptingAgent`, `AgentPrompted`, `StreamingAgent`, `AgentStreamed`, `InvokingTool`,
`ToolInvoked`, `GeneratingImage`, `ImageGenerated`, `GeneratingAudio`, `AudioGenerated`,
`GeneratingTranscription`, `TranscriptionGenerated`, `GeneratingEmbeddings`,
`EmbeddingsGenerated`, `Reranking`, `Reranked`, and more.

Use `Event::fake([AgentPrompted::class])` in tests to assert events were dispatched (see `testing.md`).

## When

| Scenario | Approach |
|---|---|
| Text generation with tools | Agent class implementing `HasTools` |
| Chat with memory | Agent with `Conversational` + `RemembersConversations` |
| Structured data extraction | Agent implementing `HasStructuredOutput` |
| Real-time streaming to frontend | `->stream()` with `->usingVercelDataProtocol()` |
| Background AI processing | `->queue()` with `->then()` / `->catch()` |
| Image generation | `Image::of('prompt')->generate()` |
| Voice synthesis | `Audio::of('text')->generate()` |
| Audio transcription | `Transcription::fromStorage('file.mp3')->generate()` |
| Semantic search / RAG | Embeddings + pgvector + `SimilaritySearch` tool |
| Result reranking | `Reranking::of($docs)->rerank('query')` |
| Multi-provider resilience | Failover arrays: `provider: [Lab::OpenAI, Lab::Anthropic]` |
| Quick one-off prompt | `agent(instructions: '...')->prompt('...')` |

## Never

- **Never inline provider API calls.** Always use Agent classes or the first-party AI classes
  (`Image`, `Audio`, etc.). Raw HTTP calls bypass middleware, events, failover, and testing hooks:
  ```php
  // WRONG — raw HTTP, untestable, no middleware/events
  $response = Http::withToken(config('services.openai.key'))
      ->post('https://api.openai.com/v1/chat/completions', [...]);

  // RIGHT — Agent class with full lifecycle
  $response = (new SalesCoach)->prompt('Analyze this deal');
  ```
- **Never put AI logic in controllers.** Controllers delegate to Actions (see `service-layer.md`). Actions call agents:
  ```php
  // WRONG — agent call in controller
  public function store(AnalyzeRequest $request) {
      $response = (new SalesCoach)->prompt($request->validated('prompt'));
      return response()->json($response);
  }

  // RIGHT — controller delegates to Action, Action calls agent
  public function store(AnalyzeRequest $request, AnalyzeDeal $action): JsonResponse {
      return DealAnalysisResource::make($action->execute($request->validated()));
  }
  ```
- **Never serialize Eloquent models into agent context.** Pass IDs and re-query, same as jobs (see `queues-jobs.md`). Serialized models become stale.
- **Never skip `::fake()` in tests.** Unfaked agents make real API calls, costing money and causing flaky tests. Use `preventStrayPrompts()` (see `testing.md` for mocking patterns).
- **Never hardcode API keys.** Use `.env` variables and `config/ai.php`. Never commit keys to source.
- **Never use `RemembersConversations` without running the migration.** The trait requires `agent_conversations` and `agent_conversation_messages` tables — publish and migrate first.
- **Never use Laravel vector migrations or query methods on MySQL.** Laravel 13 currently supports
  them only on PostgreSQL connections with `pgvector`; changing the database is an explicit
  architecture decision.
- **Never return raw agent responses from controllers.** Transform through API Resources (see `api-resources.md`) for consistent response format:
  ```php
  // WRONG — raw response
  return response()->json(['text' => $agentResponse->text()]);

  // RIGHT — API Resource
  return AgentAnalysisResource::make($analysis);
  ```
