# autogear

[English](README.md) · **Türkçe**

Claude Code için otomatik vites. Her mesajda modeli (Haiku, Sonnet ya da Opus) ve eforu işin zorluğuna göre seçer, sağ alttaki model seçicinin üstüne asla çıkmaz ve bunun neyi kurtardığını sayar. Limitin daha uzun sürer: kendi ölçümlerinde güçlü model, ucuzunun çözemediği hiçbir işi çözmedi; bu yüzden Opus kritik işe, plan moduna ve senin istediğin duruma ayrılır.

> Durum: 0.12.2. Claude Code için bir Mod; eklenti API'sinin function hooks'una dayanır, o API Claude Code sürümleri arasında değişebilir. Aşağıdaki güvenlik ağları bu yüzden var. Sürüm notları: [CHANGELOG.md](CHANGELOG.md). Neyi sakladığı ve neyi gönderdiği: [Gizlilik](#gizlilik).

![autogear 28 saniyede: her mesaj ihtiyacı olan modeli alır, seçicinin üstüne çıkılmaz](docs/demo/autogear-demo.gif)

*autogear'ın kendi kademelerinden ve ölçümlerinden yapılmış bir çizim, ekran kaydı değil. Kaynağı `docs/demo/demo.html`; `docs/demo/render.py` onu görüntüye çevirir.*

## Ne sağlar

- **Mesaj başına doğru model.** "Bu fonksiyon ne yapıyor" Haiku · low ile, net ve tek yerlik bir değişiklik Sonnet · medium ile, belirsiz bir hata ya da mimari sorusu Sonnet · high ile, çok parçalı uzun iş ve plan modu Opus ile çalışır.
- **Seçicinin üstüne çıkmaz.** Seçiciyi bir kez en güçlü modeline getirirsin; autogear ona eşit ya da altında seçer.
- **Bir durum satırı.** İstem kutusunun üstündeki satır autogear'ın açık mı, gölgede mi, kapalı mı olduğunu gösterir; yanındaki düğmelerin üstünde ne yaptıkları yazar.
- **Her cevap kimin verdiğini söyler.** Altındaki tek italik satır cevabı veren modeli ve eforu, yardımcılar çalıştıysa onların modelini yazar (autogear açıkken, gölgedeyken ve kapalıyken de). Gerekçeler ve para tek komut ötede:

  ```
  Opus 5.5 · efor medium · yardımcılar: Sonnet 5.5
  ```
- **Tasarruf sayacı.** Sağ alttaki durum yazısında oturumun tasarrufu görünür, ayrıntı için `/gear savings` bir kart çizer.

## Kurulum

Claude Code'da:

```
/plugin install autogear --marketplace emreyaman1/autogear
```

Sonra seçiciyi bir kez en güçlü modeline getir (örneğin **Opus · high**). Kurduktan sonra yeni bir sohbet aç; zaten açık olan sohbetler yeni eklentileri yüklemez.

Yerel bir kopyadan kurmak için, bir terminalde:

```bash
claude plugin marketplace add <deponun kopyasının yolu>
```

```bash
claude plugin install autogear@autogear
```

Kurulumdan sonra açtığın her Claude Code oturumunda (masaüstü uygulaması dahil) çalışır. Claude Code 2.1.295 ya da daha yenisi gerekir (2.1.295 ve 2.1.299'da denendi; canlı duman testi 2.1.299'da geçti). Claude Code bir hooks modülünü çalıştırmadan önce kendi eklenti API'siyle karşılaştırır; tanımadığı tek bir olay ya da çağrı varsa modülün tamamını reddeder. Bir eklenti en düşük sürümü de bildiremez. Bu yüzden eski bir sürümde autogear hiç yüklenmez ve nedenini söyleyemez; 2.1.278, 0.7'den bu yana her sürümü reddeder. Masaüstü uygulaması kendi güncel Claude Code'unu getirir; terminale ayrıca kurulmuş bir `claude` daha eski olabilir (`claude --version`, `claude update`).

## Kullanım

**Seçici tavandır.** autogear, seçicideki model ve eforun üstünde harcama yapmaz. Seçiciyi değiştirdiğinde yeni tavanı bildirir. Seçici **Opus · high** iken tam otomatiktir.

**Durum satırı.** İstem kutusunun üstündeki küçük satır autogear'ın ne yaptığını gösterir: bir etikette **AÇIK** (yeşil), **GÖLGE** (mor), **KAPALI** (gri) ya da **DURDU** (turuncu; bkz. Güvenlik ağları) yazar. Etiketteki nokta autogear'ın ne yaptığını hafifçe hareket ederek söyler: seçerken yumuşak bir nabız, gölgede yavaş bir nefes, kapalıyken durgun, durmuşken yavaş yanıp sönme; sisteminde "hareketi azalt" açıksa kıpırdamaz. Yanında son seçim durur ("Sonnet · medium · T1 rutin"; gölgede autogear'ın önerisi), henüz seçim yoksa durumun ne demek olduğu. Yanındaki düğmeler öteki durumlar içindir ve her birinin üstünde basınca ne olacağı yazar: **aç**, **gölgeye al**, **kapat**; durmuşsa **yeniden dene**. Kapalıyken her istek, seçici ne diyorsa tam olarak onunla gider. Sağ alttaki durum yazısı son mesaj için seçilen model ve eforu, bir de oturumun tasarrufunu gösterir. Bir limit penceresi dolmak üzereyken ya da çok hızlı harcanırken satırda bir de uyarı görünür (aşağıda Tempo).

**Gölge mod.** `/gear shadow` ile autogear seçer ama seçimini uygulamaz: her istek seçici ne diyorsa onunla gider, autogear da ne seçeceğini günlüğüne ve durum satırına (`Haiku · low · T0 önerirdi`) yazar. Cevabın altındaki satır yalnızca hangi modelin cevapladığını söyler. Seçici burada da tavandır; seçimi kırptıysa ikisi de günlüğe yazılır (`Sonnet · high (tavansız Opus · high)`). Böylece seçici Sonnet'teyken de Opus ihtiyacı görünür. Yeni bir sürüm böylece gerçek iş üzerinde, o işe dokunmadan denenir; `/gear wrong` seçimlerini yine işaretler. `/gear on` yönlendirmeyi geri açar.

**Plan modu.** Claude Code'un plan modunda her istek Opus'a gider; efor, kuralların okuduğu plan büyüklüğüne göre seçilir: küçük planda medium, ortada high, çok parçalı büyük planda xhigh. Seçicinin üstüne asla çıkmaz; senin adını verdiğin model (`+sonnet`) yine önde gelir. autogear plan modunu Claude Code'un model için eklediği nottan anlar; bu yüzden bir cevabın ortasında açılan plan modu bir sonraki mesajdan itibaren sayılır. Plan modu dışında da plan isteyen bir mesaj ("plan çıkar", "nasıl yapalım", "yol haritası", "plan the migration") zor iş (T3) sayılır. Cevabın altındaki satırda ve günlükte `plan modu` yazar.

**Temiz sohbet (0.10, ilk sürüm).** Bir turun her adımı konuşmanın tamamını yeniden gönderir; büyük bir sohbet her mesajda daha pahalıdır. Sohbet 150 bin tokenı geçmişse ve bir iş yeni bittiyse (commit ya da push, ya da geçen bir test çalıştırması), istem üstündeki satır temiz bir sohbet önerir: not yazılırken `Devir notu hazırlanıyor…`, sonra `Devir notu hazır · sohbet 180 bin token`, yanında **temiz sohbet**, **notu gör** ve **×**. Sen yazmaya devam etsen de öneri durur; birine basana ya da daha yeni bir not gelene kadar. autogear modele kısa bir devir notu yazdırır (proje, son commit, yapılan, açık işler, kuralların, okunacak dosyalar); **notu gör** onu gösterir, **temiz sohbet** `/clear` çalıştırır ve notu bir sonraki mesajınla, görünmeden, gönderir. Sen basmadan hiçbir şey temizlenmez; eski sohbet diskte kalır, notun son satırı onu açan `claude --resume` komutudur. 447 bin tokenlık gerçek bir masaüstü sohbetinde denendi: öneri, not ve düğme çalışıyor; temiz sohbet eski konuşmayı taşımadan, yalnızca notla başladı. Düğmeye bastıktan hemen sonra masaüstü uygulaması eski mesajları yukarıda göstermeye devam eder ve bağlam kutusunda eski boyutu gösterebilir; modele giden, temiz sohbettir.

**Etiketler.** Mesajın başına yazılan etiketler o mesaj için seçimi belirler ve modele gitmeden silinir: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+cheap` (T0), `+deep` (T4). `ultrathink` T4 demektir.

Ya da düz yazıyla söyle: "bu görevi sonnet'e max ile ver", "opus ile yap", "opus, sen de bak", "use opus" o mesaj için modeli, adı geçiyorsa eforu da seçer. Bir model hakkında konuşmak ("haiku ile yaptı", "opus pahalı mı?") bir şey seçmez. Yazıyla yapılan seçim de, etiket gibi, seçicinin üstüne çıkabilir.

**Komutlar.**

| Komut | İş |
|---|---|
| `/gear` | durum, son karar ve gerekçesi, limitler, istatistik, bu liste |
| `/gear savings` | tasarruf kartı (aşağıda) |
| `/gear log` | autogear'ın son kararlarının günlüğü ve şüpheli olanlar |
| `/gear wrong weak\|strong` | son kararı işaretle: model çok zayıftı, ya da işin gerektirdiğinden güçlüydü |
| `/gear reset` | tasarruf sayacını ve günlüğü sıfırla |
| `/gear on` / `/gear off` | autogear'ı aç / kapat (kapalıyken seçicideki model kullanılır) |
| `/gear shadow` | gölge mod: seç ve yaz, hiçbirini uygulama |
| `/gear profile saver\|balanced\|quality` | hangi kademe tablosu kullanılsın (tasarruf, dengeli, kalite) |
| `/gear haiku on\|off` | önemsiz işler Haiku'ya gitsin mi |
| `/gear ask on\|off` | kurallar emin olamazsa Haiku'ya sorulsun mu |
| `/gear note on\|off` | cevabın altındaki satır |
| `/gear band on\|off` | istem kutusunun üstündeki durum satırı |
| `/gear lang en\|tr\|auto` | autogear'ın konuştuğu dil; auto sistemin dilini izler |
| `/gear doctor` | kurulumu kontrol eder, düzeltilecek şeyi söyler: durum, seçici, Claude Code sürümü, seçimlerin uygulanıp uygulanmadığı, depo, limitler, dil, eforu ya da yardımcıların modelini sabitleyebilen ortam ayarları |

Komutlar hangi dilde olursa olsun İngilizcedir. Eski Türkçe adlar (`oto`, `sabitle`, `golge`, `tasarruf`, `kayit`, `yanlis zayif|fazla`, `sifirla`, `profil tasarruf|dengeli|kalite`, `sor`, `not`, `bant` ve `aç`/`kapa`) çalışmaya devam eder.

**Dil.** autogear İngilizce ya da Türkçe konuşur. `auto` (varsayılan) sistemin dilini izler: Türkçe sistemde Türkçe, başka yerde İngilizce. Claude Code'un kendi `language` ayarı bir Mod'a açık değil, bu yüzden okunmaz. `/gear lang en` ya da `tr` elle seçer. Komutlar, etiketler ve model adları değişmez; mesajlarını okuyan kurallar bu ayardan bağımsız olarak sekiz dili anlar.

**Her cevabın altındaki satır.** autogear açıkken, gölgedeyken ve kapalıyken de her cevabın altında, italik tek bir satır cevabı hangi modelin verdiğini (API'nin bildirdiği) ve hangi eforla istendiğini söyler: *Opus 5.5 · efor medium*. Yardımcılar (alt ajanlar) çalıştıysa modelleri de yazılır: *Opus 5.5 · efor medium · yardımcılar: Sonnet 5.5*. Plan modu ve limit uyarısı yanına eklenir. `/gear note off` satırı kaldırır. autogear'ın mesajda ne okuduğu, neden öyle seçtiği ve para `/gear`, `/gear log` ve `/gear savings` içinde.

## Nasıl çalışır

```
mesaj ─► sınıfla ─► yerleştir ─► karar  ─► uygula    ─► cevap ─► doğrula       ─► say
         signals    settle       tiers     turn.step             turn.complete    savings
         llm                     policy                                           prices
                                 pacing
```

1. **Sınıflandırma** (`hooks/core/signals.ts`): Mesaj T0–T4 kademelerinden birine konur. Sekiz dilin sinyalleri okunur (Türkçe, İngilizce, İspanyolca, Almanca, Fransızca, Rusça, Çince, Japonca); mesajdaki kod, dosya ve değişken adları dikkate alınmaz. Fiil tek başına değil nesnesiyle değerlendirilir ("rengi değiştir" ≠ "ödeme sistemi ekle"). Claude Code'un mesajın önüne koyduğu notlar okunmaz, selamlaşma doğrudan T0'dır, hiçbir şey yazılmamış bir mesaj (yalnızca görsel) son seçimle devam eder. Kurallar emin olamazsa Haiku'ya tek kısa bir soru sorulur (`hooks/core/llm.ts`).
2. **Yerleştirme** (`hooks/core/settle.ts`): Haiku mesajı tek başına okur, ekran görüntüsünü ya da etrafındaki işi görmez; bu yüzden cevabı kuralların gördüğünden en çok bir kademe aşağı inebilir, bir şeyi incelemeyi isteyen mesajda T2'nin altına inmez. T2 ve üstü bir işin ortasındaki mesaj (bir soru, bir açıklama, yalnızca Haiku'nun yerleştirebildiği bir mesaj) o işin en çok bir kademe altına iner; kuralların emin olduğu yeni iş, commit gibi bir angarya ya da selamlaşma baştan başlar.
3. **Karar** (`hooks/core/tiers.ts`, `policy.ts`, `pacing.ts`): Kademe, profil tablosundan model ve efora çevrilir, sonra iki sınırdan geçer ve limit pencerelerine bakılır:
   - **Tavan:** Seçicideki model ve efor aşılmaz.
   - **Önbellek:** Model değişince yeni model bütün konuşmayı bir kez önbelleğe yazma fiyatıyla okur (eski modelin önbelleği silinmez: abonelikte bir saat durur, her okumada süresi yenilenir). Bu yüzden bağlam büyükse (40K+ token) autogear daha ucuz bir modele asla inmez; o tek yazma, kazançtan pahalıya gelir (Sonnet milyon token başına $2,50'ye yazar, Opus önbelleğini $0,20'ye okur; Haiku 100K tokenı aşınca beş kat öder). Uzun bir Opus konuşmasında commit, Opus'ta low eforla yapılır. Bir kademe yukarı çıkmak da modeli değiştirmez; iki kademe ya da fazlası, ya da Haiku'dan çıkmak değiştirir. Küçük konuşmada her mesaj kendi modeline gider.
   - **Tempo:** Limit penceresi modeli ya da eforu asla düşürmez: işin başarıyla bitmesi limitten önemli. 5 saatlik ya da haftalık limit %90'ı geçtiyse ya da eşit hızın üstünde harcanıyorsa (%30'dan fazlası kullanılmış ve beklenenin 20 puan önünde), bunun yerine cevabın altındaki satırda ve durum satırında uyarı çıkar (`⚠ 5 saatlik limit %92: bu iş Opus · high ile yapılıyor, limit dolabilir`). Bir pencere bitmeye yakınsa ve yarısı bile kullanılmadıysa, zor ve kritik işlerde (T3 ve üstü) efor bir kademe çıkar; max'a kadar çıkmaz, seçicinin üstüne de çıkmaz. Standart işe dokunulmaz: kademe tablosunun dayandığı ölçümlerde net anlatılmış işte fazla efor işe yaramadı.
4. **Uygulama** (`hooks/register.tsx`, `turn.step`): Her model isteğinden hemen önce kararı uygular. Bir turun bütün istekleri aynı modelle gider, böylece tur önbelleğini korur. Alt ajanlara dokunulmaz.
5. **Doğrulama** (`turn.complete`): API'nin bildirdiği gerçek model, seçimle karşılaştırılır (bkz. Güvenlik ağları).
6. **Sayım** (`hooks/core/savings.ts`): Turun gerçek token sayısı iki kez fiyatlanır, bir kez cevap veren modelde, bir kez seçicideki modelde, ve oturumun ile genel toplama eklenir.

| Kademe | Örnek | `tasarruf` (Pro) |
|---|---|---|
| T0 önemsiz | "bu fonksiyon ne yapıyor", commit mesajı, yeniden adlandırma | Haiku · low |
| T1 rutin | net, tek yerlik değişiklik | Sonnet · medium |
| T2 standart | özellik, onun testleri, hata çıktısı elde olan debug | Sonnet · medium |
| T3 zor | mimari, performans, güvenlik, seçenekler arasında karar | Sonnet · high |
| T3 belirsiz hata avı | ayrıntısız anlatılmış hata ("bu çalışmıyor, düzelt"): hata çıktısı, dosya, sayı, ne zaman olduğu ve ekran görüntüsü yok | Sonnet · high (`dengeli` ve `kalite`de Opus · high) |
| T3 yeri belli hata avı | açık anlatılmış ama sebebi saklı hata (bazen olup bazen olmayan, sebebinden uzakta görünen), henüz kimsenin bulmadığı hataları yakalayacak test yazma | Sonnet · high (T4'te xhigh) |
| T4 kritik | çok adımlı büyük iş, tekrarlayan başarısızlık | Opus · high |

Profiller: `tasarruf` (Pro için), `dengeli` ve `kalite` daha cömert harcar, Max planları içindir. Her profilde net anlatılmış rutin ve standart iş Sonnet · medium ile, yeri belli hata avı Sonnet · high ile çalışır; hiçbir kademe sen istemedikçe (`+max`, "max ile") max ile çalışmaz. Dayanağı: gerçek Python projelerinde gizli testlerle yapılmış açık bir ölçümde (Forn AI, 4 Ekim 2026) Sonnet · medium yeri belli 13 hatanın 13'ünü Opus · high'ın üçte bir maliyetine çözdü, net işte Sonnet'in eforunu artırmak işe yaramadı; hata çıktısının yanlış dosyayı gösterdiği hatada Opus · high 6/6, Sonnet · medium 4/6, aynı hata belirsiz anlatılınca Sonnet 0/2; 22 gizli hatayı yakalaması gereken test yazımında Opus · high 22/22, Sonnet 16–19. Bunların bir kısmı 2–6 denemeye dayanıyor; tablo bir başlangıç, autogear'ın kendi kıyas ölçümü doğrulayacak. O kıyasta (Ölçümler) Sonnet · medium, Opus · high'ın geçtiği her hata avını geçti; bu yüzden yeri belli hata avı artık daha yüksek eforla Sonnet'e gidiyor. `tasarruf`ta zor iş ve belirsiz hata avı da artık Sonnet · high ile çalışıyor: iki sette, yirmi görevde Opus, Sonnet · medium'un çözemediği hiçbir görevi çözmedi, maliyeti 3,6 kattı. `dengeli` ve `kalite` zor işte Opus'u koruyor.

Bir hata bildirimi şunlardan birini içeriyorsa net sayılır: hata çıktısı, dosya adı, kod, bir sayı, ne zaman olduğu ("tıklayınca ...") ya da ne olması gerektiği; yanındaki ekran görüntüsü de sayılır.

## Kararlarını gözden geçirme

Aşağıdaki sınıflandırma rakamları bizim yazdığımız etiketlerle ölçüldü. Kendi işlerinde autogear'ın nasıl yaptığını görmek için kararlarının günlüğünü makinende tutar: her mesajın başı (100 karakter), kademe, cevap veren model ve efor, seçici kırptıysa autogear'ın istediği, seçimin kaynağı, turun maliyeti ve sonrasında ne olduğu. Son 200 karar saklanır.

- `/gear log` son 25 kararı tablo olarak, kullanılan kademeleri ve **şüpheli kararları** gösterir: işin kendisinin sorguladığı kararlar (şikâyet ettin ve autogear bir kademe yükseltti; turun sonunda testler ya da derleme kırıktı) ve senin işaretlediklerin.
- Bir karar yanlışsa cevaptan hemen sonra söyle: `/gear wrong weak` (model çok zayıftı) ya da `/gear wrong strong` (işin gerektirdiğinden güçlüydü). İşaret son mesaja düşer.
- Şüpheli oranı bir tabandır: kimsenin fark etmediği yanlış seçimler sayılmaz. Birkaç günlük kullanımla kuralların hangi tür mesajlarda yanıldığını gösterir, bir sonraki ayar da orada.
- `/gear reset` günlüğü siler. Makinenden hiç çıkmaz.

## Tasarruf

**Nerede görünür.**

- Sağ alttaki durum yazısı: oturumun toplam tasarrufu.
- `/gear` ve `/gear log`: her kararın maliyeti ve seçici modeliyle ne tutacağı.
- `/gear savings`: konuşmanın içine çizilen bir kart:
  - iki çubuk, bu oturumun ve toplamın tasarrufu, her biri seçicinin faturasındaki payıyla;
  - her modelin payı, çubuk ve açıklamayla;
  - modele göre tablo: tur, girdi, çıktı, önbellek okuma, önbelleğe yazma, önbellek isabeti, harcama, seçici modeliyle harcama, tasarruf;
  - 5 saatlik ve haftalık limit pencereleri.

  Dar ekranda tablo, model başına tek satıra döner. Bir yüzey kartı çizemiyorsa aynı rakamlar markdown tablo olarak gelir. İkisi de aynı kayıtlı toplamları okur.
- `/gear reset` sayımı baştan başlatır. Toplamlar makinendeki eklenti deposunda durur; sayımın başladığı tarih kartta yazar.

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
- Model değiştiren tur önbelleğini yeniden yazmıştır. Seçici modelinde o önbellek sıcak kalacaktı, bu yüzden oradaki yazmalar okuma fiyatından sayılır: geçişin maliyeti autogear'ın aleyhine yazılır.
- Düşük efor daha az token üretir. Bu fark hesaba katılmaz, tasarruf biraz düşük çıkabilir.
- autogear'ın kendi Haiku sorularının maliyeti tasarruftan düşülür. Alt ajanlar sayılmaz.

## Güvenlik ağları

- **Kendini denetleme:** Her turdan sonra API'nin bildirdiği gerçek modele bakar. Seçtiği model üst üste 3 tur uygulanmazsa (bir Claude Code güncellemesi eklenti API'sini değiştirmişse) kendini kapatır ve haber verir; `/gear on` yeniden dener.
- **Yedek model:** Seçilen model yanıt vermezse (kimliği eskimiş, planında yok) istek seçicideki modelle yeniden gönderilir, o model o oturumda bir daha seçilmez.
- **Kartopu freni:** Ucuz bir modelle yapılan tur, testleri ya da derlemesi kırık bitmişse bir sonraki tur bir kademe güçlü modelle yapılır. "Olmadı", "hâlâ aynı hata" gibi şikâyetler de kademeyi yükseltir; üst üste ikinci şikâyette iki kademe.
- **Sürüm uyarısı:** Claude Code, autogear'ın denendiği sürümden (`hooks/core/version.ts`) yeniyse bir kez haber verir.
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

Tablo 0.5 ve 0.6'dan, satırlarında yazdığı gibi. Kurallar o zamandan beri değişti; aynı 77 mesajda kurallar tek başına bugün %88 tam, %99 bir kademe içinde ve hiç ciddi hata vermiyor, ama iki set de ayar yapılırken okundu, bu yüzden bu rakam olduğundan iyi görünür.

143 etiketli mesajın, yalnızca kurallarla ve seçici Opus · high iken nereye gittiği (0.12, `tasarruf`; `claude plugin test .` bunu `EVAL route` satırında yazar): T0 Haiku · low 24, T1 Sonnet · medium 33, T2 Sonnet · medium 33, T3 Sonnet · high 29, T3 yeri belli hata avı Sonnet · high 10, T4 Opus · high 14. 0.7'ye kadar 33 standart mesaj Sonnet · high ile, 10 hata avı Opus · medium ile çalışıyordu; kademelerin kendisi değişmedi.

\* Zor bir işi (T3+) T0/T1'e ya da iki kademe aşağı koymak. Not: ayardan önce ayrılan kümenin hataları bir kez görüldü ve yeni kümedeki hatalar "emin değilse sor" eşiğini etkiledi; gerçek isabet bir miktar düşük olabilir. 0.6'nın sınırı burada bir mesaja mal oluyor ("bu import neden kullanılıyor?" artık T0 değil T1) ve aşağıdaki gerçek kullanım hatalarını önleyen de o.

**Başka diller** (`tests/multilingual.test.ts`, `node eval/haiku.mjs --held`): sekiz dilde yazılmış ve işin gerektirdiğine göre etiketlenmiş mesajlar; kod ve hata çıktısı yazıldığı gibi bırakıldı. autogear çalıştığı gibi (0.11.0): Türkçe ve İngilizcenin yanında İspanyolca, Almanca, Fransızca, Rusça, Çince ve Japoncayı okuyan kurallar; kurallar emin değilse ya da mesaj Türkçe veya İngilizce değilse Haiku, kuralın alt sınırına bağlı. Aşağıdaki sayılar, kuralları ve kelime listelerini görmeyen başka bir modelin yazdığı kümeye ait: dil başına 24 mesaj, her dilin kendi mesajları, ayar yapılmadan önce bir kez okundu. 17 Ekim 2026, 139 Haiku sorusu, liste fiyatıyla $0,08. Etiketler o modelin; bir kişi kontrol etmedi.

| Dil | Kurallar: ±1 kademe | Kurallar: ciddi hata* | autogear: tam isabet | autogear: ±1 kademe | autogear: ciddi hata* | Haiku'ya sorulan |
|---|---|---|---|---|---|---|
| Türkçe | %83 | 2 | %67 | %92 | 0 | %33 |
| İngilizce | %92 | 0 | %75 | %92 | 0 | %8 |
| İspanyolca | %88 | 2 | %79 | %96 | 0 | %88 |
| Almanca | %83 | 2 | %79 | %100 | 0 | %83 |
| Fransızca | %92 | 1 | %79 | %96 | 0 | %83 |
| Rusça | %83 | 2 | %71 | %96 | 0 | %88 |
| Çince | %92 | 2 | %54 | %100 | 0 | %96 |
| Japonca | %92 | 1 | %71 | %100 | 0 | %92 |

Ne gösteriyor, önce aleyhte olanlar:

- **Türkçe ve İngilizce dışında kurallar tek başına güvenilir değil:** ilk okumada %83–92 ±1 kademe ve 24 mesajda bir ya da iki ciddi hata; bu yüzden autogear bu dillerde çoğunlukla Haiku demek (mesajların %83–96'sı soruluyor, her biri yaklaşık $0,0005'lik bir Haiku çağrısı ve onun beklemesi). Bu çalışmadan önce (0.9.1) çevrilmiş 143 mesajlık küme Almanca, Fransızca, Çince ve Japoncada 2–7 ciddi hata veriyordu.
- **Haiku ile hedef (±1 kademe en az %90, ciddi hata en çok %2) bu kümede her dilde tutuyor,** hiç ciddi hata yok. 24 mesaj az: bir hata dört puan.
- **Tam isabet daha düşük, %54–79:** Haiku bir mesajı kurallardan daha sık bir kademe aşağı çekiyor (en çok Çince: %54). Kurallar tek başına burada autogear'tan daha sık tam bulur, ama karşılaşmadıkları cümle biçimlerinde ağır kaçırır; o yüzden Haiku kalıyor.
- Aynı yolla yazılmış önceki bir küme (bir kez okundu, sonra ayar yapıldı) ilk okumada aynı resmi verdi: ±1 kademe %92–100, bir ciddi hata (İspanyolca). İki küme de okunduktan sonra ayar yapıldı; bu yüzden kuralların onlardaki şimdiki sayıları yüksek ve bir şey ifade etmiyor.
- Uzun İngilizce görev metinleri (SWE-bench Verified, Terminal-Bench; `node eval/external.mjs`): kurallar uzun, sayı veren ya da adım adım bir tarifi T3'e koyup Haiku'ya soruyor. Terminal-Bench'te ciddi hata %7'den %4'e indi; ±1 kademe SWE-bench'te %83'ten %78'e, Terminal-Bench'te %76'dan %75'e düştü, daha çok görev bir kademe fazla yüksek konuyor.
- 143 mesajın çevirileri Claude'un; bir anadil konuşmacısı kontrol etmedi.

**Gerçek kullanım**: autogear'ın 11-16 Ekim 2026 arasında 11 oturumda verdiği 49 karar. Her biri, işin sonradan ne çıktığına bakılarak etiketlendi (tek bir kişinin yargısı, bir kurulun değil). autogear'ın o gün seçtiği, ve aynı mesajların 0.6 ile yeniden oynatılması:

| | Tam isabet | ±1 kademe | Ciddi hata* | Fazla düşük | Fazla yüksek |
|---|---|---|---|---|---|
| autogear 0.3-0.5, çalıştığı gibi | %51 | %82 | 7 | 17 | 7 |
| autogear 0.6, yeniden oynatılınca | %61 | %100 | 0 | 10 | 9 |

İlk satırda yanlış giden: yeni bir oturumda Claude Code'un mesajın önüne koyduğu not mesaj sanıldı, düz bir "merhaba" Opus · high'a gitti; Haiku ekran görüntüsüyle gelen hata bildirimlerini önemsiz saydı ("o tuş çıkmadı yine", "inceler misin"); uzun bir işin ortasındaki bir açıklama işi Haiku'ya düşürdü; yazıyla istenen model ("sonnet'e max ile ver") dikkate alınmadı. 0.6'nın düzeltmeleri bu mesajlardan yapıldı; ikinci satır düzeltmelerin tuttuğunu gösterir, 0.6'nın görmediği mesajlarda nasıl yaptığını değil. Yeniden oynatılan iki mesaj Haiku'ya sorulacaktı ve kayıtta cevapları yok. Bunu gösterecek olan karar günlüğü. Mesajlar birinin gerçek işi olduğu için küme de onu yeniden oynatan test de geliştiricinin makinesinde duruyor, bu repoda yok.

**Dış ölçütler** (`eval/external.mjs`): zorluğu başkalarının belirlediği, kod ajanı işlerinden oluşan açık kümeler. SWE-bench Verified: 500 GitHub hata kaydı, her birinde değerlendiricilerin bir mühendisin düzeltmek için ne kadar süreye ihtiyaç duyacağına dair yargısı. [Terminal-Bench](https://github.com/harbor-framework/terminal-bench-1): terminalde yapılan 241 görev, her birinde yazarın bir uzmanın süresine dair tahmini. Süre kademeye çevrilir (15 dakikadan az T1, bir saatten az T2, dört saatten az T3, daha fazlası T4); iki kümede de önemsiz iş yok. Her küme, görev kimliğinin özetiyle ikiye bölünür: kurallar bir yarıya bakılarak ayarlanabilir, öteki yalnızca ölçülür. Metinler `eval/.work` altına indirilir ve kümelerin istediği gibi bu repoda asla tutulmaz.

| İkisinin saklı yarısı (350), 0.7 | Tam isabet | ±1 kademe | Ciddi hata* | Fazla yüksek | Sıra uyumu |
|---|---|---|---|---|---|
| Yalnızca kurallar | %36 | %79 | 9 (%3) | 183 | 0,10 |
| **autogear: kurallar, emin değilse Haiku** | **%31** | **%78** | **6 (%2)** | **207** | **0,16** |

Kümelere göre, çalıştığı haliyle autogear: SWE-bench Verified'da %36 tam isabet, %83 ±1 kademe, 500'de 1 ciddi hata; Terminal-Bench'te %30, %73, 241'de 8 ciddi hata (%3). 0.7'nin iki kural düzeltmesinden önce (uzun bir tarifin içindeki "commit" gibi bir angarya kelimesi onu artık basit iş yapmıyor; uzun bir iş tarifi küçük değişiklik sayılmıyor) kuralların saklı yarıda 21 ciddi hatası vardı (%6). Kuralların emin olmadığı yerde Haiku'ya sormak ciddi hataları daha da azaltıyor ve sıra uyumunu yükseltiyor; bedeli, bir iki kademe fazla gönderilen işin artması, çünkü Haiku tereddütte üst kademeyi seçiyor. Ölçüm Haiku'ya 177 kez sordu, liste fiyatıyla $0,38. Bu rakamlar 0.7'nin: 0.8 üç tür isteği T3'e çıkardı (ayrıntısız anlatılmış hata, gizli hataları yakalayacak test yazma, plan isteği) ve bu kümelerde yeniden ölçülmedi.

Gösterdiği: autogear zor işi nadiren zayıf bir modele gönderiyor, ama uzun İngilizce hata kayıtlarında ve görev tariflerinde on beş dakikalık bir düzeltmeyi dört saatlik bir işten zor ayırıyor (sıra uyumu 0,16) ve güvenli taraftan harcıyor. Bu metinler insanların yazdığı kısa mesajlara, yani kuralların yapıldığı şeye benzemiyor; süreyi kademeye çeviren eşleme de bizim, bu yüzden "fazla yüksek"in bir kısmı işin pekâlâ hak ettiği bir kademe olabilir (yabancı bir kod tabanında hızlı bir düzeltme de bir aramadır).

**Çıktı kalitesi** (`eval/tasks/`): Küçük bir proje üzerinde 10 gerçek görev; her görevin sonucu Claude'un çalışırken görmediği testlerle kontrol edilir. Altı düzende çalıştırıldı (`node eval/tasks.mjs <kol>`). Maliyetler API liste fiyatıyla, her hücre bir kez, Claude Code 2.1.299, 17 Ekim 2026; ✗ kalan görev.

| Görev | Tür | autogear 0.8.1 | Opus · high | Opus · medium | Sonnet · medium | opusplan | Sonnet + Opus danışman |
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

Gösterdiği, önce autogear'ın aleyhine olan:

- **Bu görevlerde tek başına Sonnet · medium herkes kadar iyi ve en ucuza yaptı.** Biri hariç bütün düzenler onda on geçti; yani bu set modelleri birbirinden ayıramıyor, fazla kolay. Sonnet · medium $0,81, autogear $1,96, Opus · high $3,09 harcadı.
- **autogear burada tek başına Sonnet'ten pahalı**, çünkü üç hata avını (5, 8, 9) Opus · high'a verdi: $1,96'nın $1,50'si; Sonnet bunları da geçti. Bu yüzden 0.8.2 yeri belli hata avını (5, 9), 0.9 da `tasarruf`ta belirsiz olanı (8) Sonnet · high'a veriyor; bu set o zamandan beri yeniden çalıştırılmadı.
- Aynı sonuçla autogear Opus · high'tan %37, Opus · medium'dan %16 ucuz ve Opus · high'tan %40 hızlı.
- **Model mi efor mu:** Opus · medium, Opus · high'ın yaptığını %25 daha ucuza yaptı; Sonnet · medium da Opus · medium'un üçte birine.
- opusplan baştan sona Sonnet çalıştı: bu görevler plan modunda yapılmadı.
- Tek başarısızlık Opus danışmanlı Sonnet'te, yanıltıcı hatada: hata mesajının gösterdiği dosyayı düzeltti, asıl sebebi değil. autogear bu görevi de Sonnet'e verdi (elde hata mesajı olan bir hata net sayılıyor) ve geçti. Tek çalıştırma, yani şans payı büyük; ölçüm danışmana gerçekten sorulup sorulmadığını göstermiyor.
- Her hücre bir kez, küçük bir projede: yön gösterir, kesin değildir. Daha önceki bir çalıştırmada (0.7, altı görev) autogear dört görevde Opus · high ile aynı sonucu $2,38 yerine $0,31'e almıştı.

**Gerçek bir proje** (`--set sqlglot`): 100 bin satırlık bir SQL ayrıştırıcısı olan [sqlglot](https://github.com/tobymao/sqlglot)'ta Temmuz 2026'dan sonra düzeltilmiş 10 hata. Her biri kod düzeltmeden önceki hâliyle kuruldu ve o düzeltmenin eklediği testlerle kontrol edildi. Her hücre bir kez, Claude Code 2.1.299, 17 Ekim 2026. autogear 0.8.1 her hata avını Opus · high'a veren sürüm; 0.8.2 yeri belli olanı Sonnet · high'a veriyor.

| Görev | Tür | autogear 0.8.2 | autogear 0.8.1 | Sonnet · medium | Opus · high |
|---|---|---|---|---|---|
| sq-tsql-output | belirsiz anlatılmış hata | ✗ $1,28 Opus | ✗ $0,94 Opus | ✗ $0,28 | ✗ $1,38 |
| sq-duckdb-sample | yeri belli hata | $0,23 Sonnet | $0,22 Sonnet | $0,25 | $0,88 |
| sq-snowflake-join-marker | yeni özellik | $0,55 Opus | ✗ $0,54 Opus | $0,22 | $0,69 |
| sq-oracle-q-quote | yeni özellik | $0,28 Sonnet | $0,32 Sonnet | $0,41 | $1,05 |
| sq-starrocks-like | yanıltıcı hata | $0,43 Opus | $0,40 Opus | $0,21 | $0,62 |
| sq-mysql-charset-cast | belirsiz anlatılmış hata | $0,78 Opus | $0,80 Opus | $0,24 | $1,08 |
| sq-duckdb-array-insert | sebebi saklı hata | $0,22 Sonnet | $0,65 Opus | $0,16 | $0,62 |
| sq-quoted-escapes | yeri belli hata | ✗ $0,39 Sonnet | $0,42 Sonnet | $0,35 | $1,54 |
| sq-nulls-order-alias | sebebi saklı hata | $0,27 Sonnet | $0,74 Opus | $0,15 | $0,62 |
| sq-duckdb-empty-regexp | yeri belli hata | $0,48 Opus | $0,39 Opus | $0,22 | $0,52 |
| **Toplam** | | **8/10, $4,90** | **8/10, $5,43** | **9/10, $2,49** | **9/10, $8,98** |

Gösterdiği, önce autogear'ın aleyhine olan:

- **Tek başına Sonnet · medium 10 görevin 9'unu $2,49'a çözdü; Opus · high aynı 9'u $8,98'e; autogear 8'ini yaklaşık $5'a.** İki sette, yirmi görevde Opus, Sonnet · medium'un çözemediği hiçbir görevi çözmedi: Sonnet'in kaldığı tek görevde (`sq-tsql-output`; belirsiz bir rapor, kestirme düzeltmesi T-SQL'in OUTPUT komutunu bozuyor) bütün düzenler kaldı.
- autogear'ın iki başarısızlığı, tek başına Sonnet · medium'un geçtiği görevler; biri Sonnet'te, biri Opus'ta. Tek çalıştırmada bu, zayıf model değil şans payı gibi okunuyor.
- **Hata avı ayrımı tuttu:** iki yeri belli hata avı 0.8.2'de Sonnet'e gitti ve $0,49'a geçti; 0.8.1'de Opus'ta $1,39'du.
- autogear burada Sonnet'in de aynı iyi yaptığı işleri Opus'a veriyor: iki belirsiz rapor, yanıltıcı olan ve iki görev daha Opus'ta $3,52 tuttu; aynı görevler Sonnet · medium'da $1,17.
- Her hücre bir kez. Üç tur, liste fiyatıyla yaklaşık $65 daha tutar.
- 0.9'dan beri `tasarruf` zor işi ve belirsiz raporları da Sonnet · high'a veriyor; burada Opus'a giden görevlerin çoğu bugün Sonnet'te çalışırdı. Bu set o zamandan beri yeniden çalıştırılmadı.

## Proje yapısı

| Yol | İçeriği |
|---|---|
| `hooks/register.tsx` | hooks modülü: olaylar, `/gear` komutu, durum satırı, kartı çizen kanca |
| `hooks/card.tsx` | tasarruf kartı, Box ve Text'ten bir ağaç |
| `hooks/core/signals.ts` | sınıflandırıcı: kurallar, etiketler, Türkçe ve İngilizce sinyaller |
| `hooks/core/languages.ts` | İspanyolca, Almanca, Fransızca, Rusça, Çince ve Japoncanın sinyalleri |
| `hooks/core/llm.ts` | kurallar emin olamayınca Haiku'ya sorulan soru |
| `hooks/core/tiers.ts` | profiller: kademeden model ve efora |
| `hooks/core/policy.ts` | bir kademeye uygulanan tavan ve önbellek, uyarılacak limit pencereleri |
| `hooks/core/pacing.ts` | limit pencerelerini okur, uyarıyı yazar |
| `hooks/core/models.ts` | model aileleri, kimlikler, efor seviyeleri |
| `hooks/core/prices.ts` | liste fiyatları ve bir turun maliyeti |
| `hooks/core/journal.ts` | karar günlüğü: kayıtlar, şikâyet ve kırık test işaretleri, senin işaretlerin, rapor |
| `hooks/core/settle.ts` | kuralların, Haiku'nun cevabının ve süren işin bir kademeyi nasıl belirlediği |
| `hooks/core/savings.ts` | modele göre toplamlar, tasarruf, markdown rapor |
| `hooks/core/handover.ts` | devir notu: ne zaman önerilir, modelden ne istenir, yeni sohbete ne gider |
| `hooks/core/settings.ts` | kayıtlı ayarlar ve istatistik, `/gear` ayrıştırma |
| `hooks/core/text.ts` | autogear'ın söylediği sözler (İngilizce ve Türkçe) ve dil seçimi |
| `hooks/core/doctor.ts` | `/gear doctor`: kontroller ve önerileri |
| `hooks/core/switch.ts` | durum etiketinin çizimi |
| `hooks/core/version.ts` | denendiği en yeni Claude Code sürümü |
| `docs/` | `sonraki-adimlar.md` (açık adımlar ve kararlar) ve `demo/` (yukarıdaki animasyon ve nasıl yapıldığı) |
| `tests/` | kurallar, politika, fiyat ve tasarruf; sahte motora karşı yönlendirici; sınıflandırıcı ölçümü |
| `eval/` | sınıflandırma ölçümü, dış ölçütler (`external.mjs`) ve çıktı kalitesi görevleri |
| `scripts/` | canlı duman testi; autogear'ın kararlarını oturum kayıtlarından toplayan `harvest.mjs` |

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

`node eval/tasks.mjs <kol>` `--runs N` ve `--set sqlglot` alır: [sqlglot](https://github.com/tobymao/sqlglot)'un (MIT, yaklaşık 100 bin satır) 10 gerçek hatası; her biri kodun o hata düzeltilmeden hemen önceki hâliyle, git geçmişi olmadan kurulur ve o düzeltmenin eklediği testlerle kontrol edilir. sqlglot'un `eval/.work/repos/sqlglot` altına klonlanmış olmasını ve Python 3.9+ ister. `--dry` bu görevlerin her birini ücretsiz kontrol eder: verildiği hâliyle kalmalı, gerçek düzeltmeyle geçmeli. `gearbox-0.8.1` kolu, hata avı ayrılmadan önceki autogear; iki kuralı kıyaslamak için.

Son ikisi gerçek model çağrısı yapar, biraz kota harcar; Haiku cevapları `eval/.work` altında önbelleğe alınır. `plugin test`, Claude Code 2.1.295 ya da daha yenisini ister (2.1.295 ve 2.1.299 kullanıldı): eski sürümlerde hooks modülü yüklenmez ve ona dokunan her test başarısız olur. PATH'teki `claude` masaüstü uygulamasının kendi sürümünden eski olabilir; Windows'ta o sürüm `%APPDATA%\Claude\claude-code\` ya da yeni uygulamalarda `%LOCALAPPDATA%\Claude-Data\<profil>\claude-code\` altındadır. Ölçüm betikleri bunların en yenisini kendileri bulur (`CLAUDE_BIN` ile değiştirilebilir) ve 2.1.295'ten eski bir sürümde hiçbir şey harcamadan durur.

**Kendini test konusu yapmadan geliştirmek.** Yeni bir sürüm dört adımdan geçer, her biri bir sonrakinden önce, ve yalnızca sonuncusu gerçek işe dokunur:

1. Çevrimdışı: `claude plugin test .` (kurallar, politika, yönlendirici, eval kümeleri) ve `node eval/external.mjs` (dış ölçütler, ücretsiz; `--haiku` biraz kota harcayarak Haiku'nun cevaplarını ekler).
2. Gerçek işte gölge modda (`/gear shadow`): autogear seçer ve yazar, cevabı seçicideki model verir.
3. `node scripts/harvest.mjs` bu seçimleri oturum kayıtlarından `eval/.work/harvest.json` dosyasına toplar; etiketlenince bir sonraki sürümün üzerinden yeniden oynatılacağı bir gerçek kullanım kümesi olurlar.
4. Ancak ondan sonra `/gear on`.

**Bir değişikliği kendi Claude Code'unda denemek.** Claude Code klasörü değil, eklentinin kurulu bir kopyasını çalıştırır. Düzenledikten sonra `.claude-plugin/plugin.json` içindeki `version` değerini yükselt, sonra:

```bash
claude plugin marketplace update autogear
```

```bash
claude plugin update autogear@autogear
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
- [x] Senin işaretlerinle karar günlüğü, kuralların nerede yanıldığını görmek için
- [x] Gerçek kullanımın incelenmesi: sistem notları, Haiku'ya sınır, süren işin tutulması, yazıyla istenen model (0.6)
- [x] Gölge mod, dış ölçütler ve gerçek kararların toplanması: yeni bir sürüm, kimsenin işini yönlendirmeden önce sınanır (0.7)
- [x] Limit pencereleri seçimi düşürmek yerine uyarıyor; efor tablosu ölçümlere göre yeniden ayarlandı (net işte Sonnet · medium, hata avında high, istenmedikçe max yok); açık, gölge ve kapalıyı ayrı gösteren durum satırı; gölge kaydı seçicinin kırptığını da tutuyor; plan modu Opus'a gidiyor (0.8)
- [x] Yirmi görevde beş düzenle kıyas, onu sqlglot'un gerçek hataları; `tasarruf`ta zor iş Sonnet · high'a geçti, Opus kritik işe, plan moduna ve istenince kullanılır (0.9)
- [x] Büyük sohbet, devir notuyla temiz bir sohbet önerir (0.10); kurallar sekiz dili okur (0.11)
- [x] İngilizce komutlar, İngilizce ya da Türkçe konuşma, her cevabın altında cevabı veren modeli söyleyen tek italik satır ve `/gear doctor` (0.12)
- [ ] Alt ajan kuralları: istekleri kancaya ulaşıyor (bir `agentId` taşıyorlar) ve bugün olduğu gibi geçiriliyor; keşif ajanlarını Haiku · low'a vermek sırada, önce kotadaki paylarının ölçülmesi gerekiyor
- [ ] Günlükteki düzeltmelerden öğrenme

## Neye bağlanır, ne çalıştırır

autogear tek bir hooks modülüdür (`hooks/register.tsx`). Bağlandığı olaylar ve her birinde yaptığı:

- **`prompt.submit`**: gönderdiğin her mesajı sınıflamak için okur. Baştaki seçimi (`+opus`) model görmeden siler; **temiz sohbet**e bastıysan devir notunu ilk mesajına bir kez ekler. Mesajda başka hiçbir şey değişmez.
- **`turn.step`**: ana sohbetteki her model isteğinden hemen önce autogear'ın seçtiği modeli ve eforu koyar. Yardımcıların (alt ajanların) istekleri değişmeden geçer; yalnızca modelleri cevabın altındaki satır için not edilir.
- **`turn.complete`**: cevabı hangi modelin verdiğini ve kullandığı tokenları okur (kendini denetleme ve tasarruf için) ve cevabın altına italik satırı ekler.
- **`tool.call`** (yalnızca Bash): bir komut çalıştıktan sonra, ana sohbetteki bir test, derleme, commit ya da push'un geçip geçmediğini okur (kartopu freni ve temiz sohbet önerisi için). Hiçbir komutu değiştirmez ya da durdurmaz.
- **`session.append`** (yalnızca ekler): Claude Code'un plan modunda eklediği notları okur, plan modunun açık olduğunu bilmek için.
- **`session.start`**, **`session.end`**: ayarları yükler; bir `/clear` olduğunu not eder.
- **`ui.render`**: istem üstündeki durum satırını, devir notu panelini ve `/gear savings` kartını çizer.
- **`command.run`** (`gear`): `/gear`'ı cevaplar.

Kendi başına çağırdıkları:

- **Tek bir eğik çizgi komutu, `/clear`**; o da yalnızca durum satırında **temiz sohbet**e bastığında. autogear başka hiçbir komut çalıştırmaz.
- **Bir model**, Claude Code üzerinden: kurallar emin olamayınca Haiku, devir notu için oturumun modeli (bkz. Gizlilik).
- **Kendi deposu** (ayarlar, günlük, toplamlar), durum yazısı, kısa bildirimler ve `/gear doctor` için iki ortam değişkeni (bkz. Gizlilik).

## Gizlilik

autogear'ın sunucusu yoktur ve kendi başına hiçbir ağ isteği yapmaz. Sakladığı her şey makinende, Claude Code'un her eklentiye verdiği depoda durur:

- ayarların (mod, profil, dil, anahtarlar);
- karar günlüğü: son 200 mesajın her biri için ilk 100 karakteri, kademe, model ve efor, gerekçeler, maliyet; `/gear reset` siler;
- tasarruf toplamları ve "temiz sohbet"e bastığın devir notu (bir sonrakiyle değişir).

`/gear doctor` iki ortam değişkenini okur, `CLAUDE_CODE_EFFORT_LEVEL` ve `CLAUDE_CODE_SUBAGENT_MODEL`: eforu ya da yardımcıların modelini sabitleyip sabitlemediklerini söylemek için. Başka hiçbir değişken ya da ayar okunmaz.

Bir modele giden şeyler, hep Claude Code'un kendisi ve senin hesabınla, hiçbir zaman üçüncü bir tarafa değil:

- **Kurallar emin olamayınca Haiku.** Mesajın ilk 4.000 karakteri (ve bir öncekinin kademesi), işin hangi kademede olduğunu soran kısa bir yönergeyle gönderilir. Küçük bir istektir, yaklaşık $0,0002; `/gear ask off` durdurur, o zaman emin olunamayan mesajları yalnızca kurallar okur.
- **Devir notu.** Büyük bir sohbet bir işi bitirince autogear, aynı önbellekten, modelden o sohbetin sekiz satırlık özetini ister. Sana gösterilir; "temiz sohbet"e basmazsan hiçbir yere gitmez, basarsan yalnızca yeni sohbete gider. `/gear band off` öneriyi durdurur.

`eval/` ve `scripts/` altındaki ölçüm betikleri yalnızca sen çalıştırınca çalışır; gerçek modelleri çağırır ve önce ne harcayacağını söyler. `node eval/external.mjs`, ölçtüğü herkese açık test metinlerini Hugging Face'ten (SWE-bench Verified) ve GitHub'dan (Terminal-Bench) `eval/.work` altına indirir; bu indirme isteklerinden başka bir şey göndermez.

## Lisans

MIT
