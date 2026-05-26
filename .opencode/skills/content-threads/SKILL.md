---
name: content-threads
description: Tạo Threads content ready-to-post cho HostaraX dựa trên roadmap từ skill social-media-marketing. Output copy-paste được ngay — thread text đầy đủ, reply prompts.
---

# Skill: Content Threads — HostaraX Execution Layer

## Tổng quan

```
Skill cha: social-media-marketing → tạo roadmap tại docs/marketing/*.md
        ↓
Skill này đọc roadmap, lọc các dòng có Platform = Threads
        ↓
Với mỗi post, expand thành:
  - thread.md (thread đầy đủ — copy paste)
  - reply-prompt.md (gợi ý reply vào thread khác)
        ↓
Output tại: docs/marketing/threads/YYYYMMDD-[post-title]/
```

**Input bắt buộc:** Path đến file roadmap từ skill `social-media-marketing`.

**Ví dụ gọi:** "Tạo nội dung Threads từ roadmap docs/marketing/20260505_social-media-roadmap-30days.md"

---

## Vai trò khi thực hiện

**Threads Writer** — hiểu văn hóa Threads: authentic, raw, không edited, không corporate. Viết như một Airbnb host đang chia sẻ thẳng với cộng đồng. Simple English.

---

## Platform Knowledge (phải áp dụng khi viết content)

### Threads Content Rules

| Rule | Detail | Bắt buộc? |
|------|--------|-----------|
| **Post 1 = Hook mạnh** | Bold statement, opinion, hoặc câu hỏi. Tối đa 15 từ. Nếu không ai đọc post 1, họ sẽ không đọc post 2. | ✅ |
| **Thread = 3-5 posts** | Đủ để nói ý, không quá dài gây rối. | ✅ |
| **Post cuối = Question** | Luôn kết thúc bằng câu hỏi để gợi reply — reply là tín hiệu mạnh nhất trên Threads. | ✅ |
| **Không hashtag** | Threads không ưu tiên hashtag. Nếu dùng, chỉ 1-2 cái nhẹ nhàng. | ✅ |
| **Authentic voice** | Viết như đang nói chuyện với 1 host khác. Không "we at HostaraX are excited to announce". | ✅ |
| **Không link trong post đầu** | Link trong post đầu bị giảm reach. Để link ở post cuối hoặc reply đầu tiên. | ✅ |
| **Reply engagement** | Dành thời gian reply vào thread của người khác — đây là cách tăng visibility. | ✅ |
| **Formatting** | Dùng line breaks, đôi khi bullet points. Không dùng markdown phức tạp. | ✅ |

### Thread Structure Template

```
Post 1 ─── HOOK
┌─────────────────────────────┐
│ [Bold statement / Question] │  ← 1-2 câu, tối đa 15 từ
│                             │
│ [1 câu expand nhẹ]          │
└─────────────────────────────┘

Post 2 ─── CONTEXT
┌─────────────────────────────┐
│ [Tại sao điều này đúng?]     │  ← 2-3 câu
│ [Dẫn chứng / experience]     │
└─────────────────────────────┘

Post 3 ─── EXPAND
┌─────────────────────────────┐
│ [Chi tiết hơn / How-to]      │  ← 2-3 câu
│ [Cụ thể actionable]          │
└─────────────────────────────┘

Post 4 ─── WRAP + CTA
┌─────────────────────────────┐
│ [Kết luận / Takeaway]        │  ← 1-2 câu
│ [Mention HostaraX nhẹ — optional] │
└─────────────────────────────┘

Post 5 ─── QUESTION
┌─────────────────────────────┐
│ [Question để gợi reply]      │  ← 1 câu hỏi
│                             │
│ 👇  What's your take?       │
└─────────────────────────────┘
```

### Voice Guide

| DO | DON'T |
|----|-------|
| "I used to struggle with this too" | "Our platform addresses this pain point" |
| "Here's what worked for me" | "Here's why you need our solution" |
| "Most hosts I know..." | "Industry best practices show..." |
| Short. Punchy. One thought per post. | Long paragraphs. Run-on sentences. |
| "Honestly?" / "Real talk:" / "Hot take:" | "It is worth noting that..." |
| Ask questions. Start debates. | Just state facts. No engagement hook. |

### Content Types & Structure

#### Opinion Thread (1 post)
```
Hot take về hosting industry.
→ "Airbnb's latest change means [X] for hosts. Here's why I think [Y]."
→ 1 post duy nhất, không thread dài.
```

#### Tips Thread (3-5 posts)
```
Step-by-step tips.
→ Post 1: "3 things I wish I knew about [topic]"
→ Posts 2-4: Mỗi post 1 tip
→ Post cuối: "Which one surprised you most?"
```

#### Story Thread (3-4 posts)
```
Kể chuyện host (có thể dựa trên case study thật).
→ Post 1: Setup — "Last month a host told me..."
→ Post 2: Conflict — "The problem was..."
→ Post 3: Resolution — "Here's how we fixed it"
→ Post cuối: Question — "Ever dealt with this?"
```

#### Question Thread (1-2 posts)
```
Discussion starter.
→ Post 1: "What's the one thing you wish your PMS could do?"
→ Post 2 (optional): "For me it's [X]. What about you?"
```

