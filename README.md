# Tilly — AI-Powered IKEA Shopping Assistant 🫖✨

Tilly is an agentic, animated furniture shopping assistant blending the cozy personality of an enchanted teapot with clean Scandinavian minimalism. Built to make furniture discovery conversational and context-aware, Tilly utilizes Retrieval-Augmented Generation (RAG) over IKEA catalog data to answer design queries, recommend curated pieces, and assist with item reservations in real time.

---

## Key Features

- **Conversational Product Discovery:** Context-aware semantic recommendations based on user budget, room dimensions, aesthetic themes, and functional needs.
- **Sub-Second RAG Architecture:** Employs `SentenceTransformers` embeddings paired with FAISS vector indexing for high-speed similarity search over catalog items.
- **Ultra-Fast LLM Inference:** Powered by Groq-accelerated Llama 3.1 8B for natural, low-latency conversational responses.
- **Scandinavian UI/UX:** Built with React and Tailwind CSS, featuring subtle animations, reactive tea-steaming indicators, and modular product cards.
- **Root Environment Security:** Keeps sensitive keys and endpoints isolated via root-level `.env` management loaded securely into the backend runtime.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Tailwind CSS, Vite / Lucide Icons |
| **Backend API** | FastAPI, Uvicorn, Python 3.10+ |
| **Vector Search & RAG** | FAISS (Facebook AI Similarity Search), SentenceTransformers |
| **LLM Inference** | Groq API (`llama-3.1-8b-instant`) |
| **Data Storage** | SQLite / Static Catalog (`ikea.csv`) |

---

## System Architecture

```text
User Request (React UI)
        │
        ▼
FastAPI Backend Gateway
        │
        ├──▶ Embedding Model (SentenceTransformers)
        │            │
        │            ▼
        │     FAISS Vector Index (Top-k Catalog Chunks)
        │            │
        ▼            ▼
Augmented Context Prompt
        │
        ▼
Groq API (Llama 3.1 8B) ──▶ Structured Response / Recommendations ──▶ UI