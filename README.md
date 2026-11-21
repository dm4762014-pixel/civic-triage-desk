# Civic Triage Desk

IDEA//FORGE Track 1 prototype. Staff who receive complaints in more than one
language need to tell repeated reports from separate incidents before routing them.

## Start and demo

Serve this folder with `python -m http.server 3088 --bind 127.0.0.1` and open
http://127.0.0.1:3088. No API key or internet connection is required. For a public
MVP, the four web files can be hosted on a static host without a backend.

1. In AI classifier view, compare C101 and C102, English and Kannada reports of
   the same water leak. Approve the merge. The incident appears under Water supply.
2. Approve the C103 follow-up to add a third report. C104, a pothole at the same
   gate, stays separate. C108 falls outside the time window.
3. Switch to Keyword matching. Compare the benchmark and inspect the ambiguous
   near-identical entrance reports. Keep them separate if evidence is insufficient.
4. Undo an approved group or reset the demo. Try adding another bilingual report.

## Method and evaluation

The AI component is a nearest-neighbor text classifier using word and character
trigram features from 28 labeled English and Kannada examples. Predicting the
same issue type makes a pair a candidate only if it shares a landmark and falls
within three hours. Weak predictions go to staff review. The keyword baseline
uses cosine similarity over exact words, with the same landmark and time rules.

The benchmark uses all 45 pairs of ten separate synthetic reports, with four
labeled duplicate pairs. It measures automatic recommendations before staff review.
AI found 4 of 4 with no false matches. Keyword matching found 1 of 4 with one false
match. This designed fixture demonstrates behavior and is too small to estimate
performance on real municipal reports. Different incidents can share a category,
landmark and time, so every merge requires staff review.

The app stores demo changes in the current page only. The staff screen models the
review workflow without authentication or a municipal integration. No complaints
are sent to an authority. Credits: Web platform APIs and OpenAI Codex implementation
assistance. Demo data is synthetic.
