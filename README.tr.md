# gearbox

[English](README.md) · **Türkçe**

Claude Code için otomatik vites. Her mesajda modeli (Haiku, Sonnet ya da Opus) ve eforu işin zorluğuna göre seçer, sağ alttaki model seçicinin üstüne asla çıkmaz ve bunun neyi kurtardığını sayar. Limitin daha uzun sürer, zor işler yine güçlü modelle yapılır.

> Durum: 0.8.2. Claude Code'un **early access** eklenti (function hooks) API'si üzerine kurulu; o API sürümler arasında değişebilir. Aşağıdaki güvenlik ağları bu yüzden var.

## Ne sağlar

- **Mesaj başına doğru model.** "Bu fonksiyon ne yapıyor" Haiku · low ile, net ve tek yerlik bir değişiklik Sonnet · medium ile, belirsiz bir hata ya da mimari sorusu Opus ile çalışır.
- **Seçicinin üstüne çıkmaz.** Seçiciyi bir kez en güçlü modeline getirirsin; gearbox ona eşit ya da altında seçer.
- **Bir durum satırı.** İstem kutusunun üstündeki satır gearbox'ın açık mı, gölgede mi, kapalı mı olduğunu gösterir; yanındaki düğmelerin üstünde ne yaptıkları yazar.
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

