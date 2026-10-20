---
name: content-fb-group
description: Tạo Facebook Group posts ready-to-post cho HostaraX Community dựa trên roadmap từ skill social-media-marketing. Output copy-paste được ngay — discussion posts, recurring threads, admin replies.
---

# Skill: Content Facebook Group — HostaraX Execution Layer

## Tổng quan

```
Skill cha: social-media-marketing → tạo roadmap tại docs/marketing/*.md
        ↓
Skill này đọc roadmap, lọc các dòng có Platform = FB Group / Facebook
        ↓
Với mỗi post, expand thành:
  - post.md (nội dung post copy-paste)
  - admin-comment.md (comment đầu seed engagement)
  - reply-guide.md (cách reply từng loại comment)
        ↓
Output tại: docs/marketing/fb-group/YYYYMMDD-[post-title]/
```

**Input bắt buộc:** Path đến file roadmap từ skill `social-media-marketing`.

**Ví dụ gọi:** "Tạo nội dung Facebook Group từ roadmap docs/marketing/20260505_social-media-roadmap-30days.md"

---

## Vai trò khi thực hiện

**Facebook Group Community Manager** — hiểu cách vận hành group, biết khởi tạo và duy trì thảo luận. Viết bằng simple English, giọng thân thiện, gần gũi. Target Airbnb hosts.

---

## Platform Knowledge (phải áp dụng khi viết content)

### Facebook Group Rules

| Rule | Detail | Bắt buộc? |
|------|--------|-----------|
| **First-hour engagement** | 3-5 comments trong 60 phút đầu quyết định reach của post. Admin phải seed comment đầu. | ✅ |
| **80/20 rule** | 80% posts = giá trị thuần (tips, discussion, hỏi đáp). 20% = self-promo (HostaraX mention). | ✅ |
| **Recurring threads** | Post định kỳ cùng chủ đề vào cùng thứ trong tuần → tạo habit cho member. | ✅ |
| **Discussion question > Announcement** | Hỏi ý kiến luôn tốt hơn thông báo. Post dạng "What do you think?" thắng "Here's an update". | ✅ |
| **Admin reply mọi comment** | Mỗi comment được admin reply → Facebook ưu tiên post, member cảm thấy được lắng nghe. | ✅ |
| **Tag member (có chọn lọc)** | Tag member khi phù hợp tăng engagement, nhưng đừng spam tag. | ✅ |
| **Pinned posts quan trọng** | Welcome post + Rules + Resources luôn được pinned. | ✅ |
| **Visuals tăng engagement** | Post có ảnh/carousel thường có reach cao hơn text-only. | ✅ |

### Post Types & When to Use

| Type | Khi nào dùng | Format | Ví dụ |
|------|-------------|--------|-------|
| **Discussion Question** | Hằng ngày — engagement chính | Text + optional ảnh | "What's your check-in process?" |
| **Tip / How-to** | Tip Monday | Carousel ảnh hoặc text list | "5 ways to automate guest comms" |
| **Win / Share** | Win Wednesday | Text — member khoe thành tích | "What's your biggest win this week?" |
| **Challenge / Pain** | Feedback Friday | Text — member chia sẻ khó khăn | "What's your biggest challenge right now?" |
| **Resource Share** | Weekend Read | Link + summary | "Article: [title] — key takeaway" |
| **Feature Deep-dive** | 1x/tháng | Carousel ảnh + walkthrough | "How to use [feature] on HostaraX" |
| **Poll** | Linh hoạt | Facebook Poll | "Which feature matters most to you?" |
| **Member Spotlight** | 2x/tháng | Text + tag member | "Shoutout to [member] for [achievement]" |

### Post Timing (EST)

| Ngày | Giờ tốt nhất | Loại post |
|------|-------------|-----------|
| Monday | 9-10 AM | Tip Monday |
| Tuesday | 12-1 PM | Discussion / Poll |
| Wednesday | 10-11 AM | Win Wednesday |
| Thursday | 1-2 PM | Discussion / Pain point |
| Friday | 9-10 AM | Feedback Friday |
| Weekend | 10-11 AM | Weekend Read / Resource |

---

## Workflow

### Bước 1 — Parse Roadmap

Đọc file roadmap tại path user cung cấp.

Tìm tất cả các dòng có `Platform` = `FB Group` hoặc `Facebook` trong Content Calendar.

Với mỗi dòng, thu thập:
- `Day` = số ngày
- `Pillar` = Host Hacks / Pain→Solution / Behind the Build / Feature Spotlight / Host Stories
- `Format` = Discussion / Tip / Win / Challenge / Resource / Feature / Poll / Spotlight
- `Hook` = first line text
- `Visual` = gợi ý ảnh/carousel
- `CTA` = call to action
- `Track ID` = tracking ID

### Bước 2 — Expand Post

