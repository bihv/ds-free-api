# DS-Free-API

[![](https://img.shields.io/github/license/NIyueeE/ds-free-api.svg)](LICENSE)
![](https://img.shields.io/github/stars/NIyueeE/ds-free-api.svg)
![](https://img.shields.io/github/forks/NIyueeE/ds-free-api.svg)

[中文](README.md)

Reverse proxy and adapter for free DeepSeek web chat endpoints to standard OpenAI-compatible API protocol (currently only openai_chat_completions, more to come).

Cross-platform native Rust binary + single TOML config file.

## Quick Start

Download the release for your platform from [releases](https://github.com/NIyueeE/ds-free-api/releases) and extract.

```
  .
  ├── ds-free-api          # executable
  ├── LICENSE
  ├── README.md
  ├── README.en.md
  └── config.example.toml  # config template
```

### Configuration

Copy `config.example.toml` to `config.toml` in the same directory as the executable, or use `./ds-free-api -c <config_path>` to specify a config path.

### Run

```bash
# Run directly (requires config.toml in the same directory)
./ds-free-api

# Specify config path
./ds-free-api -c /path/to/config.toml

# Debug mode
RUST_LOG=debug ./ds-free-api
```

Required fields only. One account = one concurrency slot (seems max 2 concurrent).

```toml
[server]
host = "127.0.0.1"
port = 5317

# API access tokens, leave empty to disable auth
# [[server.api_tokens]]
# token = "sk-your-token"
# description = "dev test"

# Fill email or mobile (pick one or both). Mobile seems to only support +86 area.
[[accounts]]
email = "user1@example.com"
mobile = ""
area_code = ""
password = "pass1"
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/v1/chat/completions` | Chat completions |
| GET | `/v1/models` | List models |
| GET | `/v1/models/{id}` | Get model |

## Model Mapping

`model_types` in `config.toml` (defaults to `["default", "expert"]`) maps automatically:

| OpenAI Model ID | DeepSeek Type |
|-----------------|---------------|
| `deepseek-default` | Default mode |
| `deepseek-expert` | Expert mode |

Enable **reasoning**: add `"reasoning_effort": "high"` to the request body. See [Create chat completion | OpenAI API Reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Any value other than `"none"` enables it.

Enable **web search**: add `"web_search_options": {"search_context_size": "high"}`. (May not be very useful — the model often forgets it has search capability.)

## Development

Requires Rust 1.94.1+ (see `rust-toolchain.toml`).

```bash
# Check (check + clippy + fmt)
just check

# Run tests
cargo test

# Run HTTP server
just serve

# CLI examples
just ds-core-cli
just openai-adapter-cli
```

Architecture overview:

```mermaid
graph LR
    Client -- "OpenAI protocol" --> Server

    subgraph server["server (axum HTTP)"]
        Server[Routing / Auth]
    end

    subgraph openai_adapter["openai_adapter"]
        Request[Request parsing]
        Response[Response conversion]
    end

    subgraph ds_core["ds_core"]
        Pool[Account pool rotation]
        Pow[PoW solving]
        Chat[Chat orchestration]
    end

    Server --> Request --> Pool
    Pool --> Pow --> Chat
    Chat -- "DeepSeek internal protocol" --> DeepSeek[(DeepSeek API)]
    Chat -- "SSE stream" --> Response --> Server
```

Data pipelines:

- **Request**: `JSON body` → `normalize` validation/defaults → `tools` extraction → `prompt` ChatML build → `resolver` model mapping → `ChatRequest`
- **Response**: `DeepSeek SSE bytes` → `sse_parser` → `state` patch state machine → `converter` format conversion → `tool_parser` XML parsing → `StopStream` truncation → `OpenAI SSE bytes`

## License

[Apache License 2.0](LICENSE)

DeepSeek's official API is very affordable. Please support the official service.

This project was created to experiment with the latest models in DeepSeek's web A/B testing.

**Commercial use is strictly prohibited** to avoid putting pressure on official servers. Use at your own risk.
