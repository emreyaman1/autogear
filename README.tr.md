# gearbox

[English](README.md) · **Türkçe**

Claude Code için otomatik vites. Her mesajda modeli (Haiku, Sonnet ya da Opus) ve eforu işin zorluğuna göre seçer, sağ alttaki model seçicinin üstüne asla çıkmaz ve bunun neyi kurtardığını sayar. Limitin daha uzun sürer, zor işler yine güçlü modelle yapılır.

> Durum: 0.5.0. Claude Code'un **early access** eklenti (function hooks) API'si üzerine kurulu; o API sürümler arasında değişebilir. Aşağıdaki güvenlik ağları bu yüzden var.

## Ne sağlar

- **Mesaj başına doğru model.** "Bu fonksiyon ne yapıyor" Haiku · low ile, net ve tek yerlik bir değişiklik Sonnet · medium ile, belirsiz bir hata ya da mimari sorusu Opus ile çalışır.
- **Seçicinin üstüne çıkmaz.** Seçiciyi bir kez en güçlü modeline getirirsin; gearbox ona eşit ya da altında seçer.
- **Bir anahtar.** İstem kutusunun üstündeki satır gearbox'ın açık olup olmadığını gösterir; yanındaki ON / OFF anahtarına tıklarsın.
- **Her cevap kendini açıklar.** Altındaki satır cevap veren model ve eforu, kademeyi ve nedenini, bir de turun seçici modeline göre ne tuttuğunu söyler:

  ```
  ⚙ Haiku 5.5 · low · T0 önemsiz (kural: soru: "ne yapiyor") · önbellek 0 okundu / 100.0K yazıldı · $0,013 (seçici modeliyle $0,020)
  ```
- **Tasarruf sayacı.** Sağ alttaki durum yazısında oturumun tasarrufu görünür, ayrıntı için `/gear tasarruf` bir kart çizer.

## Kurulum

Claude Code'da:

```
/plugin install gearbox --marketplace emreyaman1/gearbox
```

Sonra seçiciyi bir kez en güçlü modeline getir (örneğin **Opus · high**). Kurduktan sonra yeni bir sohbet aç; zaten açık olan sohbetler yeni eklentileri yüklemez.

Yerel bir kopyadan kurmak için, bir terminalde:

```bash
claude plugin marketplace add C:\gearbox
```

```bash
claude plugin install gearbox@gearbox
```

Kurulumdan sonra açtığın her Claude Code oturumunda (masaüstü uygulaması dahil) çalışır. Eklenti function hooks özelliği olan bir Claude Code sürümü ister (2.1.295'e kadar denendi).

## Kullanım

**Seçici tavandır.** gearbox, seçicideki model ve eforun üstünde harcama yapmaz. Seçiciyi değiştirdiğinde yeni tavanı bildirir. Seçici **Opus · high** iken tam otomatiktir.

**Aç/kapa satırı.** İstem kutusunun üstündeki küçük satır gearbox'ın açık olup olmadığını gösterir. **ON / OFF anahtarı** (açıkken yeşil ve topuz sağda, kapalıyken gri ve topuz solda) gearbox'ı kapatır ve açar. Kapalıyken her istek, seçici ne diyorsa tam olarak onunla gider. Sağ alttaki durum yazısı son mesaj için seçilen model ve eforu, bir de oturumun tasarrufunu gösterir.

**Etiketler.** Mesajın başına yazılan etiketler o mesaj için seçimi belirler ve modele gitmeden silinir: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). `ultrathink` T4 demektir.

**Komutlar.**