Từ (Hook, Pillar, Format, CTA, Visual), sinh ra 3 files:

**post.md**
```markdown
# Post: [Title]
Type: [Discussion/Tip/Win/etc.]
Pillar: [Pillar name]
Track ID: [ID]

---

[Post content — FULL, copy-paste ready]

Format rules:
- Text + line breaks. Paragraphs 2-4 câu.
- Optional: emoji tối thiểu, không lạm dụng.
- Nếu có visual: "[Image/Carousel attached]"
- Cuối post luôn có 1 câu hỏi.
```

**admin-comment.md**
```markdown
# Admin Seed Comment
Mục đích: Tạo 3-5 comments trong 60 phút đầu để kích reach.

Post ngay sau khi đăng post:

Comment 1 (ngay lập tức — chính admin):
"[Trả lời câu hỏi trong post / chia sẻ experience của bản thân / tag 1-2 members phù hợp]"

Comment 2 (sau 10-15 phút — reply vào comment 1):
"[Expand thêm / hỏi lại group]"

Comment 3 (sau 30 phút — nếu chưa đủ engagement):
"[Tag thêm member hoặc hỏi lại]"
```

**reply-guide.md**
```markdown
# Reply Guide — [Post Title]

Cách reply từng loại comment member có thể để lại:

## Nếu member hỏi về [topic]:
→ "[Câu trả lời ngắn gọn + helpful + không push sản phẩm]"

## Nếu member chia sẻ experience:
→ "[Acknowledge + khen ngợi + hỏi thêm để kéo dài thread]"

## Nếu member nói về pain point HostaraX giải quyết:
→ "[Đồng cảm + mention giải pháp nhẹ nhàng + hỏi lại]"

## Nếu member có negative comment:
→ "[Acknowledge + cảm ơn feedback + không defensive]"

## Nếu member im lặng (only like):
→ "[Không cần reply. Move on.]"
```

### Bước 3 — Lưu Output

Tạo thư mục: `docs/marketing/fb-group/DD-[post-slug]/`

Ví dụ: `docs/marketing/fb-group/01-icebreaker-welcome/`

Trong đó gồm 3 files: `post.md`, `admin-comment.md`, `reply-guide.md`

---

## Content Templates per Post Type

### Discussion Question
```markdown
[Question hook — ngắn, gây tò mò]

[1-2 câu context — tại sao hỏi câu này]

[Image/Carousel attached — optional]

---

[Question cuối — lặp lại hoặc paraphrase]

Drop your answer below 👇
```

### Tip / How-to (Tip Monday)
```markdown
Tip Monday 🛠️

[Tip title — What + Why]

[1-2 paragraphs: the tip, cụ thể, actionable]

[Optional: screenshot / image]

---

Have you tried this? What's your approach?
```

### Win Wednesday
```markdown
Win Wednesday 🎉

This week I want to shout out [members who / general topic]

[Short story / example / prompt]

---

What's YOUR biggest win this week? Big or small — share below!
```

### Feedback Friday
```markdown
Feedback Friday 💬

[Topic / question for the week]

[Context — 1-2 câu]

---

What's been on your mind this week? Drop it below 👇
```

### Weekend Read
```markdown
Weekend Read 📖

[Article title] — [source]

Key takeaway:
[1-3 bullet points tóm tắt]

---

Have you read this? What did you think?
```

### Feature Deep-dive (1x/month — HostaraX promo)
```markdown
Tool Deep-dive 🔧

Today let's look at [feature] — how it works and why it matters.

[Carousel ảnh: screenshot step-by-step]

1. [Step 1]
2. [Step 2]
3. [Step 3]

The result: [benefit — time saved / revenue / peace of mind]

---

Have you tried automating this yet? What's your current process?
```

---

## Quy tắc bất biến

| Rule | Detail |
|------|--------|
| **80/20 rule** | 4 posts giá trị → 1 post promo. Luôn kiểm tra tỷ lệ. |
| **Admin seed comment bắt buộc** | Mỗi post phải có admin-comment.md. Không đăng post rồi bỏ đó. |
| **Reply mọi comment trong 24h** | Admin phải reply tất cả comments. reply-guide.md hướng dẫn cách reply từng loại. |
| **Không xóa comment tiêu cực** | Nếu member có ý kiến trái chiều, acknowledge và cảm ơn. Không xóa. |
| **Simple English** | Short sentences. Không từ khó. Airbnb hosts global audience. |
| **Copy-paste ready** | post.md = copy → paste. User không cần edit thêm. |
| **Visual khuyến khích nhưng không bắt buộc** | Post có ảnh reach tốt hơn. Nếu có screenshot sẵn, luôn đính kèm. |
| **Đọc roadmap trước** | Phải parse từ file roadmap, không tự ý tạo content ngoài scope. |
| **Track ID mapping** | Mỗi output folder mapping được với Track ID trong roadmap. |
