# Gece raporu (18–19 Ekim 2026)

Sen bilgisayardan uzaktayken autogear üzerinde yapılan işin özeti. Her adımın ayrıntısı ve ölçümleri `docs/gece-gunlugu.md` dosyasında. İki bölüm var: ilk bölüm, sonra sen "devam et, limiti önemseme" deyince ikinci bölüm.

## Kısaca

- **18 geliştirme yapıldı**, hepsi `gelistirme` dalında (dal: ana sürüme karışmadan değişikliklerin denendiği ayrı kopya). Dal GitHub'a gönderildi. **Ana sürüme (`main`) hiçbir şey gönderilmedi**, `C:\gearbox` klasörüne dokunulmadı; kurulu autogear'ın değişmedi.
- Her geliştirmeden sonra bütün testler iki Claude Code sürümünde (2.1.299 ve 2.1.295) geçti: başta 173 test, sonda 206. `claude plugin validate` (eklentinin kurallara uyup uymadığını kontrol eden komut) her seferinde uyarısız geçti.
- **Canlı deneme geçti:** dalın kodu gerçek Claude Code'da üç seçimi de (Haiku, Opus, Sonnet) doğru uyguladı.
- **En önemli dürüst sonuç:** kuralları hiç görmemiş bir modelin yazdığı, benim hiç bakmadığım yeni 191 mesajda, autogear'ın kararı (kurallar + Haiku) başlangıçla **aynı** kaldı: ne iyileşti ne kötüleşti. Uzun görev metinlerinde ise (dış ölçütün hiç bakılmamış yarısı, 350 görev) belirgin iyileşti: tam isabet %29 → %35, bir kademe içinde %76 → %85, gereğinden pahalı tahmin 218 → 192. Ayrıntı aşağıda.
- Harcama (liste fiyatıyla): Haiku ölçümleri yaklaşık $0,23, Sonnet'e yazdırılan yeni mesaj setleri $0,66, canlı deneme $0,15; toplam yaklaşık **$1,05**. Bu oturumun kendisi de kotandan harcadı: son bakışta 5 saatlik limit %67, haftalık %69 doluydu.

## Terimler

- **Sınıflandırıcı:** autogear'ın mesajına bakıp işin zorluğuna not veren kısmı. Not ("kademe"): T0 önemsiz, T1 rutin, T2 standart, T3 zor, T4 kritik. Önce elle yazılmış kurallara bakar; emin değilse Haiku'ya sorar. **Kurallar emin olursa Haiku'ya hiç sorulmaz**, yanlışsa düzeltecek kimse yoktur.
- **Alt sınır:** Haiku daha düşük bir not verse bile inilmeyecek en düşük not.
- **Ciddi hata:** zor bir işi çok düşük kademeye koymak (zayıf modele vermek).
- **Tüketilmiş set:** kurallar ayarlanırken içine bakılmış ölçüm seti; sonrasındaki başarısı dürüst ölçüm sayılmaz.

## Ne yapıldı