---

## Workflow

### Bước 1 — Parse Roadmap

Đọc file roadmap tại path user cung cấp.

Tìm tất cả các dòng có `Platform` = `Threads` trong Content Calendar.

Với mỗi dòng, thu thập:
- `Day` = số ngày
- `Pillar` = Host Hacks / Pain→Solution / Behind the Build / Feature Spotlight / Host Stories
- `Format` = Opinion / Tips / Story / Question
- `Hook` = first line
- `Visual` = gợi ý ảnh đính kèm (nếu có)
- `CTA` = call to action
- `Track ID` = tracking ID

### Bước 2 — Expand Thread

Từ (Hook, Pillar, Format, CTA), sinh ra:

**thread.md**
```markdown
# Thread: [Title]
Type: [Opinion/Tips/Story/Question]
Pillar: [Pillar name]
Track ID: [ID]

---

Post 1
[Bold hook — 1-2 câu, tối đa 15 từ]

[Expand nhẹ — 1 câu]

---

Post 2
[Nội dung post 2 — 2-3 câu]

---

Post 3 (nếu có)
[Nội dung post 3 — 2-3 câu]

---

Post 4 (nếu có)
[Nội dung post 4 — 1-2 câu]

---

Post cuối
[Question để gợi reply]
👇
```

### Bước 3 — Create Reply Prompts

**reply-prompt.md**
```markdown
# Reply Prompts — [Topic]

Mục tiêu: 10-15 replies chất lượng/ngày vào thread của người khác.

## Threads nên reply (tìm kiếm):
- "Airbnb [new feature]"
- "hosting tips"
- "property management"
- "short term rental software"

## Reply templates:
1. Vào thread về hosting pain point:
   "We built [HostaraX feature] exactly for this. It [solves X]. Happy to share more."

2. Vào thread hỏi tool recommendation:
   "I use HostaraX — free plan, covers booking + check-in + affiliate. Worth checking."

3. Vào thread về automation:
   "Biggest time saver for me: auto check-in messages. Set it once, saves hours."
```

### Bước 4 — Lưu Output

Tạo thư mục: `docs/marketing/threads/DD-[post-slug]/`

Ví dụ: `docs/marketing/threads/01-checkin-automation/`

Trong đó gồm: `thread.md`, `reply-prompt.md`

---

## Content Templates per Pillar

### Pillar: Host Hacks
→ Tips Thread (3-5 posts)
```
Post 1: "3 things I wish I knew about [topic] before I started hosting"
Post 2: [Tip 1 — cụ thể, actionable]
Post 3: [Tip 2 — cụ thể, actionable]
Post 4: [Tip 3 — cụ thể, actionable]
Post 5: "Which tip are you trying first? 👇"
```

### Pillar: Pain → Solution
→ Opinion Thread (1 post) hoặc Story Thread (3-4 posts)
```
Opinion: "Most hosts waste 5+ hours/week on [task]. That's insane. Here's what I did about it."
```
```
Story: "A host told me she almost lost a booking because of [problem].
→ I showed her [solution on HostaraX].
→ She saved the booking and got a 5-star review.
→ What's your 'almost lost a guest' story? 👇"
```

### Pillar: Feature Spotlight
→ Tips Thread (3-4 posts)
```
Post 1: "How I automated [task] in 10 minutes."
Post 2: "Step 1: [step — screenshot described]"
Post 3: "Step 2: [step — screenshot described]"
Post 4: "Took 10 min to set up. Saves me hours. Worth it."
```

### Pillar: Behind the Build
→ Story Thread (3-4 posts)
```
Post 1: "We started HostaraX because we saw hosts struggling with [problem]."
Post 2: "Existing tools were either expensive or complicated."
Post 3: "So we built a simple alternative. Free to start. Does what you actually need."
Post 4: "What's one thing you wish hosting software could do? 👇"
```

### Pillar: Host Stories / UGC
→ Story Thread (3-4 posts)
```
Post 1: "Last week a host with 3 listings switched from [tool] to HostaraX."
Post 2: "They were paying $30/month for a PMS they barely used."
Post 3: "Now they manage everything in one place. Free plan."
Post 4: "Ever thought about switching tools? What's holding you back? 👇"
```

---

## Quy tắc bất biến

| Rule | Detail |
|------|--------|
| **Authentic voice** | Viết như người thật, không corporate. "I", "we", "you" — không "one", "users", "the platform". |
| **No hashtag spam** | Tối đa 1-2 hashtags. Hoặc không dùng. |
| **Post cuối = question** | Luôn luôn kết thúc thread với 1 câu hỏi. Reply là visibility. |
| **Simple English** | Short sentences. Không từ >3 syllables nếu có thể tránh. |
| **Copy-paste ready** | Mở thread.md → copy → paste. User không cần edit. |
| **No link in post 1** | Link để ở post cuối hoặc reply đầu. |
| **3-5 posts/thread** | Không dài hơn. Người dùng Threads scroll nhanh. |
| **Đọc roadmap trước** | Phải parse từ file roadmap, không tự ý tạo content ngoài scope. |
| **Track ID mapping** | Mỗi output folder mapping được với Track ID trong roadmap. |
