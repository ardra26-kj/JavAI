# JavAI

A responsive React and Tailwind CSS chat interface for an existing Spring Boot
chat API. This repository contains frontend code only.

## Getting started

```sh
npm install
npm run dev
```

By default, the frontend sends `POST` requests to
`http://localhost:8080/api/chat`. Set `VITE_CHAT_API_URL` in a `.env` file to
point to another endpoint, for example:

```sh
VITE_CHAT_API_URL=http://localhost:8080/api/chat
```

The request body is `{ "conversationId": "string", "message": "string" }`.
Responses may be a plain-text reply or a JSON object with a reply in `reply`,
`answer`, `response`, `message`, or `content`. A JSON `conversationId` is used
if the server returns one. The browser must be allowed to make cross-origin
requests to the configured API URL.

Build the production frontend with `npm run build`.