**Gerçek mesajlarından gelen düzeltmeler** (16–18 Ekim'in 98 mesajı ve 1.398 gerçek mesajının bütün kelimeleri tek tek tarandı):

| # | Ne düzeldi | Gerçek örnek |
|---|---|---|
| 1 | "Baştan dikkatlice oku, düzelt", "gözden geçir", "review" en az T2 | "readmeyi bence en baştan tekrar oku daha detaylı…" Haiku'ya gidiyordu |
| 3 | İş isteyip "anlat" diye biten mesaj kesin soru (T0) değil | "sürümü artır, kurulu kopyayı güncelle, nasıl deneyeceğimi anlat" |
| 4 | "Evet, pushla." önemsiz iş | önceki T3 işin notunu taşıyordu |
| 5 | "incelemede", "gözden geçirildi" istek değil | "hâlâ incelemede olduğu için hiçbir şey pushlamıyoruz" |
| 6 | PowerShell'de çalışan test, commit ve push da sayılıyor | Windows'ta "başarısız test sonrası bir kademe yukarı" ve "temiz sohbet önerisi" hiç çalışmıyordu |
| 7 | Önemsiz bir mesajdan sonra "devam" en az T1 | "sonraki adımı uygula" kesin T0 alıyordu |
| 8 | "README'deki hataları düzelt" metin düzeltme, pahalı "hata avı" değil | 'dengeli' profilde Opus · high'a gidiyordu |
| 9 | "dönüyor" (geri veriyor) "donuyor" (donma) değil | "500 hatası dönüyor" donma sanılıyordu |
| 10 | "neden çok…", "neden bu döngü" hata avı değil | "bu klasörde neden çok dosya var?" kesin T3'tü |
| 11 | Süre sözü yalnız bir arızayla birlikte "tekrarlayan başarısızlık"; "olup olmadığını", "yanlışlıkla", "planladığım" şikâyet ya da plan değil | "merhaba yaklaşık 3 gündür görüşmüyoruz" kesin T4'tü (en pahalı model) |
| 15 | İş başlatan bir sözün yanındaki "commit" ya da soru kesin T0 değil | "önerdiğin sırayı baştan sona uygula sonrasında commit et" Haiku'ya gidiyordu |

**Başka bir modelin yazdığı setten gelen düzeltmeler (12):** Sonnet'e yalnız kademe tanımlarını verip (kuralları değil) 239 gerçekçi mesaj yazdırdım. Kurallar orada 12 ciddi hata yapıyordu. Düzeltilen türler: "rengini maviden yeşile çevir" gibi değer değişikliğinin "geçiş" sanılması; "40 kadar dosya var" gibi sayılmış geniş işin tanınmaması; "last two attempts" gibi sayılı denemelerin tanınmaması; "idk whats going on" sözünün kesin soru sayılması; bir commit mesajı isteğinin içindeki açıklama yüzünden özellik sayılması. O sette ciddi hata 12'den 2'ye indi. Ama o set artık tüketildi, bu yüzden dürüst ölçüm için ikinci bir set yazdırdım (aşağıda).

**Emin olup sık yanılan iki kuralın Haiku'ya bırakılması (13, 14):** kuralların emin olduğu kararları gerekçeye göre saydım. "Çok parçalı özellik" (kesin T4) 7 mesajın yalnız 2'sinde doğruydu: bir sayfalama isteğindeki "page, pagination, endpoint" ayrı özellik sayılıyordu. "Kapsamlı iş" de 11'in 3'ünde fazlaydı. İkisi artık "emin değil" (Haiku karar veriyor, alt sınır T2 ve T3). Haiku ile kendi setlerinde doğru 2/9 → 9/9 ve 13/16 → 15/16.

## Ölçümler (önce/sonra)

- **Eski etiketli setler** (2.541 mesaj: dev, holdout, fresh, gerçek kullanım tekrarı, sekiz dil, held, held2, blind, blind2 ve yeniler): bütün gece boyunca hiçbir sette kötüleşme kalmadı. Üç değişikliğin ilk denemesi bir sette kötüleşme verdi (8, 11, 15); üçü de düzeltildi, nedenleri günlükte.
- **Dürüst ölçüm 1, blind4** (Sonnet'in yazdığı, hiç bakmadığım 191 mesaj, sekiz dil; ayar yapılmadı):
  - kurallar tek başına: tam isabet 120 → 121, ciddi hata 9 → 9;
  - kurallar + Haiku (autogear'ın gerçekte yaptığı): tam %69 → %69, bir kademe içinde %97 → %97, ciddi 2 → 2.
  - **Okuma:** kural düzeltmeleri yeni yazarların cümlelerine genellenmiyor; genel başarıyı Haiku taşıyor. Düzeltmelerin faydası, kuralların emin olup yanıldığı dar ama sık türlerde (gerçek kullanımında görülenler).
- **Dürüst ölçüm 2, dış ölçütün saklı yarısı** (SWE-bench ve Terminal-Bench'ten 350 uzun görev; kurallar yazılırken hiç bakılmayan yarı), kurallar + Haiku: tam %29 → **%35**, bir kademe içinde %76 → **%85**, gereğinden yüksek tahmin 218 → **192**, ciddi hata 5 → 6 (%1,7; hedef en çok %2). Bedeli: Haiku'ya daha sık soruluyor (%27 → %43; her soru yaklaşık $0,0002–0,0008).

## Ölçülüp yapılmayanlar

- **Yardımcıları (alt ajanları) ucuz modele dağıtmak:** bütün kayıtlarında yardımcılar harcamanın **%1,4'ü**. Değmez; yapılmadı.
- **Danışmanı (advisor) istek başına açmak:** Mod API'si (eklentinin Claude Code'la konuştuğu arayüz) izin vermiyor. Yapılmadı.
- **Fiilsiz özellik sözünü "emin değil" yapmak** ("giriş yaptım" gibi): denendi, geri alındı. Tasarruf ve dengeli profilde T1 ve T2 aynı modele gidiyor, yani yalnızca fazladan Haiku sorusu ekliyordu.

## Bulunan ama düzeltilmeyen sorunlar

1. "Sadece not al" diye biten uzun not listeleri hâlâ yüksek çıkabiliyor (artık Haiku'ya soruluyor ama alt sınır T2).
2. Haiku, "yarın başlarız", "bunu kullanıcaz" gibi sözlere önceki işin notuna bakıp T3 diyor. Düzeltmek Haiku'ya sorulan soru metnini (RUBRIC) değiştirmek demek; bu eski bütün Haiku ölçümlerini geçersiz kılar.
3. "Why does this return null here? the code looks fine" gibi sorular hâlâ kesin hata avı.
4. İçinde "test" ya da "build" geçen her komut "kontrol" sayılıyor; kayıtlarda sonucu hiç etkilemedi.
5. Bir eğik çizgi komutunda (skill) autogear komutun asıl içeriğini değil, yazılan satırı sınıflıyor.
6. PowerShell kancası gerçek bir PowerShell komutunda canlı denenmedi (sahte motorla test edildi).

## Üçüncü bölüm (kullanıcı "aynen devam et" dedi)

| # | Ne yapıldı | Sonuç |
|---|---|---|
| 16 | `/gear share`: son işaretli ya da şüpheli kararı, mesajının kelimeleri olmadan, GitHub'daki "yanlış seçim" kaydına yapıştırılacak bir blok olarak verir (adım 18b) | GitHub formu bu bloğu istiyor; hiçbir şey gönderilmez |
| 17 | Kendi günlüğünden öğrenme (adım 18a): bir kural sende en az 3 kez ve kararlarının dörtte birinde yanlış çıkarsa artık emin sayılmaz, Haiku'ya da sorulur | Senin günlüğünde bugün hiçbir yanlışlık işareti yok, yani henüz hiçbir şey öğrenilmez; `/gear wrong` kullandıkça çalışır |
| 18 | Konuşulan, varsayılan ya da yapıştırılan model adı artık senin seçimin sayılmıyor | Günlüğündeki 3 "elle seçim"in 3'ü de yanlıştı; biri ("neden hep max eforla çalışıyor?") turu Opus · max'a göndermişti. Gerçek mesajlarında elle seçim sayılan 7 → 2, ikisi de gerçek istek |
| — | PowerShell desteği canlı denendi | Ana sürümün kodu PowerShell'de başarısız testi görmüyordu, bu dalın kodu görüyor |

Testler: 2.1.299 ve 2.1.295'te 211/211; `validate` uyarısız; 2.541 etiketli mesajda sınıflandırma değişmedi.

## Senin vermen gereken kararlar

1. **Dalı ana sürüme katmak:** dizin incelemesi bitince. Bütün geliştirmeler katılmaya hazır. Dikkat: PowerShell desteği eklentinin bağlandığı olay listesine yeni bir satır ekliyor; ana sürüme girince dizin taraması bunu görür (README'de yazıyor).
2. **Sürüm numarası:** katarken 0.13.0 öneririm.
3. **Sıradaki yön:** kurallara kelime eklemenin getirisi azaldı (dürüst ölçüm 1). Daha büyük kazanç için iki yol var: (a) kuralların emin olduğu kararları ölçüp sık yanılanları Haiku'ya bırakmaya devam etmek (bu gece iki kural için yapıldı, iyi sonuç verdi); (b) Haiku'ya sorulan soruyu iyileştirmek. (b) eski ölçümleri geçersiz kılar, senin kararın.
4. **Kendi gözünle doğrulama:** dal kurulduktan sonra birkaç gün gölge modda kullan, `/gear log` ile bak.

## Başvuru durumu

Portala bakmadım (giriş gerektiriyor, tıklama yasaktı). Bildiğim son durum: 0.12.2, `main` @ e8ca8b4, incelemede. `main`'e bu gece hiçbir şey gönderilmedi.
