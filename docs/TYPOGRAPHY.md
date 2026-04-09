# Typography Guideline

Muc tieu: giu giao dien Sontraify dong bo, de doc, va co cam giac san pham chuyen nghiep.

## 1. Font System
- Body font: Plus Jakarta Sans
- Display font: Sora
- Cau hinh nam trong frontend/src/index.css

## 2. Utility Classes
Su dung cac class sau thay vi gan text-size/font-weight tuy y:
- type-kicker: label nho, uppercase (Artist profile, Playlist, section label)
- type-display-hero: tieu de hero lon
- type-display-title: tieu de section
- type-body-muted: text phu, mo ta, meta
- type-table-head: heading bang/list uppercase
- type-button-sm: nut nho, action compact
- type-badge: badge/pill (status, count, tiny labels)

## 3. Quy tac ap dung
- Khong mix nhieu style text thu cong khi da co utility class.
- Tieu de chinh uu tien type-display-title hoac type-display-hero.
- Text phu uu tien type-body-muted.
- Nut compact trong list/table/context menu uu tien type-button-sm.
- Badge/status/count uu tien type-badge.

## 4. Responsive
- Type scale responsive da duoc khai bao trong frontend/src/index.css:
  - Mobile (max-width: 767px)
  - Desktop lon (min-width: 1280px)
- Khi them component moi, uu tien dung utility class thay vi custom size rieng.

## 5. Contrast
- Mau text phu su dung token:
  - --text-muted
  - --text-subtle
- Khong dat mau xam tuy y neu khong can thiet; uu tien token de dong bo.

## 6. Checklist truoc khi merge UI
- Heading da dung dung utility class chua?
- Nut nho va badge da dong bo chua?
- Mobile va desktop co giu hierarchy doc duoc khong?
- Co text nao qua nhat/qua dam lam roi hierarchy khong?