| Komut | İş |
|---|---|
| `/gear` | durum, son karar ve gerekçesi, limitler, istatistik, bu liste |
| `/gear tasarruf` | tasarruf kartı (aşağıda) |
| `/gear kayit` | gearbox'ın son kararlarının günlüğü ve şüpheli olanlar |
| `/gear yanlis zayif\|fazla` | son kararı işaretle: model çok zayıftı, ya da işin gerektirdiğinden güçlüydü |
| `/gear sifirla` | tasarruf sayacını ve günlüğü sıfırla |
| `/gear oto` / `/gear sabitle` | gearbox'ı aç / kapat (kapalıyken seçicideki model kullanılır) |
| `/gear profil tasarruf\|dengeli\|kalite` | hangi kademe tablosu kullanılsın |
| `/gear haiku aç\|kapa` | önemsiz işler Haiku'ya gitsin mi |
| `/gear sor aç\|kapa` | kurallar emin olamazsa Haiku'ya sorulsun mu |
| `/gear not aç\|kapa` | cevabın altındaki satır |
| `/gear bant aç\|kapa` | istem kutusunun üstündeki aç/kapa satırı |

## Nasıl çalışır

```
mesaj ─► sınıfla ─► karar  ─► uygula    ─► cevap ─► doğrula       ─► say
         signals    tiers     turn.step             turn.complete    savings
         llm        policy                                           prices
                    pacing
```

