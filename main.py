import os
from google import genai
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from PyPDF2 import PdfReader
import uvicorn
import io

# ---- FastAPI Setup ----
app = FastAPI(title="Perplexity Clone Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Gemini Setup ----
API_KEY = "AIzaSyDHkEY0dQ15z5_ERSYIVJKKfWzEDmcHDI8"
client = genai.Client(api_key=API_KEY)
MODEL_NAME = "gemini-2.5-flash"

# ---- RAG: In-Memory PDF Store ----
# Stores extracted text from uploaded PDFs
pdf_store = {
    "documents": [],    # list of {"name": str, "text": str}
    "active": False,    # whether RAG context should be used
}

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[dict]] = []
    use_rag: Optional[bool] = True

# ---- PDF Upload Endpoint ----
@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    print(f"[UPLOAD] Receiving: {file.filename}")
    try:
        contents = await file.read()
        reader = PdfReader(io.BytesIO(contents))

        extracted_text = ""
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                extracted_text += f"\n--- Page {i+1} ---\n{page_text}"

        if not extracted_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Could not extract any text from this PDF. It might be scanned/image-based."
            )

        # Store in memory
        pdf_store["documents"].append({
            "name": file.filename,
            "text": extracted_text.strip()
        })
        pdf_store["active"] = True

        char_count = len(extracted_text)
        page_count = len(reader.pages)
        print(f"[OK] Extracted {char_count} chars from {page_count} pages")

        return {
            "status": "success",
            "filename": file.filename,
            "pages": page_count,
            "characters": char_count,
            "message": f"Uploaded '{file.filename}' ({page_count} pages). You can now ask questions about it!"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")

# ---- Clear Uploaded PDFs ----
@app.post("/clear-docs")
async def clear_documents():
    pdf_store["documents"] = []
    pdf_store["active"] = False
    return {"status": "cleared", "message": "All uploaded documents have been removed."}

# ---- Chat Endpoint (with RAG) ----
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    print(f"[CHAT] Received: {request.message[:60]}...")
    try:
        # Build prompt with RAG context if PDFs are uploaded
        prompt = request.message

        if pdf_store["active"] and pdf_store["documents"] and request.use_rag:
            # Combine all document texts (simple RAG: full context injection)
            context_parts = []
            for doc in pdf_store["documents"]:
                context_parts.append(f"=== Document: {doc['name']} ===\n{doc['text']}")

            combined_context = "\n\n".join(context_parts)

            # Truncate context if too large (Gemini has limits)
            max_context = 100000  # ~100k chars is safe for Gemini 2.5 Flash
            if len(combined_context) > max_context:
                combined_context = combined_context[:max_context] + "\n\n[... document truncated due to length ...]"

            prompt = f"""You are a helpful AI assistant. The user has uploaded documents for reference.
Use the following document context to answer the user's question accurately.
If the answer is not in the documents, say so and provide your best general knowledge answer.

--- UPLOADED DOCUMENT CONTEXT ---
{combined_context}
--- END OF DOCUMENT CONTEXT ---

User Question: {request.message}

Provide a clear, well-structured answer based on the documents above."""

            print(f"[RAG] Using {len(pdf_store['documents'])} document(s) as context")

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        reply_text = response.text
        if not reply_text:
            raise Exception("Gemini returned empty text.")

        print(f"[OK] Response generated ({len(reply_text)} chars)")
        return {"response": reply_text}

    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

# ---- Get Upload Status ----
@app.get("/upload-status")
async def upload_status():
    doc_names = [d["name"] for d in pdf_store["documents"]]
    return {
        "active": pdf_store["active"],
        "count": len(pdf_store["documents"]),
        "documents": doc_names
    }

# ---- Serve Frontend ----
@app.get("/")
async def serve_index():
    index_path = os.path.join(os.path.dirname(__file__), "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"error": "index.html not found"}

static_dir = os.path.dirname(__file__)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

# ---- Run ----
if __name__ == "__main__":
    print("")
    print("=" * 50)
    print("  SERVER IS STARTING...")
    print("  Open this link in your browser:")
    print("  >>> http://localhost:8000 <<<")
    print("=" * 50)
    print("")
    uvicorn.run(app, host="127.0.0.1", port=8000)
