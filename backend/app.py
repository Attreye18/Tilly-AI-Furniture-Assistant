import html
import os
import random
import re
import sqlite3
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from scraper import fetch_live_ikea_reviews

# Try loading .env from both parent and current directory
load_dotenv(override=True)
dotenv_path_parent = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=dotenv_path_parent, override=True)

try:
  from groq import Groq

  GROQ_AVAILABLE = True
except ImportError:
  GROQ_AVAILABLE = False

app = FastAPI(
    title="Tilly - Your IKEA Decision & Review Assistant API", version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "ikea.csv")
DB_PATH = os.path.join(os.path.dirname(__file__), "tilly_bookings.db")


def init_db():
  conn = sqlite3.connect(DB_PATH)
  cursor = conn.cursor()
  cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            booking_ref TEXT PRIMARY KEY,
            item_id TEXT,
            item_name TEXT,
            price REAL,
            customer_name TEXT,
            room_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
  conn.commit()
  conn.close()


init_db()


def transform_to_friendly_name(row) -> str:
  cat = str(row["category"]).lower()
  desc = str(row["short_description"]).lower()
  if "table" in cat or "table" in desc:
    if "gateleg" in desc:
      return "Gateleg Solid Wood Dining Table"
    if "bar" in desc or "bar" in cat:
      return "Solid Wood Bar Table"
    return "Solid Wood Dining & Work Table"
  elif "chair" in cat or "stool" in desc or "chair" in desc:
    if "bar" in desc or "bar" in cat:
      return "Comfortable Bar Stool"
    return "Ergonomic Living Chair"
  elif "bookcase" in cat or "shelf" in desc:
    return "Modern Storage Bookshelf"
  elif "sofa" in cat or "armchair" in cat:
    if "bed" in desc:
      return "Sofa Cum Bed"
    return "Cozy Living Room Sofa"
  elif "wardrobe" in cat or "cabinet" in desc or "storage" in cat:
    return "Spacious Wardrobe & Cabinet"
  else:
    return "Designer Home Furniture Piece"


df = pd.read_csv(DATA_PATH)
df["price"] = pd.to_numeric(df["price"], errors="coerce").fillna(0.0)
df["price"] = (df["price"] * 25).round(2)
df["friendly_name"] = df.apply(transform_to_friendly_name, axis=1)


def search_products(query: str, k: int = 4) -> List[Dict[str, Any]]:
  stop_words = {
      "which",
      "one",
      "would",
      "you",
      "suggest",
      "me",
      "to",
      "buy",
      "i",
      "want",
      "a",
      "the",
      "is",
      "it",
      "what",
      "can",
      "do",
      "looking",
      "good",
      "some",
  }
  query_terms = [t for t in query.lower().split() if t not in stop_words]

  if not query_terms:
    results = []
    for idx in range(min(k, len(df))):
      row = df.iloc[idx]
      results.append({
          "item_id": str(row["item_id"]),
          "name": str(row["friendly_name"]),
          "category": str(row["category"]),
          "price": float(row["price"]),
          "short_description": str(row["short_description"]),
          "designer": str(row["designer"]),
          "sellable_online": bool(row["sellable_online"]),
          "link": str(row["link"]),
          "other_colors": str(row["other_colors"]),
      })
    return results

  scores = []
  for idx, row in df.iterrows():
    text = (
        f"{row['friendly_name']} {row['name']} {row['category']}"
        f" {row['short_description']} {row['designer']}".lower()
    )
    score = sum(1 for term in query_terms if term in text)
    scores.append((score, idx))

  scores.sort(key=lambda x: x[0], reverse=True)

  results = []
  for score, idx in scores[:k]:
    row = df.iloc[idx]
    results.append({
        "item_id": str(row["item_id"]),
        "name": str(row["friendly_name"]),
        "category": str(row["category"]),
        "price": float(row["price"]),
        "short_description": str(row["short_description"]),
        "designer": str(row["designer"]),
        "sellable_online": bool(row["sellable_online"]),
        "link": str(row["link"]),
        "other_colors": str(row["other_colors"]),
    })
  return results


def get_groq_client():
  groq_api_key = os.environ.get("GROQ_API_KEY")
  if GROQ_AVAILABLE and groq_api_key:
    try:
      return Groq(api_key=groq_api_key)
    except Exception as e:
      print(f"ERROR initializing Groq client: {e}")
  return None