1. **Sınıflandırma** (`hooks/core/signals.ts`): Mesaj T0–T4 kademelerinden birine konur. Türkçe ve İngilizce sinyaller okunur; mesajdaki kod, dosya ve değişken adları dikkate alınmaz. Fiil tek başına değil nesnesiyle değerlendirilir ("rengi değiştir" ≠ "ödeme sistemi ekle"). Kurallar emin olamazsa Haiku'ya tek kısa bir soru sorulur (`hooks/core/llm.ts`).
2. **Karar** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): Kademe, profil tablosundan model ve efora çevrilir, sonra üç sınırdan geçer:
   - **Tavan:** Seçicideki model ve efor aşılmaz.
   - **Önbellek:** Bağlam büyükse (40K+ token) bir kademelik farklar için model değiştirilmez, yalnızca efor değişir; model geçişi bütün konuşmayı önbelleksiz yeniden gönderir.
   - **Tempo:** 5 saatlik ya da haftalık limit eşit hızın üstünde harcanıyorsa (%30'dan fazlası kullanılmış ve beklenenin 20 puan önünde) efor bir kademe iner; %90'da Opus kullanılmaz. Bir pencere bitmeye yakınsa ve yarısı bile kullanılmadıysa, standart ve üstü işlerde efor bir kademe çıkar.
3. **Uygulama** (`hooks/register.tsx`, `turn.step`): Her model isteğinden hemen önce kararı uygular. Bir turun bütün istekleri aynı modelle gider, böylece tur önbelleğini korur. Alt ajanlara dokunulmaz.
4. **Doğrulama** (`turn.complete`): API'nin bildirdiği gerçek model, seçimle karşılaştırılır (bkz. Güvenlik ağları).
5. **Sayım** (`hooks/core/savings.ts`): Turun gerçek token sayısı iki kez fiyatlanır, bir kez cevap veren modelde, bir kez seçicideki modelde, ve oturumun ile genel toplama eklenir.

| Kademe | Örnek | `tasarruf` (Pro) |
|---|---|---|
| T0 önemsiz | "bu fonksiyon ne yapıyor", commit mesajı, yeniden adlandırma | Haiku · low |
| T1 rutin | net, tek yerlik değişiklik | Sonnet · medium |
| T2 standart | özellik, test yazma, hata çıktılı debug | Sonnet · high |
| T3 zor | belirsiz hata, mimari, performans, güvenlik | Opus · medium |
| T4 kritik | çok adımlı büyük iş, tekrarlayan başarısızlık | Opus · high |

Profiller: `tasarruf` (Pro için), `dengeli` ve `kalite` daha cömert harcar, Max planları içindir.

## Kararlarını gözden geçirme

Aşağıdaki sınıflandırma rakamları bizim yazdığımız etiketlerle ölçüldü. Kendi işlerinde gearbox'ın nasıl yaptığını görmek için kararlarının günlüğünü makinende tutar: her mesajın başı (100 karakter), kademe, cevap veren model ve efor, seçimin kaynağı, turun maliyeti ve sonrasında ne olduğu. Son 200 karar saklanır.

- `/gear kayit` son 25 kararı tablo olarak, kullanılan kademeleri ve **şüpheli kararları** gösterir: işin kendisinin sorguladığı kararlar (şikâyet ettin ve gearbox bir kademe yükseltti; turun sonunda testler ya da derleme kırıktı) ve senin işaretlediklerin.
- Bir karar yanlışsa cevaptan hemen sonra söyle: `/gear yanlis zayif` (model çok zayıftı) ya da `/gear yanlis fazla` (işin gerektirdiğinden güçlüydü). İşaret son mesaja düşer.
- Şüpheli oranı bir tabandır: kimsenin fark etmediği yanlış seçimler sayılmaz. Birkaç günlük kullanımla kuralların hangi tür mesajlarda yanıldığını gösterir, bir sonraki ayar da orada.
- `/gear sifirla` günlüğü siler. Makinenden hiç çıkmaz.

## Tasarruf

**Nerede görünür.**

- Her cevabın altındaki satır: bu turun tutarı ve seçici modeliyle ne tutacağı.
- Sağ alttaki durum yazısı: oturumun toplam tasarrufu.
- `/gear tasarruf`: konuşmanın içine çizilen bir kart:
  - iki çubuk, bu oturumun ve toplamın tasarrufu, her biri seçicinin faturasındaki payıyla;
  - her modelin payı, çubuk ve açıklamayla;
  - modele göre tablo: tur, girdi, çıktı, önbellek okuma, önbelleğe yazma, önbellek isabeti, harcama, seçici modeliyle harcama, tasarruf;
  - 5 saatlik ve haftalık limit pencereleri.

  Dar ekranda tablo, model başına tek satıra döner. Bir yüzey kartı çizemiyorsa aynı rakamlar markdown tablo olarak gelir. İkisi de aynı kayıtlı toplamları okur.
- `/gear sifirla` sayımı baştan başlatır. Toplamlar makinendeki eklenti deposunda durur; sayımın başladığı tarih kartta yazar.

**Nasıl hesaplanır.** Her turun gerçek token sayıları (girdi, çıktı, önbellek okuma, önbellek yazma) cevap veren modelin liste fiyatıyla çarpılır; aynı tokenlar bir de seçicideki modelin liste fiyatıyla çarpılır. Fiyatlar `hooks/core/prices.ts` içindedir:

| Model | Girdi | Çıktı | Önbellek okuma | Önbellek yazma (5 dk) |
|---|---|---|---|---|
| Haiku 5.5 | $0,10 | $0,50 | $0,01 | $0,125 |
| Sonnet 5.5 | $2 | $10 | $0,20 | $2,50 |
| Opus 5.5 | $4 | $20 | $0,20 | $5 |
| Fable 5.1 | $10 | $50 | $0,25 | $12,50 |

Milyon token başına dolar. 100K tokendan uzun bir Haiku isteği beş kat tutar.

**Bu bir tahmindir.**

- Abonelikte dolar ödemezsin; kota kabaca bu oranda tükenir.
- Model değiştiren tur önbelleğini yeniden yazmıştır. Seçici modelinde o önbellek sıcak kalacaktı, bu yüzden oradaki yazmalar okuma fiyatından sayılır: geçişin maliyeti gearbox'ın aleyhine yazılır.
- Düşük efor daha az token üretir. Bu fark hesaba katılmaz, tasarruf biraz düşük çıkabilir.
- gearbox'ın kendi Haiku sorularının maliyeti tasarruftan düşülür. Alt ajanlar sayılmaz.

## Güvenlik ağları

- **Kendini denetleme:** Her turdan sonra API'nin bildirdiği gerçek modele bakar. Seçtiği model üst üste 3 tur uygulanmazsa (bir Claude Code güncellemesi eklenti API'sini değiştirmişse) kendini kapatır ve haber verir; `/gear oto` yeniden dener.
- **Yedek model:** Seçilen model yanıt vermezse (kimliği eskimiş, planında yok) istek seçicideki modelle yeniden gönderilir, o model o oturumda bir daha seçilmez.
- **Kartopu freni:** Ucuz bir modelle yapılan tur, testleri ya da derlemesi kırık bitmişse bir sonraki tur bir kademe güçlü modelle yapılır. "Olmadı", "hâlâ aynı hata" gibi şikâyetler de kademeyi yükseltir; üst üste ikinci şikâyette iki kademe.
- **Sürüm uyarısı:** Claude Code, gearbox'ın denendiği sürümden (`hooks/core/version.ts`) yeniyse bir kez haber verir.
- **Haftalık uyumluluk testi:** GitHub'da `.github/workflows/compat.yml` her hafta en yeni Claude Code ile doğrulama ve testleri çalıştırır.
- **Canlı duman testi:** `node scripts/smoke.mjs`, üç kısa mesajı gerçekten gönderip modelin değiştiğini API'nin cevabından doğrular (biraz kota harcar).

