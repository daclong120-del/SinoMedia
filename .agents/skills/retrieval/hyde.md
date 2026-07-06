# 🔍 SKILL: HyDE — Hypothetical Document Embeddings cho RAG

> **Đọc kèm `skills/brainstorm/common.md` (luật dùng chung).**
>
> Skill này mô tả **kỹ thuật retrieval nâng cao**: thay vì embed câu hỏi, hãy để LLM sinh ra một "tài liệu giả" khớp về văn phong với tài liệu thật, rồi dùng vector của tài liệu giả đó để search.

---

## ⛔ LUẬT CỐT LÕI — đọc trước mọi thứ

**CẤM embed query trực tiếp vào vector search.** Đây là pipeline RAG — mọi retrieval PHẢI đi qua quy trình HyDE bên dưới.

> Bạn đang đọc file này vì `hooks/tool-gate.md` chặn bạn lại. Đừng tìm lý do để bỏ qua — đi thẳng vào **Quy trình** bên dưới.

**Ngoại lệ** (phải ghi chú rõ lý do, không tự suy diễn):
- Domain quá hẹp / thuật ngữ nội bộ đặc thù — LLM chắc chắn sinh sai hướng hoàn toàn
- Chi phí/latency gọi LLM thêm không thể chấp nhận trong context hiện tại

Không có lý do cụ thể = không có ngoại lệ → làm theo quy trình.

---

## Nguyên lý cốt lõi

```
Query ngắn → [LLM] → Hypothetical Doc → [Embedder] → Vector → [Search] → Tài liệu thật
                        (văn phong giống tài liệu thật)
```

- **Không đọc nội dung** tài liệu giả — chỉ lấy **vector biểu diễn** của nó.
- Chi tiết "bịa" sai sẽ được bình quân hoá trong không gian vector; **"dáng chung" của câu trả lời đúng** vẫn còn.
- Tài liệu giả đóng vai trò **cầu nối ngữ nghĩa** giữa câu hỏi ngắn và tài liệu dài.

---

## Quy trình

### Bước 1 — Nhận query & xác định context

Thu thập:
- `query`: câu hỏi / yêu cầu gốc của người dùng
- `domain`: lĩnh vực / chủ đề (dùng để prompt LLM sát hơn)
- `doc_style`: văn phong mục tiêu của tài liệu (học thuật / hỗ trợ kỹ thuật / pháp lý / v.v.)
- `top_k`: số tài liệu trả về

> ⚠️ Nếu `domain` hoặc `doc_style` chưa rõ → hỏi người dùng trước khi sang Bước 2.

---

### Bước 2 — Tạo Hypothetical Document

Gọi LLM với prompt theo dạng:

```
Hãy viết một đoạn văn ngắn (3–5 câu, văn phong [doc_style]) 
trả lời câu hỏi sau như thể bạn là tài liệu tham khảo trong lĩnh vực [domain]:

Câu hỏi: {query}

Trả lời TRỰC TIẾP không giải thích, không thêm prefix kiểu "Câu trả lời là:".
```

**Output:** chuỗi văn bản `hypothetical_doc` (không cần đúng — chỉ cần đúng "dáng").

> 📌 Gọi model đủ mạnh để sinh văn phong tốt. Model yếu → tài liệu giả ngắn cộc lốc → embedding kém. Chưa chắc model nào dùng được trong môi trường này → theo `hooks/tool-gate.md` (tra tài liệu thật, không đoán theo trí nhớ).

---

### Bước 3 — Embed Hypothetical Document

Truyền `hypothetical_doc` vào **embedding model** → `vector` (float[]).

**Adapter interface (để mở):**
```
embed(text: string) → float[]
```
Có thể là: OpenAI `text-embedding-3-small`, Cohere `embed-multilingual`, sentence-transformers, hay bất kỳ embedder nào đang dùng trong hệ thống.

> ⚠️ Phải dùng **cùng embedding model** với lúc index tài liệu thật. Khác model → kết quả vô nghĩa.

---

### Bước 4 — Search Vector DB

Truyền `vector` vào vector DB để tìm `top_k` tài liệu gần nhất.

**Adapter interface (để mở):**
```
search(vector: float[], top_k: int) → Document[]
```
Có thể là: Chroma, Pinecone, Qdrant, Weaviate, pgvector, hay bất kỳ vector store nào.

Mỗi `Document` cần trả về: `id`, `content`, `score` (similarity).

---

### Bước 5 — Trả về & dùng tài liệu thật

- **Loại bỏ** `hypothetical_doc` — nó đã hoàn thành sứ mệnh dẫn đường.
- Trả về `Document[]` là tài liệu **thật** từ vector DB.
- Dùng các tài liệu này để **grounding** cho câu trả lời cuối cùng (RAG generation step).

---

## Sơ đồ luồng đầy đủ

```
Người dùng
    │
    │  query
    ▼
┌─────────────────────────────────────────────────────────┐
│  HyDE Pipeline                                          │
│                                                         │
│  query ──► [LLM: sinh hypothetical_doc]                 │
│                      │                                  │
│                      ▼                                  │
│            [Embedder: embed(hypothetical_doc)]          │
│                      │                                  │
│                      │  vector                          │
│                      ▼                                  │
│            [Vector DB: search(vector, top_k)]           │
│                      │                                  │
│                      │  docs[]  (tài liệu THẬT)         │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
             [LLM: generate answer từ docs + query]
                       │
                       ▼
                  Câu trả lời
```

---

## Cấu hình tham số gợi ý

| Tham số | Gợi ý | Ghi chú |
|---|---|---|
| `hypothetical_doc` length | 3–5 câu | Quá ngắn → embedding kém; quá dài → chi phí cao, noise nhiều |
| `top_k` | 3–5 | Tăng lên 5–10 nếu cần re-rank sau |
| LLM model | sonnet hoặc tương đương | Đủ mạnh để giữ văn phong; haiku có thể thiếu ngữ cảnh |
| Temperature khi sinh HyDE | 0.3–0.5 | Thấp hơn bình thường — muốn đúng "chủ đề", không cần sáng tạo |

---

## Biến thể nâng cao

### Multi-HyDE (giảm variance)
Sinh **N tài liệu giả** (thay vì 1), trung bình vector:
```
vectors = [embed(doc) for doc in hypothetical_docs]
avg_vector = mean(vectors)
results = search(avg_vector, top_k)
```
Giúp giảm nguy cơ LLM bịa lệch một hướng. Chi phí nhân N.

### HyDE + Re-rank
Sau khi search HyDE, dùng cross-encoder re-rank kết quả với `(query, doc)` để tinh chỉnh thứ hạng trước khi trả về.

---

## Checklist trước khi xây

- [ ] Đã xác nhận embedding model dùng trong pipeline
- [ ] Đã xác nhận vector DB và schema collection
- [ ] `doc_style` và `domain` đã rõ (không để LLM tự đoán)
- [ ] Đã cân nhắc chi phí gọi LLM thêm mỗi query
- [ ] Đã test với query ngắn vs query dài để đo cải thiện