def sanitize_chat_output(text: str) -> str:
  if not text:
    return ""
  text = html.unescape(text)
  text = re.sub(r"<\s*br\s*/?>", "\n", text, flags=re.IGNORECASE)
  text = re.sub(r"<[^>]+>", "", text)
  text = text.replace("**", "").replace("*", "")
  text = re.sub(r"(?:[\r\n\t ]+)?•(?:[\t ])*", r"\n\n• ", text)
  text = re.sub(r"\n{3,}", "\n\n", text)
  return text.strip()


def generate_llm_response(
    prompt: str, context: str, live_review_info: str = ""
) -> str:
  system_prompt = (
      "You are Tilly, a friendly robotic furniture copilot and buyer's advocate"
      " for IKEA.\n"
      "Unlike basic company bots that just read catalog entries, you give an"
      " UNFILTERED REALITY CHECK with real buyer reviews.\n\n"
      "STRICT OUTPUT RULES:\n"
      "1. Complete every sentence entirely without cutting off.\n"
      "2. DO NOT output any HTML tags (no <br>, <b>, <p>, <span>).\n"
      "3. DO NOT use markdown bold asterisks like **.\n"
      "4. Format each recommended item or takeaway starting with a bullet: '•"
      " '\n"
      "5. Always synthesize what real buyers say: What they love, what they"
      " complain about, and an Assembly Difficulty Rating (1 to 5).\n"
      "6. Leave an empty line between items.\n"
      "7. Conclude with: 'Would you like to proceed with any of these items to"
      " buy? Beep bop!'"
  )

  full_prompt = (
      f"Context catalog items:\n{context}\n\n"
      f"Live Verified Customer Feedback:\n{live_review_info}\n\n"
      f"Customer question: {prompt}\n\n"
      "Tilly's response with reality check:"
  )

  client = get_groq_client()
  if client:
    try:
      completion = client.chat.completions.create(
          model="openai/gpt-oss-20b",
          messages=[
              {"role": "system", "content": system_prompt},
              {"role": "user", "content": full_prompt},
          ],
          temperature=0.4,
          max_completion_tokens=2048,
      )
      raw_reply = completion.choices[0].message.content or ""
      return sanitize_chat_output(raw_reply)
    except Exception as e:
      print(f"CRITICAL GROQ API ERROR: {e}")
      return f"Beep bop! Groq API Error: {e}"

  return sanitize_chat_output(
      "Beep bop! My GROQ_API_KEY is missing or invalid, but I found these"
      f" matching items for you:\n\n{context[:150]}..."
  )


class ChatRequest(BaseModel):
  message: str
  budget: Optional[float] = None
  room_type: Optional[str] = None


class BookingRequest(BaseModel):
  item_id: str
  item_name: str
  price: float
  customer_name: str
  room_type: str


@app.get("/api/health")
def health_check():
  client = get_groq_client()
  return {
      "status": "healthy",
      "groq_active": client is not None,
      "dataset_size": len(df),
  }


