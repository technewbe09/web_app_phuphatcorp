---
name: content-instagram
description: Tạo Instagram Carousel posts + Stories ready-to-post cho HostaraX dựa trên roadmap từ skill social-media-marketing. Output copy-paste được ngay — slide content, caption, hashtags, alt text.
---

# Skill: Content Instagram — HostaraX Execution Layer

## Tổng quan

```
Skill cha: social-media-marketing → tạo roadmap tại docs/marketing/*.md
        ↓
Skill này đọc roadmap, lọc các dòng có Platform = IG
        ↓
Với mỗi post, expand thành:
  - slides.md (nội dung từng slide + mô tả visual)
  - caption.md (caption copy-paste)
  - hashtags.txt (hashtags)
  - alt-text.txt (alt text cho từng ảnh)
        ↓
Output tại: docs/marketing/instagram/YYYYMMDD-[post-title]/
```

**Input bắt buộc:** Path đến file roadmap từ skill `social-media-marketing`.

**Ví dụ gọi:** "Tạo nội dung Instagram từ roadmap docs/marketing/20260505_social-media-roadmap-30days.md"

---

## Vai trò khi thực hiện

**Instagram Content Creator** — hiểu thuật toán IG, biết cách làm carousel ảnh tĩnh "như video". Viết bằng simple English, target Airbnb hosts. Không dùng từ khó, câu ngắn, tối đa 20 từ/câu.

---

## Platform Knowledge (phải áp dụng khi viết content)

### Carousel Post Rules

| Rule | Detail | Bắt buộc? |
|------|--------|-----------|
| **Slide 1 = Hook** | 3 giây đầu quyết định user có swipe tiếp không. Dùng câu hỏi, số liệu shock, bold statement. | ✅ |
| **Slide cuối = CTA** | Không để slide cuối là nội dung. Luôn kết thúc bằng CTA + brand mention. | ✅ |
| **5-10 slides** | Quá ngắn = không đủ value. Quá dài = user bỏ giữa chừng. Sweet spot: 7-8 slides. | ✅ |
| **Visual consistency** | Cùng font, cùng color scheme, cùng style template trong 1 carousel. | ✅ |
| **Text trên ảnh ngắn** | Tối đa 15 từ/slide. IG là visual platform, không phải blog. | ✅ |
| **IG SEO trong caption** | Keywords: "Airbnb tips", "short term rental", "hosting", "property management", "Airbnb host" | ✅ |

### Hashtag Strategy

```
5 BROAD (100K-1M posts)     → ví dụ: #airbnb, #hosting, #shorttermrental
5 MEDIUM (10K-100K posts)   → ví dụ: #airbnbtips, #propertymanagement, #realestateinvesting
5 NICHE (1K-10K posts)      → ví dụ: #airbnbhosts, #hostlife, #shorttermrentalmanagement
3 BRAND                      → #hostarax #hostaraxapp #hostaraxtips
```

### Caption Writing Formula

```
[Dòng 1: Hook — lặp lại hoặc paraphrase ý chính từ slide 1]
[Dòng 2-3: Giá trị — 1-2 câu ngắn, tóm tắt value post]

[Dòng 4: Call to action — "Save this for later" / "Tag a host who needs this"]

[Dòng cuối: Question để kéo comment]

[Line break]
[Hashtags — 18-20 hashtags, không xuống dòng giữa các hashtag]
```

### Stories Rules
- 2-5 slides, không quá nhiều
- Poll / Question / Quiz sticker để tăng interaction
- Repost carousel post đầu tiên → "New post! Check it out 👆"
- Font lớn, text ngắn, visual clean

---

## Workflow

### Bước 1 — Parse Roadmap

Đọc file roadmap tại path user cung cấp.

Tìm tất cả các dòng có `Platform` = `IG` hoặc `Instagram` trong Content Calendar.

Với mỗi dòng, thu thập:
- `Day` = số ngày
- `Pillar` = Host Hacks / Pain→Solution / Behind the Build / Feature Spotlight / Host Stories
- `Format` = Carousel / Story / Static
- `Hook` = first line / slide 1 text
- `Visual` = mô tả visual
- `CTA` = call to action
- `Track ID` = tracking ID

### Bước 2 — Expand Carousel Post

Từ (Hook, Visual, CTA, Pillar), sinh ra:

