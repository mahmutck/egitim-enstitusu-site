# Psikolojik Araştırmalar Enstitüsü — Web Sitesi

Next.js 16 (App Router, TypeScript, Tailwind CSS 4) ile hazırlanmış, TR/EN dil
desteği olan kurumsal web sitesi. Marka logosuna göre lacivert–altın renk
paleti kullanılmıştır. Ödeme/online satış yoktur; başvurular form + WhatsApp
üzerinden alınır.

## Sayfalar
- `/tr`, `/en` — Ana sayfa
- `/hakkimizda` — Kurum tanıtımı, misyon/vizyon, şeffaflık notu
- `/programlar` — 3 program: Biosomatik, Hipnosomatik, Hipnoz Uygulayıcı Sertifika Programı
- `/programlar/[slug]` — Program detay sayfaları
- `/medya` — Basında Biz (placeholder video alanları)
- `/iletisim` — Başvuru formu (mailto ile gönderim) + WhatsApp butonu

## Yerelde çalıştırma
```bash
npm install
npm run dev
```
Tarayıcıda http://localhost:3000 açılır (otomatik /tr'ye yönlenir).

## Production build
```bash
npm run build
npm run start
```

## Deploy (önerilen: Vercel)
1. Bu klasörü bir GitHub reposuna yükleyin.
2. vercel.com üzerinden "Import Project" ile repoyu bağlayın.
3. Framework otomatik "Next.js" olarak algılanır, ekstra ayar gerekmez.
4. Deploy sonrası kendi alan adınızı (ör. eenstitu.com) Vercel'e bağlayabilirsiniz.

## Yayına almadan önce güncellenmesi gerekenler
- `src/lib/site.ts` — WhatsApp numarası ve Instagram linki (şu an mevcut sitedeki
  bilgilerle dolduruldu, kontrol edin).
- `src/app/[lang]/iletisim/ContactForm.tsx` — form gönderiminde kullanılan
  `info@eenstitu.com` adresi gerçek kurumsal e-postayla değiştirilmeli.
- `src/app/[lang]/iletisim/page.tsx` içindeki adres alanı (`addressNote`) —
  gerçek adres bilgisiyle doldurulmalı (bkz. `src/lib/dictionaries.ts`).
- `src/app/[lang]/hakkimizda/page.tsx` — eğitmen kadrosu (isim, unvan, fotoğraf)
  eklenmeli; şu an genel bir metin var.
- `src/app/[lang]/medya/page.tsx` — placeholder video kutuları gerçek röportaj/
  seminer görselleri ve (varsa) video linkleriyle değiştirilmeli.
- Ana sayfadaki "Katılımcı Yorumları" bölümü — gerçek yorumlarla doldurulmalı
  (şu an yer tutucu not gösteriyor, sahte yorum eklenmedi).
- Çalışma saatleri `src/lib/dictionaries.ts` içinde `contact.hoursWeekday...`
  alanlarında; mevcut sitedeki saatlerle (Pzt–Cum 09:00–17:00) dolduruldu, gerekirse
  güncelleyin.

## Teknik notlar
- Tüm metinler `src/lib/dictionaries.ts` içinde TR/EN olarak tutulur.
- Programlar `src/lib/programs.ts` içinde tanımlıdır; yeni program eklemek için
  bu diziye yeni bir obje eklemeniz yeterlidir, sayfalar otomatik oluşur.
- Görseller `public/images/` altındadır (logo.png, logo-white.png, favicon.png).
- Bu sürümde online ödeme/e-ticaret altyapısı yoktur; ileride sertifika
  programlarını online satışa açmak isterseniz iyzico/PayTR gibi bir Türkiye
  ödeme altyapısı entegre edilebilir.