@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
  msg_lower = req.message.lower().strip()

  if any(
      w in msg_lower
      for w in ["cancel", "didn't ask", "didnt ask", "remove booking"]
  ):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bookings")
    conn.commit()
    conn.close()
    return {
        "reply": (
            "Beep bop! 🤖✨ No problem at all! I have cancelled and cleared"
            " your recent bookings. What else can I help you find?"
        ),
        "products": [],
        "agent_state": "cancelled",
    }

  greetings = [
      "hi",
      "hello",
      "hey",
      "hey tilly",
      "hi tilly",
      "good morning",
      "good evening",
      "how are you",
      "what's up",
  ]
  if msg_lower in greetings or (
      any(msg_lower.startswith(g) for g in ["hi ", "hello ", "hey "])
      and len(msg_lower.split()) <= 3
  ):
    reply = (
        "Beep bop! 🤖✨ Hi there! I am Tilly, your unfiltered IKEA shopping"
        " advisor.\n\nAsk me about any furniture item, and I will share live"
        " pricing, real customer reviews, and assembly friction ratings!"
    )
    return {"reply": reply, "products": [], "agent_state": "greeting"}

  retrieved = search_products(req.message, k=4)

  # Fetch live web review data on the top matched product
  top_item_name = (
      retrieved[0]["name"] if retrieved else req.message.split()[0]
  )
  live_data = fetch_live_ikea_reviews(top_item_name)
  reviews_formatted = "\n".join(
      [f"- Review: {r}" for r in live_data.get("reviews", [])]
  )

  is_proceed_intent = any(
      phrase in msg_lower
      for phrase in [
          "proceed with",
          "confirm buy",
          "yes buy",
          "yes proceed",
          "reserve this",
      ]
  )
  if is_proceed_intent and len(retrieved) > 0:
    selected_item = retrieved[0]
    for p in retrieved:
      if p["name"].lower() in msg_lower or any(
          term in msg_lower for term in p["name"].lower().split()
      ):
        selected_item = p
        break

    booking_ref = f"TILLY-{random.randint(10000, 99999)}"
    base_price = float(selected_item["price"])
    gst_amount = round(base_price * 0.18, 2)
    total_price = round(base_price + gst_amount, 2)

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
            INSERT INTO bookings (booking_ref, item_id, item_name, price, customer_name, room_type)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            booking_ref,
            selected_item["item_id"],
            selected_item["name"],
            total_price,
            "Valued Customer",
            req.room_type or "General",
        ),
    )
    conn.commit()
    conn.close()

    reply = (
        f"Beep bop! 🤖✨ I have successfully booked and reserved the"
        f" {selected_item['name']} for you!\n\n• Booking Reference:"
        f" {booking_ref}\n• Base Price: ₹{base_price}\n• GST (18%):"
        f" ₹{gst_amount}\n• Total Amount: ₹{total_price}\n\nYou can view or"
        " manage this anytime in your My Bookings tab. Tilly is doing a happy"
        " dance!"
    )
    return {
        "reply": reply,
        "products": retrieved,
        "agent_state": "booked",
        "live_intel": live_data,
    }

  context_str = "\n\n".join([
      f"- {p['name']} ({p['category']}) – {p['short_description']} | Price:"
      f" ₹{p['price']} | Online: {p['sellable_online']}"
      for p in retrieved
  ])

  if req.budget:
    retrieved = [p for p in retrieved if p["price"] <= req.budget]

  reply = generate_llm_response(
      req.message, context_str, live_review_info=reviews_formatted
  )
  return {
      "reply": reply,
      "products": retrieved,
      "agent_state": "ready_for_action",
      "live_intel": live_data,
  }


@app.post("/api/recommendations")
def recommendations_endpoint(req: ChatRequest):
  query = req.message
  if req.room_type:
    query += f" for {req.room_type}"
  retrieved = search_products(query, k=6)
  if req.budget:
    retrieved = [p for p in retrieved if p["price"] <= req.budget]
  return {
      "recommendations": retrieved,
      "message": (
          "Here are some wonderful picks for your"
          f" {req.room_type or 'home'}!"
      ),
  }


@app.post("/api/bookings")
def create_booking(req: BookingRequest):
  booking_ref = f"TILLY-{random.randint(10000, 99999)}"
  conn = sqlite3.connect(DB_PATH)
  cursor = conn.cursor()
  cursor.execute(
      """
        INSERT INTO bookings (booking_ref, item_id, item_name, price, customer_name, room_type)
        VALUES (?, ?, ?, ?, ?, ?)
    """,
      (
          booking_ref,
          req.item_id,
          req.item_name,
          req.price,
          req.customer_name,
          req.room_type,
      ),
  )
  conn.commit()
  conn.close()
  return {
      "success": True,
      "booking_ref": booking_ref,
      "message": (
          f"Booking confirmed! Reference: {booking_ref}. Tilly is doing a"
          " happy dance! 🤖✨"
      ),
  }


@app.get("/api/bookings")
def get_bookings():
  conn = sqlite3.connect(DB_PATH)
  conn.row_factory = sqlite3.Row
  cursor = conn.cursor()
  cursor.execute("SELECT * FROM bookings ORDER BY created_at DESC")
  rows = cursor.fetchall()
  bookings = [dict(row) for row in rows]
  conn.close()
  return {"bookings": bookings}


@app.delete("/api/bookings/{booking_ref}")
def cancel_booking(booking_ref: str):
  conn = sqlite3.connect(DB_PATH)
  cursor = conn.cursor()
  cursor.execute("DELETE FROM bookings WHERE booking_ref = ?", (booking_ref,))
  conn.commit()
  conn.close()
  return {"success": True, "message": f"Booking {booking_ref} cancelled."}


if __name__ == "__main__":
  import uvicorn

  uvicorn.run(app, host="0.0.0.0", port=8000)