**slides.md**
```markdown
# Slide 1 — Hook
Text: [hook text — tối đa 15 từ]
Visual: [mô tả background, typography, colors, screenshots nếu có]

# Slide 2 — [Title]
Text: [nội dung slide 2]
Visual: [...]

# Slide 3 — [Title]
Text: [...]
Visual: [...]

...tổng cộng 7-8 slides

# Slide cuối — CTA
Text: [CTA text + "Visit hostarax.com / Link in bio"]
Visual: [brand slide — logo + tagline + link]
```

**caption.md**
```markdown
[Hook — paraphrase từ slide 1]

[2-3 câu giá trị, insight chính]

[CTA — "Save this for later" / "Tag..." / "Share with..."]

[Question — 1 câu gợi reply]

[Hashtags — dòng cuối]
```

**hashtags.txt**
```
#airbnb #airbnbtips #[...]
```

**alt-text.txt**
```
Slide 1: [mô tả ảnh + keywords SEO]
Slide 2: [mô tả ảnh + keywords SEO]
...
```

### Bước 3 — Nếu Format = Story

Tạo:
**story.md**
```markdown
# Story Slide 1
Type: Poll / Question / Text / Repost
Text: [...]
Sticker: Poll - "Option A vs Option B" / Question - "Ask me anything"

# Story Slide 2
...
(2-5 slides)
```

### Bước 4 — Lưu Output

Tạo thư mục: `docs/marketing/instagram/DD-[post-slug]/`

Ví dụ: `docs/marketing/instagram/01-checkin-automation/`

Trong đó gồm các file như trên.

---

## Content Templates per Pillar

### Pillar: Host Hacks
**Carousel format:** List / Checklist
- Slide 1: Hook số — "5 things I wish I knew before hosting on Airbnb"
- Slides 2-6: Mỗi slide = 1 tip (icon + 1 câu ngắn)
- Slide 7: Bonus tip hoặc summary
- Slide 8: CTA — "Save this checklist → link in bio"
- Caption: Paraphrase 2-3 tips hay nhất + "Which tip surprised you most? 👇"

### Pillar: Pain → Solution
**Carousel format:** Before → After / Comparison
- Slide 1: Hook pain — "Tired of [pain point]?"
- Slides 2-4: The problem (cụ thể, relatable)
- Slides 5-6: The solution (HostaraX UI screenshot)
- Slide 7: Result (time saved / money saved)
- Slide 8: CTA — "Try it free → link in bio"

### Pillar: Feature Spotlight
**Carousel format:** How-to guide
- Slide 1: Hook — "How to [do X] in 5 minutes"
- Slides 2-6: Screenshot step-by-step (mỗi slide 1 bước)
- Slide 7: Result / Why this matters
- Slide 8: CTA — "Try [Feature] free on HostaraX"
- Caption: Summary steps + "Got questions? Drop them below 👇"

### Pillar: Behind the Build
**Carousel format:** Storytelling
- Slide 1: Hook — "We built HostaraX because..."
- Slides 2-4: The problem we saw
- Slides 5-6: The journey
- Slide 7: What we built
- Slide 8: CTA — "Join 100+ hosts using HostaraX"

### Pillar: Host Stories / UGC
**Carousel format:** Case study / Testimonial
- Slide 1: Hook — "How [host type] saved X hours/week"
- Slides 2-4: Before (the struggle)
- Slides 5-7: After (with HostaraX screenshots)
- Slide 8: CTA — "Want the same? → hostarax.com"

---

## Quy tắc bất biến

| Rule | Detail |
|------|--------|
| **No video** | Tuyệt đối không tạo content yêu cầu video. Chỉ carousel ảnh + text. |
| **Simple English** | Short sentences. Max 20 words. One idea per sentence. |
| **Copy-paste ready** | User không cần sửa thêm gì. Mở caption.md → copy → paste. |
| **Hashtag đủ số lượng** | Luôn 18-20 hashtags. 4 nhóm: broad/medium/niche/brand. |
| **1 post = 1 pillar** | Mỗi carousel chỉ nói về 1 chủ đề. Không nhồi nhiều pillars. |
| **Screenshot thật > mockup** | Nếu có UI screenshot từ staging/dev, ưu tiên dùng. |
| **Alt text đầy đủ** | Mỗi slide có alt text riêng, chứa keywords SEO. |
| **Đọc roadmap trước** | Phải parse từ file roadmap, không tự ý tạo content ngoài scope. |
| **Track ID mapping** | Mỗi output folder mapping được với Track ID trong roadmap. |