## Ölçümler

**Sınıflandırma** (`eval/`): 143 etiketli mesaj üç kümede: kuralların ayarlandığı küme (66), ayardan önce ayrılan küme (43), ayarlardan sonra yazılıp bir kez ölçülen yeni küme (34). Etiketler "bu işi hangi güçte model yapmalı" sorusuna göre kondu. Son iki kümenin toplamı (77 mesaj):

| Yöntem | Tam isabet | ±1 kademe | Ciddi hata* | Haiku'ya sorulan |
|---|---|---|---|---|
| Sadece kurallar | %83 | %94 | 4 | %0 |
| Sadece Haiku | %77 | %97 | 0 | %100 |
| **Kurallar + emin değilse Haiku (gearbox)** | **%90** | **%100** | **0** | **%19** |
| Her zaman Haiku, yüksek olan | %74 | %96 | 0 | %100 |

\* Zor bir işi (T3+) T0/T1'e ya da iki kademe aşağı koymak. Not: ayardan önce ayrılan kümenin hataları bir kez görüldü ve yeni kümedeki hatalar "emin değilse sor" eşiğini etkiledi; gerçek isabet bir miktar düşük olabilir.

**Çıktı kalitesi** (`eval/tasks/`): Küçük bir proje üzerinde 6 gerçek görev; her görevin sonucu Claude'un çalışırken görmediği testlerle kontrol edilir.

| Görev | gearbox'ın seçtiği | Sonuç | Maliyet | Opus · high, gearbox'sız |
|---|---|---|---|---|
| 1 Yeniden adlandırma | Haiku | Geçti | $0,011 | Geçti, $0,277 |
| 2 Kargo eşiği | Sonnet | Geçti | $0,173 | — |
| 3 Kupon özelliği ve testleri | Sonnet | Geçti | $0,124 | Geçti, $1,387 |
| 4 Hata mesajıyla verilen sayfalama hatası | Sonnet | Geçti | $0,072 | Geçti, $0,255 |
| 5 İnce kuruş yuvarlama hatası | Opus | Geçti | $0,423 | — |
| 6 İndirimin kargoya da uygulanması | Sonnet | Geçti | $0,099 | Geçti, $0,460 |

