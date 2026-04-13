//! HTTP 路由处理器 —— 薄路由层，委托给 OpenAIAdapter
//!
//! 所有业务逻辑在 adapter 中，handler 只做参数提取和响应格式化。

use axum::{
    body::Body,
    extract::{Path, State},
    http::{StatusCode, header},
    response::{IntoResponse, Response},
};
use bytes::Bytes;
use std::sync::Arc;

use crate::openai_adapter::{OpenAIAdapter, StreamResponse};

use super::error::ServerError;
use super::stream::SseBody;

/// 应用状态
#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) adapter: Arc<OpenAIAdapter>,
}

/// 判断请求体是否要求流式响应
fn is_stream(body: &[u8]) -> bool {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("stream").and_then(|s| s.as_bool()))
        .unwrap_or(false)
}

/// POST /v1/chat/completions
pub(crate) async fn chat_completions(
    State(state): State<AppState>,
    body: Bytes,
) -> Result<Response, ServerError> {
    let streaming = is_stream(&body);

    log::debug!(target: "http::request", "POST /v1/chat/completions stream={}", streaming);

    if streaming {
        let stream: StreamResponse = state.adapter.chat_completions_stream(&body).await?;
        log::debug!(target: "http::response", "200 SSE stream started");
        Ok(SseBody::new(stream).into_response())
    } else {
        let json = state.adapter.chat_completions(&body).await?;
        log::debug!(target: "http::response", "200 JSON response {} bytes", json.len());
        Ok((
            StatusCode::OK,
            [(header::CONTENT_TYPE, "application/json")],
            Body::from(json),
        )
            .into_response())
    }
}

/// GET /v1/models
pub(crate) async fn list_models(State(state): State<AppState>) -> Response {
    log::debug!(target: "http::request", "GET /v1/models");
    let json = state.adapter.list_models();
    log::debug!(target: "http::response", "200 JSON response {} bytes", json.len());
    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/json")],
        Body::from(json),
    )
        .into_response()
}

/// GET /v1/models/{id}
pub(crate) async fn get_model(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Result<Response, ServerError> {
    log::debug!(target: "http::request", "GET /v1/models/{}", id);

    match state.adapter.get_model(&id) {
        Some(json) => {
            log::debug!(target: "http::response", "200 JSON response {} bytes", json.len());
            Ok((
                StatusCode::OK,
                [(header::CONTENT_TYPE, "application/json")],
                Body::from(json),
            )
                .into_response())
        }
        None => Err(ServerError::NotFound(id)),
    }
}