Kurulumdan sonra açtığın her Claude Code oturumunda (masaüstü uygulaması dahil) çalışır. Claude Code 2.1.295 ya da daha yenisi gerekir (2.1.295 ve 2.1.299'da denendi). Claude Code bir hooks modülünü çalıştırmadan önce kendi eklenti API'siyle karşılaştırır; tanımadığı tek bir olay ya da çağrı varsa modülün tamamını reddeder. Bir eklenti en düşük sürümü de bildiremez. Bu yüzden eski bir sürümde gearbox hiç yüklenmez ve nedenini söyleyemez; 2.1.278 hem 0.7'yi hem 0.8'i reddeder. Masaüstü uygulaması kendi güncel Claude Code'unu getirir; terminale ayrıca kurulmuş bir `claude` daha eski olabilir (`claude --version`, `claude update`).

## Kullanım

**Seçici tavandır.** gearbox, seçicideki model ve eforun üstünde harcama yapmaz. Seçiciyi değiştirdiğinde yeni tavanı bildirir. Seçici **Opus · high** iken tam otomatiktir.

**Durum satırı.** İstem kutusunun üstündeki küçük satır gearbox'ın ne yaptığını gösterir: bir etikette **AÇIK** (yeşil), **GÖLGE** (mor), **KAPALI** (gri) ya da **DURDU** (turuncu; bkz. Güvenlik ağları) yazar. Etiketteki nokta gearbox'ın ne yaptığını hafifçe hareket ederek söyler: seçerken yumuşak bir nabız, gölgede yavaş bir nefes, kapalıyken durgun, durmuşken yavaş yanıp sönme; sisteminde "hareketi azalt" açıksa kıpırdamaz. Yanında son seçim durur ("Sonnet · medium · T1 rutin"; gölgede gearbox'ın önerisi), henüz seçim yoksa durumun ne demek olduğu. Yanındaki düğmeler öteki durumlar içindir ve her birinin üstünde basınca ne olacağı yazar: **aç**, **gölgeye al**, **kapat**; durmuşsa **yeniden dene**. Kapalıyken her istek, seçici ne diyorsa tam olarak onunla gider. Sağ alttaki durum yazısı son mesaj için seçilen model ve eforu, bir de oturumun tasarrufunu gösterir. Bir limit penceresi dolmak üzereyken ya da çok hızlı harcanırken satırda bir de uyarı görünür (aşağıda Tempo).

**Gölge mod.** `/gear golge` ile gearbox seçer ama seçimini uygulamaz: her istek seçici ne diyorsa onunla gider, gearbox da ne seçeceğini her cevabın altına (`⚙ gölge: Haiku · low · T0 önerirdi · cevap: Opus 5.5`) ve günlüğüne yazar. Seçici burada da tavandır; seçimi kırptıysa ikisi de yazılır: `⚙ gölge: Sonnet · high · T3 zor önerirdi, tavan olmasa Opus · medium`. Böylece seçici Sonnet'teyken de Opus ihtiyacı görünür. Yeni bir sürüm böylece gerçek iş üzerinde, o işe dokunmadan denenir; `/gear yanlis` seçimlerini yine işaretler. `/gear oto` yönlendirmeyi geri açar.

**Plan modu.** Claude Code'un plan modunda her istek Opus'a gider; efor, kuralların okuduğu plan büyüklüğüne göre seçilir: küçük planda medium, ortada high, çok parçalı büyük planda xhigh. Seçicinin üstüne asla çıkmaz; senin adını verdiğin model (`+sonnet`) yine önde gelir. gearbox plan modunu Claude Code'un model için eklediği nottan anlar; bu yüzden bir cevabın ortasında açılan plan modu bir sonraki mesajdan itibaren sayılır. Plan modu dışında da plan isteyen bir mesaj ("plan çıkar", "nasıl yapalım", "yol haritası", "plan the migration") zor iş (T3) sayılır. Cevabın altındaki satırda ve günlükte `plan modu` yazar.

**Etiketler.** Mesajın başına yazılan etiketler o mesaj için seçimi belirler ve modele gitmeden silinir: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). `ultrathink` T4 demektir.

Ya da düz yazıyla söyle: "bu görevi sonnet'e max ile ver", "opus ile yap", "opus, sen de bak", "use opus" o mesaj için modeli, adı geçiyorsa eforu da seçer. Bir model hakkında konuşmak ("haiku ile yaptı", "opus pahalı mı?") bir şey seçmez. Yazıyla yapılan seçim de, etiket gibi, seçicinin üstüne çıkabilir.

**Komutlar.**

| Komut | İş |
|---|---|
| `/gear` | durum, son karar ve gerekçesi, limitler, istatistik, bu liste |
| `/gear tasarruf` | tasarruf kartı (aşağıda) |
| `/gear kayit` | gearbox'ın son kararlarının günlüğü ve şüpheli olanlar |
| `/gear yanlis zayif\|fazla` | son kararı işaretle: model çok zayıftı, ya da işin gerektirdiğinden güçlüydü |
| `/gear sifirla` | tasarruf sayacını ve günlüğü sıfırla |
| `/gear oto` / `/gear sabitle` | gearbox'ı aç / kapat (kapalıyken seçicideki model kullanılır) |
| `/gear golge` | gölge mod: seç ve yaz, hiçbirini uygulama |
| `/gear profil tasarruf\|dengeli\|kalite` | hangi kademe tablosu kullanılsın |
| `/gear haiku aç\|kapa` | önemsiz işler Haiku'ya gitsin mi |
| `/gear sor aç\|kapa` | kurallar emin olamazsa Haiku'ya sorulsun mu |
| `/gear not aç\|kapa` | cevabın altındaki satır |
| `/gear bant aç\|kapa` | istem kutusunun üstündeki durum satırı |

## Nasıl çalışır

```
mesaj ─► sınıfla ─► yerleştir ─► karar  ─► uygula    ─► cevap ─► doğrula       ─► say
         signals    settle       tiers     turn.step             turn.complete    savings
         llm                     policy                                           prices
                                 pacing
```

1. **Sınıflandırma** (`hooks/core/signals.ts`): Mesaj T0–T4 kademelerinden birine konur. Türkçe ve İngilizce sinyaller okunur; mesajdaki kod, dosya ve değişken adları dikkate alınmaz. Fiil tek başına değil nesnesiyle değerlendirilir ("rengi değiştir" ≠ "ödeme sistemi ekle"). Claude Code'un mesajın önüne koyduğu notlar okunmaz, selamlaşma doğrudan T0'dır, hiçbir şey yazılmamış bir mesaj (yalnızca görsel) son seçimle devam eder. Kurallar emin olamazsa Haiku'ya tek kısa bir soru sorulur (`hooks/core/llm.ts`).
2. **Yerleştirme** (`hooks/core/settle.ts`): Haiku mesajı tek başına okur, ekran görüntüsünü ya da etrafındaki işi görmez; bu yüzden cevabı kuralların gördüğünden en çok bir kademe aşağı inebilir, bir şeyi incelemeyi isteyen mesajda T2'nin altına inmez. T2 ve üstü bir işin ortasındaki mesaj (bir soru, bir açıklama, yalnızca Haiku'nun yerleştirebildiği bir mesaj) o işin en çok bir kademe altına iner; kuralların emin olduğu yeni iş, commit gibi bir angarya ya da selamlaşma baştan başlar.
3. **Karar** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): Kademe, profil tablosundan model ve efora çevrilir, sonra iki sınırdan geçer ve limit pencerelerine bakılır:
   - **Tavan:** Seçicideki model ve efor aşılmaz.
   - **Önbellek:** Bağlam büyükse (40K+ token) bir kademelik farklar için model değiştirilmez, yalnızca efor değişir; model geçişi bütün konuşmayı önbelleksiz yeniden gönderir. Sıcak önbellek daha zor bir işi asla Haiku'da tutmaz.
   - **Tempo:** Limit penceresi modeli ya da eforu asla düşürmez: işin başarıyla bitmesi limitten önemli. 5 saatlik ya da haftalık limit %90'ı geçtiyse ya da eşit hızın üstünde harcanıyorsa (%30'dan fazlası kullanılmış ve beklenenin 20 puan önünde), bunun yerine cevabın altındaki satırda ve durum satırında uyarı çıkar (`⚠ 5 saatlik limit %92: bu iş Opus · high ile yapılıyor, limit dolabilir`). Bir pencere bitmeye yakınsa ve yarısı bile kullanılmadıysa, zor ve kritik işlerde (T3 ve üstü) efor bir kademe çıkar; max'a kadar çıkmaz, seçicinin üstüne de çıkmaz. Standart işe dokunulmaz: kademe tablosunun dayandığı ölçümlerde net anlatılmış işte fazla efor işe yaramadı.