İki yolla da denenen 4 görevde gearbox $0,31, hep Opus · high $2,38 harcadı: aynı sonuçla yaklaşık 8 kat ucuz, 8 kat hızlı (73 sn'ye karşı 619 sn). Maliyetler API liste fiyatıyla. Her görev bir kez, küçük bir projede çalıştırıldı: sonuç kesin değil, yön gösterici.

## Proje yapısı

| Yol | İçeriği |
|---|---|
| `hooks/register.tsx` | hooks modülü: olaylar, `/gear` komutu, aç/kapa satırı, kartı çizen kanca |
| `hooks/card.tsx` | tasarruf kartı, Box ve Text'ten bir ağaç |
| `hooks/core/signals.ts` | sınıflandırıcı: kurallar, etiketler, Türkçe ve İngilizce sinyaller |
| `hooks/core/llm.ts` | kurallar emin olamayınca Haiku'ya sorulan soru |
| `hooks/core/tiers.ts` | profiller: kademeden model ve efora |
| `hooks/core/policy.ts` | bir kademeye uygulanan tavan, önbellek ve tempo |
| `hooks/core/pacing.ts` | limit pencerelerini okur |
| `hooks/core/models.ts` | model aileleri, kimlikler, efor seviyeleri |
| `hooks/core/prices.ts` | liste fiyatları ve bir turun maliyeti |
| `hooks/core/journal.ts` | karar günlüğü: kayıtlar, şikâyet ve kırık test işaretleri, senin işaretlerin, rapor |
| `hooks/core/savings.ts` | modele göre toplamlar, tasarruf, markdown rapor |
| `hooks/core/settings.ts` | kayıtlı ayarlar ve istatistik, `/gear` ayrıştırma |
| `hooks/core/switch.ts` | aç/kapa anahtarının çizimi |
| `hooks/core/version.ts` | denendiği en yeni Claude Code sürümü |
| `tests/` | kurallar, politika, fiyat ve tasarruf; sahte motora karşı yönlendirici; sınıflandırıcı ölçümü |
| `eval/` | sınıflandırma ölçümü ve çıktı kalitesi görevleri |
| `scripts/` | canlı duman testi |

## Geliştirme

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

```bash
node eval/haiku.mjs
```

```bash
node eval/tasks.mjs
```

Son ikisi gerçek model çağrısı yapar, biraz kota harcar; Haiku cevapları `eval/.work` altında önbelleğe alınır. `plugin test`, eklenti API'si uyan bir Claude Code sürümü ister (2.1.295 kullanıldı): eski sürümlerde hooks modülü yüklenmez ve yönlendirici testleri başarısız olur.

**Bir değişikliği kendi Claude Code'unda denemek.** Claude Code klasörü değil, eklentinin kurulu bir kopyasını çalıştırır. Düzenledikten sonra `.claude-plugin/plugin.json` içindeki `version` değerini yükselt, sonra:

```bash
claude plugin marketplace update gearbox
```

```bash
claude plugin update gearbox@gearbox
```

Uygulamayı kapatıp aç ve yeni bir sohbet başlat.

**Bir Claude Code güncellemesinden sonra:**

1. `claude plugin test .` ve `node scripts/smoke.mjs` çalıştır.
2. İkisi de geçiyorsa `hooks/core/version.ts` içindeki `TESTED_THROUGH` değerini yeni sürüme çek.
3. Yeni modeller çıktıysa `hooks/core/models.ts` içindeki `MODEL_IDS` tablosunu ve `hooks/core/prices.ts` içindeki fiyat tablosunu güncelle.

## Yol haritası

- [x] Canlı doğrulama, kendini denetleme, yedek model, kartopu freni
- [x] Sınıflandırma ve çıktı kalitesi ölçümleri
- [x] Tur başına maliyet, tasarruf sayacı ve kart
- [x] İngilizce README, MIT lisansı, GitHub'da yayın
- [ ] Alt ajan kuralları: istekleri kancaya ulaşıyor (bir `agentId` taşıyorlar) ve bugün olduğu gibi geçiriliyor; keşif ajanlarını Haiku · low'a vermek sırada, önce kotadaki paylarının ölçülmesi gerekiyor
- [x] Senin işaretlerinle karar günlüğü, kuralların nerede yanıldığını görmek için
- [ ] Bu düzeltmelerden öğrenme

## Lisans

MIT