4. **Uygulama** (`hooks/register.tsx`, `turn.step`): Her model isteğinden hemen önce kararı uygular. Bir turun bütün istekleri aynı modelle gider, böylece tur önbelleğini korur. Alt ajanlara dokunulmaz.
5. **Doğrulama** (`turn.complete`): API'nin bildirdiği gerçek model, seçimle karşılaştırılır (bkz. Güvenlik ağları).
6. **Sayım** (`hooks/core/savings.ts`): Turun gerçek token sayısı iki kez fiyatlanır, bir kez cevap veren modelde, bir kez seçicideki modelde, ve oturumun ile genel toplama eklenir.

| Kademe | Örnek | `tasarruf` (Pro) |
|---|---|---|
| T0 önemsiz | "bu fonksiyon ne yapıyor", commit mesajı, yeniden adlandırma | Haiku · low |
| T1 rutin | net, tek yerlik değişiklik | Sonnet · medium |
| T2 standart | özellik, onun testleri, hata çıktısı elde olan debug | Sonnet · medium |
| T3 zor | mimari, performans, güvenlik, seçenekler arasında karar | Opus · medium |
| T3 belirsiz hata avı | ayrıntısız anlatılmış hata ("bu çalışmıyor, düzelt"): hata çıktısı, dosya, sayı, ne zaman olduğu ve ekran görüntüsü yok | Opus · high |
| T3 yeri belli hata avı | açık anlatılmış ama sebebi saklı hata (bazen olup bazen olmayan, sebebinden uzakta görünen), henüz kimsenin bulmadığı hataları yakalayacak test yazma | Sonnet · high (T4'te xhigh) |
| T4 kritik | çok adımlı büyük iş, tekrarlayan başarısızlık | Opus · high |

Profiller: `tasarruf` (Pro için), `dengeli` ve `kalite` daha cömert harcar, Max planları içindir. Her profilde net anlatılmış rutin ve standart iş Sonnet · medium ile, belirsiz hata avı Opus · high ile, yeri belli olanı Sonnet · high ile çalışır; hiçbir kademe sen istemedikçe (`+max`, "max ile") max ile çalışmaz. Dayanağı: gerçek Python projelerinde gizli testlerle yapılmış açık bir ölçümde (Forn AI, 4 Ekim 2026) Sonnet · medium yeri belli 13 hatanın 13'ünü Opus · high'ın üçte bir maliyetine çözdü, net işte Sonnet'in eforunu artırmak işe yaramadı; hata çıktısının yanlış dosyayı gösterdiği hatada Opus · high 6/6, Sonnet · medium 4/6, aynı hata belirsiz anlatılınca Sonnet 0/2; 22 gizli hatayı yakalaması gereken test yazımında Opus · high 22/22, Sonnet 16–19. Bunların bir kısmı 2–6 denemeye dayanıyor; tablo bir başlangıç, gearbox'ın kendi kıyas ölçümü doğrulayacak. O kıyasta (Ölçümler) Sonnet · medium, Opus · high'ın geçtiği her hata avını geçti; bu yüzden yeri belli hata avı artık daha yüksek eforla Sonnet'e gidiyor. Belirsiz olanı, daha zor görevler aksini gösterene kadar Opus'ta kalıyor.

Bir hata bildirimi şunlardan birini içeriyorsa net sayılır: hata çıktısı, dosya adı, kod, bir sayı, ne zaman olduğu ("tıklayınca ...") ya da ne olması gerektiği; yanındaki ekran görüntüsü de sayılır.

## Kararlarını gözden geçirme

Aşağıdaki sınıflandırma rakamları bizim yazdığımız etiketlerle ölçüldü. Kendi işlerinde gearbox'ın nasıl yaptığını görmek için kararlarının günlüğünü makinende tutar: her mesajın başı (100 karakter), kademe, cevap veren model ve efor, seçici kırptıysa gearbox'ın istediği, seçimin kaynağı, turun maliyeti ve sonrasında ne olduğu. Son 200 karar saklanır.

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
| Kurallar + emin değilse Haiku (0.5) | %90 | %100 | 0 | %19 |
| **Kurallar + emin değilse Haiku, kuralın işaretine bağlı (0.6)** | **%88** | **%100** | **0** | **%19** |
| Her zaman Haiku, yüksek olan | %74 | %96 | 0 | %100 |

143 etiketli mesajın, yalnızca kurallarla ve seçici Opus · high iken nereye gittiği (0.8, `tasarruf`; `claude plugin test .` bunu `EVAL route` satırında yazar): T0 Haiku · low 24, T1 Sonnet · medium 37, T2 Sonnet · medium 33, T3 Opus · medium 26, T3 yeri belli hata avı Sonnet · high 10, T4 Opus · high 13. 0.7'ye kadar 33 standart mesaj Sonnet · high ile, 10 hata avı Opus · medium ile çalışıyordu; kademelerin kendisi değişmedi.

\* Zor bir işi (T3+) T0/T1'e ya da iki kademe aşağı koymak. Not: ayardan önce ayrılan kümenin hataları bir kez görüldü ve yeni kümedeki hatalar "emin değilse sor" eşiğini etkiledi; gerçek isabet bir miktar düşük olabilir. 0.6'nın sınırı burada bir mesaja mal oluyor ("bu import neden kullanılıyor?" artık T0 değil T1) ve aşağıdaki gerçek kullanım hatalarını önleyen de o.

**Gerçek kullanım**: gearbox'ın 11-16 Ekim 2026 arasında 11 oturumda verdiği 49 karar. Her biri, işin sonradan ne çıktığına bakılarak etiketlendi (tek bir kişinin yargısı, bir kurulun değil). gearbox'ın o gün seçtiği, ve aynı mesajların 0.6 ile yeniden oynatılması:

| | Tam isabet | ±1 kademe | Ciddi hata* | Fazla düşük | Fazla yüksek |
|---|---|---|---|---|---|
| gearbox 0.3-0.5, çalıştığı gibi | %51 | %82 | 7 | 17 | 7 |
| gearbox 0.6, yeniden oynatılınca | %61 | %100 | 0 | 10 | 9 |

İlk satırda yanlış giden: yeni bir oturumda Claude Code'un mesajın önüne koyduğu not mesaj sanıldı, düz bir "merhaba" Opus · high'a gitti; Haiku ekran görüntüsüyle gelen hata bildirimlerini önemsiz saydı ("o tuş çıkmadı yine", "inceler misin"); uzun bir işin ortasındaki bir açıklama işi Haiku'ya düşürdü; yazıyla istenen model ("sonnet'e max ile ver") dikkate alınmadı. 0.6'nın düzeltmeleri bu mesajlardan yapıldı; ikinci satır düzeltmelerin tuttuğunu gösterir, 0.6'nın görmediği mesajlarda nasıl yaptığını değil. Yeniden oynatılan iki mesaj Haiku'ya sorulacaktı ve kayıtta cevapları yok. Bunu gösterecek olan karar günlüğü. Mesajlar birinin gerçek işi olduğu için küme de onu yeniden oynatan test de geliştiricinin makinesinde duruyor, bu repoda yok.

**Dış ölçütler** (`eval/external.mjs`): zorluğu başkalarının belirlediği, kod ajanı işlerinden oluşan açık kümeler. [SWE-bench Verified](https://huggingface.co/datasets/princeton-nlp/SWE-bench_Verified): 500 GitHub hata kaydı, her birinde değerlendiricilerin bir mühendisin düzeltmek için ne kadar süreye ihtiyaç duyacağına dair yargısı. [Terminal-Bench](https://github.com/harbor-framework/terminal-bench-1): terminalde yapılan 241 görev, her birinde yazarın bir uzmanın süresine dair tahmini. Süre kademeye çevrilir (15 dakikadan az T1, bir saatten az T2, dört saatten az T3, daha fazlası T4); iki kümede de önemsiz iş yok. Her küme, görev kimliğinin özetiyle ikiye bölünür: kurallar bir yarıya bakılarak ayarlanabilir, öteki yalnızca ölçülür. Metinler `eval/.work` altına indirilir ve kümelerin istediği gibi bu repoda asla tutulmaz.

| İkisinin saklı yarısı (350), 0.7 | Tam isabet | ±1 kademe | Ciddi hata* | Fazla yüksek | Sıra uyumu |
|---|---|---|---|---|---|
| Yalnızca kurallar | %36 | %79 | 9 (%3) | 183 | 0,10 |
| **gearbox: kurallar, emin değilse Haiku** | **%31** | **%78** | **6 (%2)** | **207** | **0,16** |

Kümelere göre, çalıştığı haliyle gearbox: SWE-bench Verified'da %36 tam isabet, %83 ±1 kademe, 500'de 1 ciddi hata; Terminal-Bench'te %30, %73, 241'de 8 ciddi hata (%3). 0.7'nin iki kural düzeltmesinden önce (uzun bir tarifin içindeki "commit" gibi bir angarya kelimesi onu artık basit iş yapmıyor; uzun bir iş tarifi küçük değişiklik sayılmıyor) kuralların saklı yarıda 21 ciddi hatası vardı (%6). Kuralların emin olmadığı yerde Haiku'ya sormak ciddi hataları daha da azaltıyor ve sıra uyumunu yükseltiyor; bedeli, bir iki kademe fazla gönderilen işin artması, çünkü Haiku tereddütte üst kademeyi seçiyor. Ölçüm Haiku'ya 177 kez sordu, liste fiyatıyla $0,38. Bu rakamlar 0.7'nin: 0.8 üç tür isteği T3'e çıkardı (ayrıntısız anlatılmış hata, gizli hataları yakalayacak test yazma, plan isteği) ve bu kümelerde yeniden ölçülmedi.

Gösterdiği: gearbox zor işi nadiren zayıf bir modele gönderiyor, ama uzun İngilizce hata kayıtlarında ve görev tariflerinde on beş dakikalık bir düzeltmeyi dört saatlik bir işten zor ayırıyor (sıra uyumu 0,16) ve güvenli taraftan harcıyor. Bu metinler insanların yazdığı kısa mesajlara, yani kuralların yapıldığı şeye benzemiyor; süreyi kademeye çeviren eşleme de bizim, bu yüzden "fazla yüksek"in bir kısmı işin pekâlâ hak ettiği bir kademe olabilir (yabancı bir kod tabanında hızlı bir düzeltme de bir aramadır).

**Çıktı kalitesi** (`eval/tasks/`): Küçük bir proje üzerinde 10 gerçek görev; her görevin sonucu Claude'un çalışırken görmediği testlerle kontrol edilir. Altı düzende çalıştırıldı (`node eval/tasks.mjs <kol>`). Maliyetler API liste fiyatıyla, her hücre bir kez, Claude Code 2.1.299, 17 Ekim 2026; ✗ kalan görev.

| Görev | Tür | gearbox | Opus · high | Opus · medium | Sonnet · medium | opusplan | Sonnet + Opus danışman |
|---|---|---|---|---|---|---|---|
| 1 | yeniden adlandırma | $0,01 Haiku | $0,21 | $0,21 | $0,06 | $0,09 | $0,10 |
| 2 | küçük değişiklik | $0,06 Sonnet | $0,21 | $0,14 | $0,06 | $0,06 | $0,07 |
| 3 | testleriyle yeni özellik | $0,10 Sonnet | $0,29 | $0,25 | $0,09 | $0,10 | $0,10 |
| 4 | yeri belli hata | $0,06 Sonnet | $0,24 | $0,18 | $0,06 | $0,06 | $0,07 |
| 5 | sebebi saklı hata | $0,36 Opus | $0,34 | $0,23 | $0,10 | $0,08 | $0,11 |
| 6 | yeri belli hata | $0,07 Sonnet | $0,26 | $0,21 | $0,07 | $0,07 | $0,09 |
| 7 | yanıltıcı hata: hata çıktısı yanlış dosyayı gösteriyor | $0,08 Sonnet | $0,33 | $0,24 | $0,07 | $0,08 | ✗ $0,09 |
| 8 | aynı hata "bu çalışmıyor, düzelt" diye anlatılmış | $0,33 Opus | $0,35 | $0,24 | $0,08 | $0,09 | $0,11 |
| 9 | gizlenmiş 6 hatayı yakalaması gereken test yazma | $0,81 Opus | $0,58 | $0,45 | $0,12 | $0,13 | $0,13 |
| 10 | küçük yeniden düzenleme | $0,08 Sonnet | $0,28 | $0,19 | $0,09 | $0,09 | $0,04 |
| **Toplam** | | **10/10, $1,96** | **10/10, $3,09** | **10/10, $2,33** | **10/10, $0,81** | **10/10, $0,85** | **9/10, $0,92** |

Gösterdiği, önce gearbox'ın aleyhine olan:

- **Bu görevlerde tek başına Sonnet · medium herkes kadar iyi ve en ucuza yaptı.** Biri hariç bütün düzenler onda on geçti; yani bu set modelleri birbirinden ayıramıyor, fazla kolay. Sonnet · medium $0,81, gearbox $1,96, Opus · high $3,09 harcadı.
- **gearbox burada tek başına Sonnet'ten pahalı**, çünkü üç hata avını (5, 8, 9) Opus · high'a verdi: $1,96'nın $1,50'si; Sonnet bunları da geçti. Bunun daha zor işte karşılığını verip vermediğini bir sonraki ölçüm gösterecek (büyük projeler, her biri üç kez).
- Aynı sonuçla gearbox Opus · high'tan %37, Opus · medium'dan %16 ucuz ve Opus · high'tan %40 hızlı.
- **Model mi efor mu:** Opus · medium, Opus · high'ın yaptığını %25 daha ucuza yaptı; Sonnet · medium da Opus · medium'un üçte birine.
- opusplan baştan sona Sonnet çalıştı: bu görevler plan modunda yapılmadı.
- Tek başarısızlık Opus danışmanlı Sonnet'te, yanıltıcı hatada: hata mesajının gösterdiği dosyayı düzeltti, asıl sebebi değil. gearbox bu görevi de Sonnet'e verdi (elde hata mesajı olan bir hata net sayılıyor) ve geçti. Tek çalıştırma, yani şans payı büyük; ölçüm danışmana gerçekten sorulup sorulmadığını göstermiyor.
- Her hücre bir kez, küçük bir projede: yön gösterir, kesin değildir. Daha önceki bir çalıştırmada (0.7, altı görev) gearbox dört görevde Opus · high ile aynı sonucu $2,38 yerine $0,31'e almıştı.

## Proje yapısı

| Yol | İçeriği |
|---|---|
| `hooks/register.tsx` | hooks modülü: olaylar, `/gear` komutu, durum satırı, kartı çizen kanca |
| `hooks/card.tsx` | tasarruf kartı, Box ve Text'ten bir ağaç |
| `hooks/core/signals.ts` | sınıflandırıcı: kurallar, etiketler, Türkçe ve İngilizce sinyaller |
| `hooks/core/llm.ts` | kurallar emin olamayınca Haiku'ya sorulan soru |
| `hooks/core/tiers.ts` | profiller: kademeden model ve efora |
| `hooks/core/policy.ts` | bir kademeye uygulanan tavan ve önbellek, uyarılacak limit pencereleri |
| `hooks/core/pacing.ts` | limit pencerelerini okur, uyarıyı yazar |
| `hooks/core/models.ts` | model aileleri, kimlikler, efor seviyeleri |
| `hooks/core/prices.ts` | liste fiyatları ve bir turun maliyeti |
| `hooks/core/journal.ts` | karar günlüğü: kayıtlar, şikâyet ve kırık test işaretleri, senin işaretlerin, rapor |
| `hooks/core/settle.ts` | kuralların, Haiku'nun cevabının ve süren işin bir kademeyi nasıl belirlediği |
| `hooks/core/savings.ts` | modele göre toplamlar, tasarruf, markdown rapor |
| `hooks/core/settings.ts` | kayıtlı ayarlar ve istatistik, `/gear` ayrıştırma |
| `hooks/core/switch.ts` | durum etiketinin çizimi |
| `hooks/core/version.ts` | denendiği en yeni Claude Code sürümü |
| `tests/` | kurallar, politika, fiyat ve tasarruf; sahte motora karşı yönlendirici; sınıflandırıcı ölçümü |
| `eval/` | sınıflandırma ölçümü, dış ölçütler (`external.mjs`) ve çıktı kalitesi görevleri |
| `scripts/` | canlı duman testi; gearbox'ın kararlarını oturum kayıtlarından toplayan `harvest.mjs` |

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

`node eval/tasks.mjs <kol>` `--runs N` ve `--set sqlglot` alır: [sqlglot](https://github.com/tobymao/sqlglot)'un (MIT, yaklaşık 100 bin satır) 10 gerçek hatası; her biri kodun o hata düzeltilmeden hemen önceki hâliyle, git geçmişi olmadan kurulur ve o düzeltmenin eklediği testlerle kontrol edilir. sqlglot'un `eval/.work/repos/sqlglot` altına klonlanmış olmasını ve Python 3.9+ ister. `--dry` bu görevlerin her birini ücretsiz kontrol eder: verildiği hâliyle kalmalı, gerçek düzeltmeyle geçmeli. `gearbox-0.8.1` kolu, hata avı ayrılmadan önceki gearbox; iki kuralı kıyaslamak için.

Son ikisi gerçek model çağrısı yapar, biraz kota harcar; Haiku cevapları `eval/.work` altında önbelleğe alınır. `plugin test`, Claude Code 2.1.295 ya da daha yenisini ister (2.1.295 ve 2.1.299 kullanıldı): eski sürümlerde hooks modülü yüklenmez ve yönlendirici testleri başarısız olur (2.1.278: 75 geçti, 30 kaldı). PATH'teki `claude` masaüstü uygulamasının kendi sürümünden eski olabilir; Windows'ta o sürüm `%APPDATA%\Claude\claude-code\` ya da yeni uygulamalarda `%LOCALAPPDATA%\Claude-Data\<profil>\claude-code\` altındadır. Ölçüm betikleri bunların en yenisini kendileri bulur (`CLAUDE_BIN` ile değiştirilebilir) ve 2.1.295'ten eski bir sürümde hiçbir şey harcamadan durur.

**Kendini test konusu yapmadan geliştirmek.** Yeni bir sürüm dört adımdan geçer, her biri bir sonrakinden önce, ve yalnızca sonuncusu gerçek işe dokunur:

1. Çevrimdışı: `claude plugin test .` (kurallar, politika, yönlendirici, eval kümeleri) ve `node eval/external.mjs` (dış ölçütler, ücretsiz; `--haiku` biraz kota harcayarak Haiku'nun cevaplarını ekler).
2. Gerçek işte gölge modda (`/gear golge`): gearbox seçer ve yazar, cevabı seçicideki model verir.
3. `node scripts/harvest.mjs` bu seçimleri oturum kayıtlarından `eval/.work/harvest.json` dosyasına toplar; etiketlenince bir sonraki sürümün üzerinden yeniden oynatılacağı bir gerçek kullanım kümesi olurlar.
4. Ancak ondan sonra `/gear oto`.

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
- [x] Gölge mod, dış ölçütler ve gerçek kararların toplanması: yeni bir sürüm, kimsenin işini yönlendirmeden önce sınanır (0.7)
- [x] Limit pencereleri seçimi düşürmek yerine uyarıyor; efor tablosu ölçümlere göre yeniden ayarlandı (net işte Sonnet · medium, hata avında high, istenmedikçe max yok); açık, gölge ve kapalıyı ayrı gösteren durum satırı; gölge kaydı seçicinin kırptığını da tutuyor; plan modu Opus'a gidiyor (0.8)
- [ ] Alt ajan kuralları: istekleri kancaya ulaşıyor (bir `agentId` taşıyorlar) ve bugün olduğu gibi geçiriliyor; keşif ajanlarını Haiku · low'a vermek sırada, önce kotadaki paylarının ölçülmesi gerekiyor
- [x] Senin işaretlerinle karar günlüğü, kuralların nerede yanıldığını görmek için
- [x] Gerçek kullanımın incelenmesi: sistem notları, Haiku'ya sınır, süren işin tutulması, yazıyla istenen model (0.6)
- [ ] Bu düzeltmelerden öğrenme

## Lisans

MIT
