# gearbox — sonraki adımlar

Bu dosya gearbox için yapılacak işlerin ve verilmiş kararların listesi. **Adım 1, 2, 3 ve 6 yapıldı (0.8.0), 9, 10 ve 16 yapıldı (0.12.0, 18 Ekim 2026); 0.12.1 başvuru öncesi taramanın düzeltmeleri (adım 11). Adım 4, 5, 12 ve 17 kısmen yapıldı (altlarındaki notlara bak); kalanlar yapılmadı.** Liste 16 Ekim 2026'daki araştırma oturumundan çıktı: GitHub'daki benzer projeler, Claude Code belgeleri, gearbox'ın kendi kayıtları ve bir ölçüm videosu incelendi. Kullanıcı "önerilerdeki her şeyi yapacağız" dedi. Bir adım yapılınca burada işaretlenir; bir karar değişirse gerekçesiyle yazılır.

Terimlerin sade anlamları: `~/.claude/sozluk.md`.

## Şu anki durum (16 Ekim 2026)

- **opusplan ve "efor her zaman max" ayarı kaldırıldı** (kullanıcı kararı; `~/.claude/settings.json`). Model ve eforu kullanıcı kendisi seçiyor. Yeni sohbetler hesabın varsayılanıyla açılır: Opus 5.5, efor medium.
- **Bu ayarlar nereden gelmişti:** 4 Eylül 2026'da bir Stajbul sohbetinde kullanıcı "önemli işlerde Opus, önemsizlerde Sonnet kullanmak mümkün mü?" diye sordu. O sohbetteki Claude üç ayar yazdı: `model: opusplan`, `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`, `CLAUDE_CODE_EFFORT_LEVEL=max`. "max" kullanıcının sorusunda yoktu.
- **Yardımcıların (alt ajanların) Sonnet'e sabitlenmesi de kaldırıldı** (kullanıcı kararı, 16 Ekim 2026). Artık kullanıcının seçtiği ana modeli kullanıyorlar; kendi modeli tanımlı yardımcılar hariç.
- **gearbox:** kullanıcı kapalı tutmak istiyor. Kayıtta mod "gölge": seçmiyor ama her mesajda karar verip deftere yazıyor, emin olmayınca Haiku'ya soruyor. Tamamen kapatmak için `/gear sabitle`. Üstteki banttaki düğme gölge modda KAPALI gibi görünüyor; tıklayınca gearbox kapanmıyor, açılıyor (bkz. adım 2; 0.8.0'da düzeldi, kullanıcının kurulu kopyası güncellenince geçerli olur).
- **Testleri çalıştırmak:** bilgisayardaki komut satırı `claude` 2.1.278 ve gearbox'ın kullandığı Mod API'sinden eski; onunla `claude plugin test .` 25 testte düşüyor. Masaüstü uygulamasının içindeki 2.1.295 ve 2.1.299 bütün testleri geçiriyor (0.7.1 de 2.1.278'de yüklenmiyordu; bkz. adım 1, "Uyumluluk"): 17 Ekim'den beri uygulama bunları `%LOCALAPPDATA%\Claude-Data\claude_pzs8sxrjxfjjc\claude-code\2.1.299\f0584be0fbaf\claude.exe` altında tutuyor (eskiden `%APPDATA%\Claude\claude-code\`; klasör adları güncellemeyle değişir). Ölçüm betikleri (`scripts/claude.mjs`) en yeni sürümü kendileri buluyor ve 2.1.295'ten eskisinde hiçbir şey harcamadan duruyor.
- **17 Ekim'deki çökme:** hata yakalayan test görevinin gizli testi, hiç test dosyası bulamayınca kendini yeniden çalıştırıyordu; yüzlerce Node.js kopyası RAM'i doldurdu, bilgisayar yeniden başlatıldı. Düzeltildi: iç çalıştırma bir işaret taşıyor ve o işaretle hiçbir şey başlatmıyor, dosya yoksa iç çalıştırma hiç başlamıyor, gizli testler kopyadan siliniyor, her çalıştırmanın 30 saniye sınırı var. Kalan 2.245 geçici klasör silindi. `TESTED_THROUGH` 18 Ekim'de 2.1.299'a çıkarıldı: canlı duman testi (`node scripts/smoke.mjs`, $0,11) 2.1.299'da Haiku, Opus ve Sonnet seçimlerini gördü. Duman testinin üçüncü beklentisi eskiydi (zor iş Opus sanılıyordu; 0.9.0'dan beri tasarruf profilinde Sonnet), düzeltildi.
- **Kayıtlardan:** plan modu neredeyse hiç kullanılmamış (2.306 mesaj kaydı, 0 plan modu; plan onayı 1 kez). Adım 1'e bakarken 17 Ağustos 2026'daki bir oturumda bir plan modu satırı bulundu; o sayımın dışında kalmış. Bütün sohbetlerde yaklaşık 200 kez yardımcı (alt ajan) açılmış.

## gearbox ve önbellek: kesin kural

Önbellek, Anthropic'in konuşmanın değişmeyen başını kısa süre hatırlaması; hatırlanan kısım çok ucuza okunur. Model değişince bu hafıza kullanılamaz ve konuşma yeni model için baştan okunur. Efor değişince bozulmaz (Opus 5.5, Sonnet 5.5 ve Haiku 5.5'te, abonelikte; Claude Code belgesi).

| Durum | Model değişir mi? | Önbellek |
|---|---|---|
| Bir cevabın içindeki adımlar | Hayır, hiçbir zaman | Korunur |
| Yeni mesaj öncekiyle aynı modele düşüyor | Hayır | Korunur |
| Konuşma 40 bin tokenı geçmiş ve yeni iş daha ucuz bir modele düşüyor (ör. Opus'la büyük işten sonra commit) | Hayır; sadece efor düşer (0.9.1'den beri, her kademe farkında) | Korunur |
| Konuşma 40 bin tokenı geçmiş ve yeni iş bir kademe daha zor | Hayır; sadece efor değişir | Korunur |
| Yeni mesaj başka modele düşüyor (konuşma küçük; ya da büyük konuşmada iki kademe ya da daha fazla zor iş, Haiku'dan çıkış, plan modu, kullanıcının `+haiku`/`+opus` gibi seçimi) | Evet | Yeni model konuşmayı bir kez baştan yazar; eski modelin önbelleği durur |

**Araştırma (18 Ekim 2026, Claude Code 2.1.299'un kendi kodundan):** abonelikte ana konuşmanın önbelleği 1 saat yaşıyor, her okumada yenileniyor; bazı durumlarda (limit aşımı, bazı sunucu ayarları) 5 dakika. Önbellek model başına tutuluyor: Haiku'ya geçmek Opus'un önbelleğini silmez, 1 saat içinde Opus'a dönünce eski kısım hazır; yalnızca aradaki yeni mesajlar yazılır. Asıl maliyet, daha ucuz modelin bütün konuşmayı bir kez yazması.

**Karar (kullanıcı, 18 Ekim 2026; 0.9.1):** küçük konuşmada model serbestçe değişir (kalite önce). Büyük konuşmada daha ucuz modele hiç inilmez, sadece efor düşer. Kullanıcının sözü: "opus ile büyük bir sohbette isek commit etmek için haikuya dönmesin". Kullanıcının açık seçimi (`+haiku`, "haiku ile yap") yine geçerli.

**Önceki karar (16 Ekim 2026):** Bu tasarım şimdilik kalıyor. Model değiştirmenin bedeli tasarruf hesabında gearbox'ın aleyhine sayılıyor. Kıyas ölçümünde (adım 4) "sadece efor" seçeneği daha iyi çıkarsa ona geçilir. Ek iş (adım 10): model değişip konuşma baştan okunduğunda italik satır bunu da yazsın.

## Kullanıcının kararları

- **Limit yüzünden model ya da efor düşürülmeyecek.** Görevin başarıyla bitmesi limitin dolmasından önemli. Bunun yerine uyarı gösterilir (adım 3).
- **Dil:** Claude Code'un dil ayarı görülebiliyorsa gearbox o dilde konuşur; o dil gearbox'ta yoksa İngilizce. **Komutlar her zaman İngilizce** (adım 9).
- **Anthropic'in resmî eklenti kataloğuna kesinlikle başvurulacak. Hedef: katalogda model seçen ilk Mod olmak** (16 Ekim 2026). Bugün katalogda model seçen eklenti yok; rakipler de başvurabilir, hız önemli (adım 11).
- **İsim kararı verildi (18 Ekim 2026): `autogear`** (otomatik vites). Kullanıcı `savelimits` ve `rightmodel` gibi anlamı açık isimler düşündü; "otomatik" kısmı gearbox'ın farkı olduğu için `autogear` seçildi. Komut `/gear` kaldı. GitHub'da `autogear` adlı bir repo 8 yıldızla var (BujuArena/AutoGear), ilgisiz; açıklama cümlesinde "Claude Code" geçmeli. Bu belgenin eski bölümleri tarihçe olarak "gearbox" adını koruyor. Eklenti kimliği `autogear` oldu; kurulu kopya `gearbox@gearbox` idi ve kayıtlı veri (ayarlar, günlük, toplamlar) kimliğe bağlı bir dosyada duruyor (`~/.claude/plugins/store/`), bu yüzden taşınması gerekir. **Taşındı (18 Ekim 2026):** GitHub deposu `emreyaman1/autogear` oldu, kurulum `autogear@autogear`, eski veri (33 tur, 86 kayıt, ayarlar) yeni depo dosyasına kopyalandı; eski dosyalar `~/.claude/plugins/store/gearbox_*` yerinde duruyor. Katalogdaki isim kabulden sonra değişmiyor.
- **Videodan çıkan maddeler onaylandı** (kullanıcı: "doğruysa ekleyelim"). Doğrulama adım 6'da; biri düzeltildi.
- **Dürüst kıyas tablosu yapılacak:** opusplan ve diğerleriyle. "Her şey Sonnet" kıyası çıkarıldı; gerçek kullanıcı varsayılan olarak Opus kullanıyor (adım 4).
- **Her cevabın altında, italik, cevabı hangi modelin verdiği yazacak.** gearbox kapalıyken de (adım 10).
- **Stajbul'daki "birden çok metin üretip seçtirme" fikri iptal edildi** (gearbox'la ilgisi yok; kayıt için).

## Öncelik sırası

| # | Adım | Öneren |
|---|---|---|
| 1 | Plan işlerinde Opus (yapıldı, 0.8.0) | Kullanıcı + Claude |
| 2 | Gölge kayıt ve açma-kapama düğmesi düzeltmesi (yapıldı, 0.8.0) | Claude |
| 3 | Limit kuralı: düşürme yok, uyarı var (yapıldı, 0.8.0) | Kullanıcı kararı |
| 4 | Dürüst kıyas: Opus, opusplan, Sonnet + Opus danışman (bir tur yapıldı, 17 Ekim) | Kullanıcı + Claude |
| 5 | Dil ve uzunluktan bağımsız sınıflandırma (0.11.0, 17 Ekim; diller ve yapı işareti yapıldı, madde 3, 4, 6, 7 açık) | Kullanıcı + Claude |
| 6 | Efor tablosunu ölçüme göre yeniden ayarlamak (yapıldı, 0.8.0) | Claude (video) |
| 7 | Alt ajan yönlendirme | Claude |
| 8 | advisor (danışman) ile birleştirme | Claude |
| 9 | Dil ayarı ve İngilizce komutlar (yapıldı, 0.12.0, 18 Ekim) | Kullanıcı kararı |
| 10 | Her cevabın altında italik model satırı (yapıldı, 0.12.0, 18 Ekim) | Kullanıcı |
| 11 | Görünürlük ve resmî dizine başvuru | Kullanıcı + Claude |
| 12 | Ölçümleri genişletmek (sqlglot ile bir tur yapıldı, 18 Ekim) | Kullanıcı + Claude |
| 13 | Sonuçlardan öğrenmek | Claude |
| 14 | context-mode ile birlikte denemek | Claude |
| 15 | Model kimliklerini kendiliğinden güncellemek | Claude |
| 16 | `/gear doctor` komutu (yapıldı, 0.12.0, 18 Ekim) | Claude |
| 17 | Büyük sohbetten temiz sohbete geçmek (0.10.1, 17 Ekim; öneri ve "temiz sohbet" düğmesi gerçek sohbette çalıştı, 18 Ekim) | Kullanıcı |

## Adımlar

### 1. Plan işlerinde Opus

- **Ne:** Plan modundaki her istek Opus'a gitsin. Eforu planın büyüklüğüne göre seçilsin: küçük plan medium, orta high, büyük ve çok parçalı plan xhigh. Plan modunda olmasa da "plan yap", "nasıl yapalım", "mimari", "yol haritası" gibi istekler en az T3 sayılsın.
- **Sorun çözme:** Kullanıcı her sorun çözmede Opus istedi. Kanıta göre değiştirilmiş hâli şöyle. Belirsiz hata ("bazen çöküyor, neden?") Opus high'a gitsin. Hata mesajı ve yeri belli net hata Sonnet medium'da başlasın; ilk deneme testleri geçemezse hemen Opus'a çıkılsın.
- **Kanıt:**
  - Kendi ölçümümüzde (görev 4) net hatayı Sonnet $0,072'ye, Opus·high $0,255'e çözdü.
  - Videoda (adım 6) yeri belli 5 hata görevinde Sonnet medium 13/13 başardı, Opus high'ın üçte bir maliyetiyle. Yanıltıcı hatada ise Opus high 6/6, Sonnet medium 4/6. Aynı hata "bu çalışmıyor, düzelt" diye belirsiz anlatılınca Sonnet 0/2.
- **Önce bakılacak:** Mod API'si gearbox'a plan modunda olunduğunu bildiriyor mu? Kaynaklar: `types/index.d.ts`, `/plugin-types` çıktısı, Anthropic'in yerleşik modları (github.com/anthropics/claude-code/tree/main/mods). Bildirmiyorsa sadece mesaj metninden tanınır.
- **Bitti sayılır:** testler, README'de "Using it" notu, kayıtta plan kararlarının görünmesi.

**Bulgu (16 Ekim 2026): Mod API'si plan modunu bildiriyor**, ama doğrudan bir "şu an hangi moddayım" sorusuyla değil:

- Claude Code plan modundayken modele bir not ekliyor; bu not oturuma ayrı bir satır olarak kaydediliyor. Mod'lar her kaydedilen satırı `session.append` olayında görüyor (kapı: `attachment`, ad: `plan_mode`; yeniden girişte `plan_mode_reentry`; plan modu bitince `plan_mode_exit`). Aynı notlar `prompt.attachment` olayında da geçiyor, ama o olayın zamanlaması isteğin içinde olabilir; bu yüzden `session.append` seçildi. Belgeye göre kaydedilen satırlar turun ilk isteğinden önce yazılıyor.
- Kullanıcının kendi kayıtlarında doğrulandı: 17 Ağustos 2026'daki bir oturumda `plan_mode` ve onaydan sonra `plan_mode_exit` satırları var. İkisi de bir turun ortasında geldi (biri bir düzenlemeden sonra, biri plan onayından sonra).
- `permissionMode` yalnızca bir yardımcı (alt ajan) açılırken, ana oturumun modu olarak görünüyor; her mesajda okunabilecek bir alan yok.
- Kaynak: Claude Code 2.1.299'un Mod türleri (plugin-authoring becerisinin yazdığı `claude-code.d.ts`). github.com/anthropics/claude-code/tree/main/mods ve `/plugin-types` bu oturumda açılmadı; türler aynı bilgiyi veriyor.

**Yapıldı (0.8.0'a girecek):**

- Plan modundaki her istek Opus'a gidiyor; efor kademeye göre: T0–T2 medium, T3 high, T4 xhigh. Seçicinin üstüne çıkmıyor; kullanıcının `+sonnet` gibi seçimi önde. Önbellek kuralı plan modunu tutmuyor (kasıtlı geçiş sayılıyor).
- Plan modu notu bir turun ortasında gelirse bir sonraki turdan itibaren geçerli: bir tur tek modelle gider. Onaydan sonra planın uygulanması aynı turda, yani Opus'la sürüyor; sonraki mesaj yeniden sınıflanıyor.
- Plan modu dışında plan isteyen metin ("plan çıkar", "planla", "nasıl yapalım", "yol haritası", "plan the ...", "how should we approach") en az T3. "planı uygula" bu sayılmıyor. 143 etiketli mesajda kademe isabeti değişmedi.
- Cevabın altındaki satırda ve günlükte "plan modu" yazıyor; `/gear` durumunda "Plan modu: açık" satırı var.
- **Doğrulanmadı:** gerçek Claude Code'da plan modu notunun turun ilk isteğinden önce geldiği (belgeye ve kayıtlara dayanıyor, canlı denenmedi; bir deneme biraz kota harcar). Testler sahte motorla.

**Uyumluluk (17 Ekim 2026, ana oturumun sorusu üzerine):** `session.append` eski Claude Code'da yok. 2.1.278 bu yüzden 0.8.0'ı yüklemiyor.

- **0.7.1 de 2.1.278'de yüklenmiyordu:** son commit'in kopyası 62 geçti / 25 kaldı; bant durum çağrısında düşüyor. 2.1.278 gearbox'ı hiçbir zaman çalıştırmadı; 0.8.0 yalnızca hatanın çıktığı satırı değiştirdi.
- **Test sonuçları (0.8.0):** 2.1.299 105/105, 2.1.295 105/105, 2.1.278 75 geçti / 30 kaldı. Geçen 75 test hooks modülüne hiç dokunmayan saf testler.
- **Parçalı çalışma neden mümkün değil:** Claude Code modülü çalıştırmadan önce kaynak koddaki olay ve çağrı adlarını kendi API'siyle karşılaştırıyor; tanımadığı tek bir ad modülün tamamını reddediyor. Bu yüzden try/catch işe yaramaz. Plan kancasını ayrı bir modüle taşımak denendi; `hooks.json` eklenti başına tek modül kabul ediyor ("a second entry is refused"), geri alındı. 0.7.1'in zaten kullandığı olaylarda (mesaj gönderme, istek, tur sonu) izin modu bilgisi yok.
- **En düşük sürümü bildirmek de mümkün değil:** eklenti tanımında böyle bir alan yok; Claude Code'daki "minVersion" kontrolleri Claude Code'un kendi güncellemesi için. Yüklenmeyen bir modül uyarı da gösteremez.
- **Karar:** `session.append` kalıyor. En düşük sürüm 2.1.295; 0.7.1'in denendiği sürümle aynı. README'lerin kurulum ve geliştirme bölümlerine yazıldı.
- **Açık risk:** 2.1.279–2.1.294 arasındaki sürümler bu bilgisayarda yok, denenemedi. Bunlardan biri 0.7.1'i yükleyip 0.8.0'ı reddedebilir. Masaüstü uygulaması kendi güncel sürümünü getiriyor; terminaldeki `claude` ise eski kalabilir.
- Plan modu bilgisi artık oturumun eklenti durumunda (`gearbox.planning`) tutuluyor; modül yeniden yüklense de unutulmuyor.

### 2. Gölge kayıt ve açma-kapama düğmesi

- **Gölge kayıt:** Deftere iki seçim yazılsın: gearbox'ın istediği (tavandan önce) ve uygulanabilecek olan (tavandan sonra). Bugün tavan neyse kayıt da ona kırpılıyor; Opus ihtiyacı görünmüyor.
- **Düğme hatası:** Banttaki düğme yalnızca açık ya da kapalı gösteriyor. Gölge modda kapalı (gri) görünüyor ama gearbox çalışıyor; düğmeye basınca gearbox kapanmıyor, açılıyor. Düğme üç durumu ayrı göstermeli (açık / gölge / kapalı); basınca ne olacağı yazmalı.
- **Bitti sayılır:** `/gear log` iki seçimi gösterir; düğme üç durumu doğru gösterir; testler.

**Yapıldı (16 Ekim 2026, 0.8.0'a girecek):**

- **Kayıt:** Seçici tavanı seçimi kırptığında karar, kırpılmadan önceki seçimi de taşıyor. Günlükte "Model · efor" sütunu "Sonnet · high (tavansız Opus · medium)" gibi görünüyor; altta "Seçici tavanı yüzünden kırpılan: N, bunların M tanesinde daha güçlü bir model istenmişti" satırı var. Gölge satırı da yazıyor: "önerirdi, tavan olmasa Opus · medium". Bu açık modda da kaydediliyor. Eski kayıtlar sorunsuz okunuyor. `scripts/harvest.mjs` yeni satırı (ve limit uyarısını) okuyacak şekilde güncellendi.
- Komut hâlâ `/gear kayit`; İngilizce adı (`/gear log`) zaten çalışıyordu, adım 9'da asıl ad olacak.
- **Düğme:** Tek anahtar yerine bir durum etiketi ve düğmeler. Etiket: AÇIK (yeşil), GÖLGE (mor), KAPALI (gri), DURDU (turuncu: seçimler uygulanmadığı için kendini kapatmış). Yanında öteki durumlar için düğmeler, üstlerinde basınca ne olacağı yazıyor: "aç", "gölgeye al", "kapat"; durmuşsa "yeniden dene". Gölgedeyken "kapat"a basmak kapatıyor, açmıyor.
- **Neden üç konumlu anahtar değil:** üç konumlu tek bir anahtarda basınca hangi duruma geçileceği bir sıraya bağlı kalır ve kullanıcı yine tahmin etmek zorunda kalır. Etiket + adı yazılı düğmeler bunu ortadan kaldırıyor.
- Elle seçilen her durum "durdu" hâlini bitiriyor; böylece bant seçileni gösteriyor (eskiden durmuşken gölgeye alınca bant hâlâ "devre dışı" gösterirdi).
- **Doğrulanmadı:** masaüstü uygulamasında görünüşü (etiketin boyu, düğmelerin yerleşimi). Testler sahte motorla ağacı kontrol ediyor, ekranı değil.

### 3. Limit kuralı: düşürme yok, uyarı var (kullanıcı kararı)

Bugünkü kural (`hooks/core/pacing.ts`, `hooks/core/policy.ts`) iki limit penceresine (5 saatlik ve haftalık) bakıyor. "Eşit hızda harcasaydın şu an yüzde kaçta olurdun" hesabına göre:

- %90 ve üstündeyse kritik: zor ve kritik işler standarda iniyor (Opus yok).
- Beklenenden 20 puan öndeyse sıkışık: efor bir kademe düşüyor.
- Pencere bitmek üzereyken çok hak kalmışsa bol: efor bir kademe artıyor.

**Karar (kullanıcı, 16 Ekim 2026):** "Limit dolup hiç cevap alamamaktansa zayıf modelle devam etmek iyidir" mantığı iptal. Görevin başarıyla bitmesi limitin dolmasından önemli.

- Kritik ve sıkışık durumlarda model ve efor **düşürülmez**.
- Bunun yerine cevabın altındaki satırda ve bantta uyarı çıkar. Örnek: "5 saatlik limit %92. Bu iş Opus ile yapılıyor; limit dolabilir."
- "Bol" durumundaki efor artışı başarıyı artırdığı için kalabilir; uygularken karar verilir.
- Bu değişiklikle 'kalite' profilindeki eski hata da ortadan kalkar: kritikte "Opus yok" yazıyor ama Opus kullanıyordu.
- Testler ve README ("Pace" bölümü) güncellenir.

**Yapıldı (16 Ekim 2026, 0.8.0'a girecek):**

- Kritik ve sıkışık durumda model, efor ve kademe artık değişmiyor. Karar uyarıyı taşıyor; cevabın altındaki satırda ve aç/kapa bandında görünüyor: "⚠ 5 saatlik limit %92: bu iş Opus · high ile yapılıyor, limit dolabilir". Sıkışıkta "hızlı harcanıyor ... limit erken dolabilir". Gölge modda uyarı, cevabı gerçekten veren seçici modelini yazıyor. gearbox kapalıyken (sabitle) limitlere bakmadığı için bant uyarı göstermiyor.
- Kritik durumda Haiku'ya soru sormama kuralı da kaldırıldı: karar limit yüzünden kötüleşmesin. Sorunun maliyeti çok küçük (yaklaşık $0,0002).
- **'Bol' kararı:** efor artışı kaldı ama daraltıldı. Yalnızca zor ve kritik işte (T3+) bir kademe artıyor; max'a hiç çıkmıyor (en çok xhigh), seçicinin üstüne de çıkmıyor. Standart işte (T2) artık artmıyor. **Neden:** adım 6'nın kanıtı net anlatılmış işte yüksek eforun faydasız olduğunu, bir görevde kötüleştirdiğini gösteriyor; T2 artık Sonnet medium. Zor işte fazla efor amaca uygun; max ise yalnızca kullanıcı isterse (adım 6 kuralı).
- Testler: kritik ve sıkışıkta seçimin değişmediği, uyarı metni, 'bol'un yalnız T3+ ve en çok xhigh olduğu, yönlendiricide Opus'un korunup uyarının satırda ve bantta göründüğü.
- **Doğrulanmadı:** gerçek bir limit %90'ı geçtiğinde uygulamada nasıl göründüğü; testler sahte motorla.

### 4. Dürüst kıyas ölçümü

- **Ne:** `eval/tasks.mjs` bugün gearbox'ı yalnızca "her şey Opus·high" ile kıyaslıyor. Kıyaslanacaklar:
  - **Opus, varsayılan efor (medium):** Pro kullanıcısının gerçekte kullandığı.
  - **opusplan:** plan modunda çalışan görevlerle, yoksa hep Sonnet olur.
  - **Sonnet + Opus danışman (advisor):** Anthropic'in önerdiği ucuz düzen. "Neden gearbox?" sorusunun cevabı bu kıyasta.
- **Çıkarılan:** "Her şey Sonnet" kıyası (kullanıcı: gerçekte kimse böyle kullanmıyor).
- **Görev türleri** (videodaki ayrımla): yeni özellik, yeri belli hata, yanıltıcı hata, belirsiz anlatılmış hata, hata yakalayan test yazma, büyük yeniden düzenleme. Her biri gizli testlerle.
- **Model mi efor mu?** Opus medium, Opus high ve Sonnet medium aynı görevlerde ayrı ölçülsün. Böylece farkın ne kadarının modelden, ne kadarının efordan geldiği görülür; videodan bu ayrılamadı (adım 6).
- **Sadece efor seçeneği:** gearbox modeli hiç değiştirmeden yalnızca eforu ayarlarsa önbellek hiç bozulmaz. Anthropic'in model rehberi de "efor ayarlamak çoğu zaman model değiştirmekten daha iyi bir kaldıraç" diyor. Bu da kıyasa ayrı bir seçenek olarak girsin.
- Her hücreyi en az 3 kez çalıştır; tek çalıştırma gürültülü. Ölçüm ücretli: önce tahmini maliyet söylenip onay alınır.
- **README'ye yazmak:** sonuç ne çıkarsa çıksın yazılır. Sadece iyi sonucu koymak güveni zedeler.

**Yapıldı, bir tur (17 Ekim 2026, kullanıcı onayıyla; harcama liste fiyatıyla yaklaşık $10,6, tahmin $17'ydi):**

- 10 görev × 6 düzen, her biri bir kez, Claude Code 2.1.299. 4 yeni görev eklendi: yanıltıcı hata, aynı hatanın belirsiz anlatımı, 6 gizli hatayı yakalayan test yazma, küçük yeniden düzenleme.
- **Sonuç:**

| Düzen | Geçen | Maliyet | Süre |
|---|---|---|---|
| gearbox | 10/10 | $1,96 | 489 sn |
| Opus · high | 10/10 | $3,09 | 808 sn |
| Opus · medium | 10/10 | $2,33 | 531 sn |
| Sonnet · medium | 10/10 | $0,81 | 234 sn |
| opusplan (plan modu yok, hep Sonnet) | 10/10 | $0,85 | 212 sn |
| Sonnet + Opus danışman | 9/10 (yanıltıcı hatada kaldı) | $0,92 | 390 sn |

- **Dürüst okuma:** görevler fazla kolay, modelleri ayıramıyor. Bu sette tek başına Sonnet · medium en ucuz ve tam başarılı. gearbox, üç hata avını (5, 8, 9) Opus · high'a verdiği için Sonnet'in 2,4 katı harcadı; $1,96'nın $1,50'si bu üç görev. Opus'lara göre %16–37 ucuz.
- Model mi efor mu: Opus medium, high ile aynı sonucu %25 ucuza verdi; Sonnet medium, Opus medium'un üçte birine.
- **Karar (kullanıcı, 17 Ekim 2026; 0.8.2):** hata avı ikiye ayrıldı. Belirsiz anlatılmış hata ("bu çalışmıyor, düzelt") Opus high'ta kaldı. Yeri belli ama sebebi saklı hata ve hata yakalayan test yazma artık Sonnet high'a (T4'te xhigh) gidiyor. Kullanıcının sözü: "belirli bir hata ise sonnet high ve xhigh, hata belirli değil ise opus high". 143 etiketli mesajdaki 10 hata avının hepsi "yeri belli" türünde; hepsi Sonnet high'a geçti. Adım 12'deki zor görevlerde eski kural (0.8.1) ile yenisi karşılaştırılacak.
- Ölçüm sırasında iki şey düzeltildi: test yazma görevinin metni iki türlü okunuyordu ("mevcut hataları bul" mu, "ileride bozulursa yakala" mı); netleştirildi, gearbox'ın o görevi yeniden çalıştırıldı. İnternet kopması üç görevi yarıda bıraktı (Sonnet'te 2, danışmanlıda 1); yeniden çalıştırıldılar.
- **Yapılmayanlar:** her hücre 3 kez (yaklaşık $32 daha); "sadece efor" düzeni (gearbox'ta bunun için bir ayar yok, eklenmesi gerekiyor); danışmanın gerçekten çağrılıp çağrılmadığı ölçülmedi (danışmanlı düzenin maliyeti tek başına Sonnet'e çok yakın).
- Ölçüm gearbox'ı `--plugin-dir` ile yüklüyor; kullanıcının kurulu gearbox'ıyla aynı tasarruf sayacını ve günlüğü paylaşıp paylaşmadığı doğrulanmadı.

### 5. Dil ve uzunluktan bağımsız sınıflandırma (kullanıcı isteği)

**Hedef:** Türkçe, İngilizce ve başka her dilde; kısa ve uzun mesajda aynı başarı. Ölçüt her dil ve her uzunluk grubu için ayrı tutulur:
- Kısa: 40 kelimeden az. Orta: 40–200 kelime. Uzun: 200 kelimeden fazla.
- 1 kademe içinde isabet en az %90.
- Ciddi hata (zor işi çok düşük kademeye koymak) en çok %2.

**Bugün:** kısa Türkçe ve İngilizce mesajlarda 1 kademe içinde %100 (77 mesaj). Uzun İngilizce görev metinlerinde %78; kolaydan zora sıralama uyumu 0,16 (neredeyse rastgele).

**Plan:**

1. **Önce ölç.** 143 etiketli mesajı Claude ile 6–8 dile çevir (İngilizce, Türkçe, İspanyolca, Almanca, Fransızca, Çince, Japonca, Rusça). Zorluk dile göre değişmediği için etiketler aynı kalır. Uzun metin seti: SWE-bench ve Terminal-Bench'in ayrılmış yarısı, bunların birkaç dile çevrilmiş hâli ve gerçek uzun kullanıcı mesajları (ör. 23 maddelik mesaj).
2. **Dilden bağımsız işaretler ekle.** Metnin yapısına bak:
   - kaç ayrı istek ya da madde var;
   - kaç dosya, fonksiyon ya da yol adı geçiyor;
   - hata çıktısı ya da kod bloğu var mı;
   - beklenen ve gerçekleşen davranış yazılmış mı.

   Bunlar her dilde aynı görünür.
3. **Netlik işareti** (videodan): "çalışmıyor, düzelt" gibi ayrıntısız şikâyet belirsiz sayılır, kademe yükselir. Dosya adı, beklenen sonuç ve adım varsa net sayılır.
4. **Kelime saymayı yoğunluğa çevir.** Uzun metinde ipucu kelimeleri doğal olarak çok geçer. Sayıyı metin uzunluğuna böl ya da en güçlü ipucuna bak.
5. **Tanınmayan dil ya da uzun metin Haiku'ya.** Haiku her dili anlar. Kurallar dili tanımazsa ya da metin 200 kelimeden uzunsa kararı Haiku verir; kural sadece alt sınır koyar. Maliyeti çok düşük: 1.000 kelime yaklaşık $0,0002.
6. **Çok uzun metinde özet.** 3.000 kelimeyi aşan metinde Haiku'ya baş ve son parça ile yapı bilgisi gönderilir.
7. **Çok maddeli mesaj.** Her madde ayrı değerlendirilir, en zor madde esas alınır.
8. **Her değişiklikten sonra çok dilli ve uzun sette ölç.** Ayrılmış yarıya bakmadan ayarla. Türkçe kurallar silinmez.

**Başlandı (18 Ekim 2026):**

- **Ölçüm seti:** 143 etiketli mesaj 7 dile çevrildi (İngilizce, İspanyolca, Almanca, Fransızca, Rusça, Çince, Japonca) ve İngilizce olanlar Türkçeye; `eval/i18n/`. Etiketler kaynağınki. Kod ve hata çıktısı çevrilmedi. Çeviriler Claude'un; bir anadil konuşmacısı kontrol etmedi.
- **Kurallar tek başına (`claude plugin test .`, LANG satırları), ±1 kademe / ciddi hata:** Türkçe %97 / 4; İngilizce %92 / 9; İspanyolca %73 / 35; Almanca %75 / 34; Fransızca %77 / 30; Rusça, Çince, Japonca %67 / 46–47. Hedef (±1 %90, ciddi %2) yalnızca Türkçede yakın.
- **İlk iyileştirme:** Türkçe ya da İngilizce olmayan mesajda kurallar emin olsa bile Haiku'ya soruluyor (dil kontrolü: Latin dışı yazı, ya da üç kelimeden uzun ve iki dilin küçük kelimelerinden hiçbiri yok). Kuralların "emin" deyip yanıldığı ciddi hata yedi dilde de 0 oldu (önceden İspanyolca 3, Almanca 2, Fransızca 1); İngilizcede "for a week" eklenerek 1'den 0'a indi. Türkçe/İngilizce asıl setler ve gerçek kullanım tekrarı değişmedi.
- **gearbox'ın gerçekte yaptığı gibi (17 Ekim 2026, `node eval/haiku.mjs --languages`, 851 Haiku sorusu, liste fiyatıyla $0,43):** kurallar; emin değilse ya da dil Türkçe/İngilizce değilse Haiku, kuralın alt sınırına bağlı. ±1 kademe / ciddi hata / Haiku'ya sorulan: Türkçe %100 / 0 / %16; İngilizce %99 / 0 / %21; İspanyolca %98 / 2 / %95; Almanca %97 / 5 / %94; Fransızca %94 / 7 / %94; Rusça %100 / 0 / %97; Çince %97 / 4 / %97; Japonca %97 / 3 / %96. Tam isabet Türkçe %92, İngilizce %86, diğerleri %54–69 (çoğu bir kademe aşağı).
- **Hedefi tutmayanlar:** ±1 kademe her dilde %90'ın üstünde. Ciddi hata %2'nin üstünde: Japonca (3, %2,1), Çince (4, %2,8), Almanca (5, %3,5), Fransızca (7, %4,9). Nedeni: hepsi kuralların emin olmadığı mesajda Haiku'nun düşük cevabı. Türler: soru gibi sorulan yarış durumu (çift tıklamada çift sipariş, iki kez kullanılan kupon; T3 → T1), ayrıntısız şikâyet ("toujours cassé, même erreur", "dieser Fehler geht einfach nicht weg"; T3–T4 → T1–T2), tasarım sorusu (veritabanı şeması, Redux mu Zustand mı, olay güdümlü mimariye geçiş planı; T3 → T1), sıfırdan büyük iş (CRM, yönetim paneli; T4 → T2), küçük dönüşüm (async/await, TypeScript'e çevirme; T2 → T0) ve önceki iş bağlamında "続けて" (devam et; T3 → T0). Haiku aynı mesajı dilden dile farklı değerlendiriyor (CRM yalnızca Almanca ve Fransızcada kaçtı). Sıradaki iş bunlar: yapı işaretleri (madde 2) ve netlik işareti (madde 3) dilden bağımsız alt sınır koyarsa bu türler Haiku'ya kalmaz; "devam et" türü kısa mesajlar her dilde önceki kademeyi sürdürmeli.
- **Diğer dillerin kelimeleri (17 Ekim 2026, `hooks/core/languages.ts`):** İspanyolca, Almanca, Fransızca, Rusça, Çince ve Japoncada kurallar artık Türkçe/İngilizcedeki ipuçlarının karşılıklarını okuyor: takılma, yavaşlık, güvenlik, mimari, "sıfırdan", "hâlâ bozuk", "tüm uygulamayı taşı", plan istemek, seçenekler arası karar. Dilden bağımsız düzeltmeler de girdi: Latin aksanları (é, ü, ñ, ß) temizleniyor; boşluksuz yazılan Çince/Japonca cümle tek "kelime" sayılıp içindeki dosya adı yüzünden silinmiyor; Çince/Japonca karakter uzunlukta birkaç harf sayılıyor; Kiril ve CJK harfleri "düz metin"den atılmıyor. Her iki dilde de olan eksikler kapandı: "aynı kupon iki kez kullanılabiliyor, nasıl engelleriz?", "N+1", "açılış süresini yarıya indir", "bellek sızıntısı, bul", "X'i Y'ye taşı" (İngilizce `move … from X to Y`), "3 gündür" (`for 3 days`).
- **Sonuç, kurallar tek başına (ana set, 143 mesaj, ±1 kademe / ciddi hata):** İspanyolca %99 / 0, Almanca %99 / 0, Fransızca %99 / 0, Rusça %99 / 0, Çince %97 / 0, Japonca %99 / 0, Türkçe %99 / 0, İngilizce %99 / 0 (önce: %67–77 / 30–47 ciddi hata). **Bu sayılara güvenme:** kelimeleri bu setin hatalarına bakarak seçtim, set ayarlı. Eski testler değişmedi (DEV %100, saklanan %91 tam / %98 ±1).
- **Dürüst ölçüm, iki yeni set (`eval/i18n/held.ts`, `held2.ts`):** `held` (36 mesaj × 8 dil) kurallardan önce yazıldı ama kelimeleri seçerken görüldü; ayar öncesi ciddi hata İspanyolca %36, Almanca %31, Fransızca %28, Rusça/Çince/Japonca %44. `held2` (19 mesaj × 8 dil) kelimeler bittikten sonra, farklı sözcüklerle yazıldı ve ilk okumada: ciddi hata İngilizce 0, Türkçe 1, İspanyolca 2, Almanca 2, **Fransızca 6**, Rusça 3, Çince 1, Japonca 3 (n=19; yani %5–32), ±1 kademe %68–95. Yani kurallar yeni cümle biçimlerine tam geçmiyor. Ardından o setin hatalarına bakıp düzelttim (“plan öner”, “artık çalışmıyor”, “tüm üründe değiştir”, “tarih biçimlendirme” kelimesini basit iş sanma); `held2` bu yüzden tüketildi, şimdiki %0 sayılmaz. Sıradaki dürüst ölçüm için yeni, başka biri tarafından yazılmış bir set gerek.
- **Yanlış alarm testi:** `tests/multilingual.test.ts` içinde 28 küçük istek ("tüm sekmeleri boşlukla değiştir", "animasyonu daha hızlı yap" ve sekiz dildeki karşılıkları) hiçbir dilde T3'e çıkmamalı. İlk koşuda iki Çince/Japonca cümle T4 çıktı; kalıplar daraltıldı. "Daha hızlı yap" türü sözler zayıf ipucuna indirildi.
- **gearbox'ın gerçekte yaptığı (kurallar + Haiku, ana set, Haiku cevapları önbellekten, $0):** ±1 kademe %98–100; ciddi hata İspanyolca 1, Çince 2, diğerlerinde 0 (önce 2, 4, 5, 7, 3). Ama **tam isabet düştü**: İspanyolca %73, Almanca %66, Fransızca %66, Rusça %71, Çince %59, Japonca %67; kurallar tek başına %80–85. Sebep: Haiku kuralların doğru bulduğu mesajı sık sık bir kademe aşağı çekiyor (23–44 mesaj). **Karar bekliyor:** kuralların emin olduğu yerde, Türkçe/İngilizce olmayan dilde de Haiku'ya sormayı bırakmak. Riski: kurallar yeni cümlelerde `held2` ilk okumasındaki kadar kaçırıyor. Önce `held` ve `held2` Haiku'yla ölçülmeli (318 yeni soru, yaklaşık $0,15).
- **Test notu:** komut satırındaki `claude` (2.1.278) eski; `session.append` olayını bilmediği için 43 test düşüyor. Testler uygulamanın 2.1.299 sürümüyle koşturuldu (`scripts/claude.mjs` en az 2.1.295 ister). Çeviriler Claude'un; anadil konuşmacısı bakmadı.
- **İkinci kör set (17 Ekim 2026, `eval/i18n/blind2.ts`), ilk okuma:** birinci kör sete göre ayar yapıldıktan sonra, aynı yolla başka bir model yazdı (24 mesaj × 8 dil; bazı konular birinciyle aynı çıktı, yani aynı model ailesinin önyargısı var). Kurallar tek başına ±1 kademe %83–92, ciddi hata İngilizce 0, Fransızca ve Japonca 1, diğerleri 2. **gearbox (kurallar + Haiku):** ±1 %92–100, ciddi hata her dilde 0; tam isabet İngilizce %75, Türkçe %67, İspanyolca %79, Almanca %79, Fransızca %79, Rusça %71, Çince %54, Japonca %71; Haiku'ya sorulan Türkçe %33, İngilizce %8, diğerleri %83–96 ($0,08). "Yalnız kurallar emin değilse sor" seçeneği bu sette İspanyolca ve Almancada ciddi hata verdi (2'şer): **karar aynı, yabancı dilde Haiku kalıyor.** Okunduktan sonra bu sette de ayar yapıldı (rakam–Çince/Japonca arası boşluk hatası, Rusça "переписать" mastarı, "resumen" kelimesinin "özetle" sanılması, "push" kelimesinin uzun tarifte basit iş sayılması, Almanca "fünfte Versuch", yetki açığı ve senkron bozukluğu kelimeleri, sayılı başarısız denemeler), bu yüzden ikinci okuma dürüst değil.
- **Yapı işareti (adım 5, madde 2):** uzun (160+ karakter, Çince/Japonca karakter 3 sayılır), en az iki cümlelik, sayı veren ("60 ekran") ve adım sıralayan ("önce ... sonra") ya da 300+ karakter, üç cümle, sayı ya da sıra sözü olan tarif T3 sayılıyor, kurallar emin değil (Haiku'ya sorulur). Uzun İngilizce görev metinlerinde (`node eval/external.mjs`, saklı yarı dahil 350 görev): ilk hâli ±1 kademe SWE-bench %83→%73'e düşürdü, ciddi hata Terminal-Bench'te %7→%2'ye indirdi; sıkılaştırılmış hâli (300+ karakterde sayı ya da sıra sözü şart) SWE-bench %78, Terminal-Bench %75 ±1, ciddi hata %0 ve %4. Bedel: bu metinlerde gereğinden yüksek tahmin arttı (SWE-bench 272 → 306 görev). Netlik işareti (madde 3), yoğunluğa çevirme (madde 4), çok maddeli mesajda en zor madde (madde 7), çok uzun metinde özet (madde 6) yapılmadı.
- **Sürüm 0.11.0 (17 Ekim 2026):** `hooks/core/languages.ts` (kelime listeleri), `signals.ts` (yapı işareti, aksan temizleme, CJK bölme ve uzunluk), `eval/i18n/held.ts`, `held2.ts`, `blind.ts`, `blind2.ts`, yanlış alarm testi, `eval/haiku.mjs --held`. Testler 167, uygulamanın 2.1.299 sürümüyle. Komut satırındaki eski `claude` (2.1.278) bu testleri koşturamaz.
- **Henüz yapılmadı:** adım 5'in 3, 4, 6, 7. maddeleri; yeni, başka bir kaynaktan (örneğin gerçek kullanıcı mesajları) bir dürüst set; çevirilerin ve etiketlerin bir anadil konuşmacısınca kontrolü; Almanca ve Fransızcada "yalnız emin değilse sor" seçeneğinin yeniden denenmesi.
- **Kör set, ilk ve tek okuma (17 Ekim 2026, `eval/i18n/blind.ts`):** kelime listelerini ve kuralları görmeyen ayrı bir model her dil için 24 mesajı kendi diliyle yazdı ve etiketledi (çeviri değil; etiketlerin doğruluğunu kimse kontrol etmedi). Kurallar tek başına, ±1 kademe / ciddi hata: İngilizce %92 / 0, Türkçe %96 / 0, İspanyolca %92 / 1, Almanca %96 / 1, Fransızca %92 / 1, Rusça %88 / 2, Çince %83 / 2, Japonca %96 / 1 (n=24, bir hata %4). Hedef (±1 %90, ciddi %2) yalnız İngilizce, Türkçe, Almanca, Japoncada tutuyor sayılır; Rusça ve Çince altında. **Bu set okundu; ayar yapılmadı.** Kaçırılanlar (yeni ipucu sınıfları): oyunun çok düşük fps'e düşmesi, yalnız bazı cihazlarda çökme, gece işinin 9 saate çıkması (yavaşlama anlatımı), "perevesti" gibi mastar ("bütün projeyi JS'ten TS'e çevirmek" cümle biçimi), "beşinci deneme / 4. kez rica" (sıra sayısıyla tekrarlayan başarısızlık; dilden bağımsız olabilir), ara sıra kırılan CI testi, Vue 2'den Vue 3'e yükseltme.
- **Kör set, Haiku ile (17 Ekim 2026, 133 yeni soru, $0,07):** gearbox şimdiki haliyle (yabancı dilde hep Haiku'ya sor) ±1 kademe %92–100, ciddi hata yalnız İspanyolcada 1, diğerlerinde 0. Kurallar tek başına: ±1 %83–96, ciddi hata 0–2. "Yalnız kurallar emin değilse sor" seçeneği Almanca ve Fransızcada gearbox'tan biraz iyi (tam isabet %79 ve %79, gearbox %75 ve %71), Rusça, Çince ve Japoncada kötü (%79, %67, %75; gearbox %83, %75, %88). **Karar: yabancı dilde Haiku'ya sormayı bırakmıyoruz.** Kurallar Rusça, Çince, Japoncada henüz yeterince güvenilir değil. Almanca ve Fransızca için seçenek ileride denenebilir (n=24, fark küçük).
- **Haiku ile ölçüm (17 Ekim 2026, `node eval/haiku.mjs --held`, 318 soru, liste fiyatıyla $0,17):** üç yöntem, `held` / `held2` için ±1 kademe hepsinde %97–100, ciddi hata hepsinde 0. Tam isabet: (a) kurallar tek başına `held` %81–97, `held2` %68–84; (b) gearbox şimdiki (yabancı dilde hep Haiku'ya sor) `held` %61–86, `held2` %68–89; (c) "yalnız kurallar emin değilse sor" `held` %81–94, `held2` %74–84, Haiku'ya sorulan %11–21 (b'de %83–95). `held`'te (b) kurallardan 10–35 puan kötü (Haiku bir kademe aşağı çekiyor); `held2`'de ise (b) İspanyolca, Almanca, Rusça, Çince'de kurallardan 5–16 puan iyi. Yani kanıt karışık ve iki set de ayarlı; karar için yeni set gerek. (c) bugünkü yöntemden kötü değil, yabancı dil mesajlarının %80'inde Haiku bekletmesini kaldırıyor.

### 6. Efor tablosunu ölçüme göre yeniden ayarlamak

**Kaynak:** Forn AI, "Sonnet'e Haksızlık Ediyoruz", YouTube, 4 Ekim 2026, 8 dk 25 sn. Videonun açıklamasındaki ölçüm sonuçları ve bölüm başlıkları okundu. Konuşma metni panelden alınamadı.

**Yöntem:**
- Gerçek Python projeleri kullanılmış; bazıları 100 bin satırı aşıyor (sqlglot, pytest, datasette). Sonucu gizli testler belirliyor.
- Hayali bir kahve markası için 8 yaratıcı iş yapılmış ve kör jüriyle puanlanmış.
- Claude tarafında yaklaşık 250 yazılım denemesi ve 32 yaratıcı iş var. Bazı sonuçlar 2–6 denemeye dayanıyor; yapımcı da "eğilim, kesin hüküm değil" diyor.
- Dolar rakamları API liste fiyatı; abonelikte limitin dolma hızına yansır.

**Bulgular** (sayılar videonun açıklamasından):

| İş | Sonuç |
|---|---|
| Büyük özellik | Sonnet medium 2/2, $0,31; Opus high 2/2, $1,52 (yaklaşık 5 kat) |
| Yeri belli hatalar | Sonnet medium 13/13, $0,14; Opus high 10/10, $0,41 |
| Yanıltıcı hata (hata çıktısı yanlış dosyayı gösteriyor) | Opus high 6/6; Sonnet medium 4/6 |
| Aynı hata belirsiz anlatılınca | Sonnet medium 0/2 |
| Hata yakalayan test yazma (22 gizli hata) | Opus high 22/22; Sonnet 16–19 |
| Sonnet'i high'a çıkarmak | Net işte sonucu kötüleştirdi; bir görevde 5/5'ten 1/5'e |
| Zor hata, düzen kıyası | Opus medium ana + Sonnet yardımcılar 6/6, $0,63; tek başına Opus high 6/6, $0,74; Opus high ana 3/4, $1,59; opusplan 2/4 |
| Yaratıcı iş (kör jüri, 10 üzerinden) | Opus high 8,56; Sonnet high 8,12; Opus medium 7,94; Sonnet medium 7,44 |

**Çıkarımlar:**

- **Asıl ayırıcı "iş ne kadar zor?" değil, "iş ne kadar net anlatılmış?"** Net işte Sonnet medium aynı sonucu çok daha ucuza veriyor.
- **Yüksek efor her zaman daha iyi değil.** Net işte Sonnet'i high'a çıkarmak sonucu kötüleştirdi. "Her şey max" ayarının kaldırılması bununla da uyumlu.
- **Fiyat farkı:** Opus 5.5'in liste fiyatı Sonnet 5.5'in tam iki katı (resmî, milyon token başına: girdi $4 ve $2, çıktı $20 ve $10). Videoda ölçülen fark 3–5 kat. Video modeli ve eforu aynı anda değiştirdiği için (Opus high, Sonnet medium) farkın ne kadarının efordan geldiği bilinmiyor; adım 4'te ayrıca ölçülecek. (16 Ekim'de "farkın çoğu efordan geliyor" denmişti; bu kanıtlanmamış bir tahmindi, düzeltildi.)
- **Büyük ama net işte en iyi düzen:** Opus medium yönetir, Sonnet yardımcılar çalışır. Tek başına Opus high kadar başarılı, daha ucuz. Ana ajanı Opus high yapmak daha pahalı ve daha kötü.
- **opusplan zor hatada 2/4 başardı;** az denemeye rağmen kıyas için not edilmeli.

**Doğrulama (16 Ekim 2026, resmî kaynaklarla):**

| Madde | Sonuç | Dayanak |
|---|---|---|
| Net anlatılmış işte Sonnet yeter, belirsiz işte Opus gerekir | Büyük ölçüde doğru, kanıt az | Video; kendi ölçümümüz (görev 4 ve 5); Anthropic'in model rehberi (günlük kodlama Sonnet, karmaşık işler Opus). Rehber "net anlatılmış" ayrımını bu sözlerle yazmıyor. |
| Yüksek efor her zaman daha iyi değil | Doğru; "net işte kötüleştirir" kısmı kanıtlanmadı | Anthropic: Opus 5.5'te medium'dan başla; en üst seviyeler yalnızca zor işte maliyetine değer. Claude Code Sonnet 5.5'i de varsayılan olarak medium'la çalıştırıyor. "Kötüleştirdi" bulgusu tek video, az deneme. |
| Farkın çoğu efordan geliyor | Kanıtlanmadı, düzeltildi | Fiyat farkı 2 kat, kesin. Kalanın kaynağı ayrılmadı. Anthropic: efor ayarlamak çoğu zaman model değiştirmekten daha iyi bir kaldıraç. |
| Sorun çözmede Opus kısmen gerekli | Doğru; "şart" kelimesi fazla güçlü | Yanıltıcı hatada Opus 6/6, Sonnet 4/6; belirsiz anlatımda Sonnet 0/2; yeri belli hatada Sonnet 13/13. |

**gearbox'a uygulanacaklar:**

- T1–T2 net işler: Sonnet **medium**. Bugün 'tasarruf' profilinde T2 Sonnet high.
- Büyük yeniden düzenleme ve yaratıcı iş: Sonnet high.
- Net ama büyük ya da zor iş: Opus medium ana + Sonnet yardımcılar (adım 7 ile birlikte).
- Belirsiz anlatılmış sorun ve yanıltıcı hata: Opus high, tek başına.
- Tasarımın önemli olduğu iş (sunum, tanıtım): Opus high.
- Hata yakalayan test yazma: Opus high. Bugün test yazma T2 (Sonnet).
- "max" hiçbir kademede varsayılan olmasın; yalnızca kullanıcı isterse.
- Bu tablo önce bir başlangıç tahmini olarak girer; adım 4'teki kendi ölçümümüzle doğrulanır.

**Yapıldı (16 Ekim 2026, 0.8.0'a girecek), kullanıcının onayladığı üç madde:**

- **Net rutin ve standart iş Sonnet medium**, üç profilde de. 'tasarruf' ve 'dengeli'de T2 Sonnet high'tı; 'kalite'de T1 Sonnet high ve T2'nin Sonnet sütunu xhigh'tı.
- **Hiçbir kademe max değil.** Eskiden max olan her hücre xhigh oldu ('kalite'de T3–T4, her profilde T4'ün Haiku/Sonnet sütunu). Max yalnızca kullanıcı isterse (`+max`, "max ile").
- **"Hata avı" Opus high.** Kurallar artık bir işi "hata avı" diye işaretleyebiliyor; politika bu işte eforu en az high yapıyor (seçicinin üstüne çıkmadan; kullanıcının kendi efor seçimi önde). Hata avı sayılanlar:
  - ayrıntısız anlatılmış hata: "bu çalışmıyor, düzelt" gibi; hata çıktısı, dosya, kod, sayı, ne zaman olduğu ("tıklayınca") ya da ne olması gerektiği yoksa ve yanında görsel yoksa. Bunlar T2'den T3'e çıktı;
  - sebebi saklanan hata: bazen olan, donma, çökme, sızıntı, kilitlenme, yarış durumu; "neden" + hata. Bunlar zaten T3'tü, artık high eforla;
  - hata yakalamak için test yazma: uç durumlar (edge case), "hataları yakalayan", kapsamlı test. T2'den T3'e çıktı. Bir özellik için test yazmak T2 olarak kaldı (kendi görev 3 ölçümümüzde Sonnet geçmişti).
  - "Yanıltıcı hata" (hata çıktısı yanlış yeri gösteriyor) metinden tanınamıyor; yalnızca sebebi saklanan türler yakalanıyor.
- Sürmekte olan bir hata avının ortasındaki "evet, devam" aynı eforla devam ediyor.
- **Ölçüm (ücretsiz, `claude plugin test .`):** 143 etiketli mesajda kademe isabeti hiç değişmedi (dev %100, ayrılmış %91 tam / %98 ±1, yeni %74 / %88; gerçek kullanım yeniden oynatması %61 / %100, ciddi hata 0). Yeni `EVAL route` satırı her mesajın gittiği model·eforu sayıyor: 'tasarruf'ta T2'deki 33 mesaj Sonnet·high'tan Sonnet·medium'a indi, 10 mesaj hata avı olarak Opus·medium'dan Opus·high'a çıktı, hiçbir mesaj max değil.
- **Yapılmayanlar (kapsam dışı bırakıldı):** büyük yeniden düzenleme ve yaratıcı işin Sonnet high'a alınması (bugün "refactor" T3, Opus); tasarım ağırlıklı iş için Opus high; "net ama büyük iş: Opus medium ana + Sonnet yardımcılar" (adım 7'ye bağlı). Haiku'ya sorulan soru metni (RUBRIC) değiştirilmedi; değişseydi README'deki Haiku ölçümleri geçersiz kalırdı.
- **Doğrulanmadı:** dış ölçüt (`node eval/external.mjs`, ücretsiz) bu oturumda çalıştırılamadı: izin sistemi internete çıkabilir diye engelledi. Gerçek görevlerde başarı (adım 4, ücretli) ölçülmedi.

### 7. Alt ajan yönlendirme

- **Ne:** Claude'un açtığı yardımcıları işin türüne göre modele dağıt: kodda arama ve okuma yapan keşif yardımcıları Haiku·low, uygulama yapanlar Sonnet·medium. Büyük işte Opus medium ana ajan ile Sonnet yardımcılar düzeni (adım 6).
- **Neden:** Yardımcılar artık ana modeli kullanıyor; ana model Opus ise kodda arama gibi basit işler de Opus'la yapılıyor. Benzer projelerin en yaygın özelliği bu (Adityaraj0421/gearbox, dominicrico/jev-router, nedjamez/claude-code-model-router). Videoda bu düzen tek başına Opus kadar başarılı ve daha ucuz çıktı.
- **Önce:** yardımcıların toplam kotadaki payını ölç; değmiyorsa yapma.

### 8. advisor (danışman) ile birleştirme

- **Ne:** gearbox bir mesajı Sonnet ya da Haiku'ya verdiğinde Opus danışman açık olsun; Claude zor anda Opus'a danışsın.
- **Neden:** Belgeye göre danışmanı açıp kapamak önbelleği bozmaz; model değiştirmek bozar.
- **Önce bakılacak:** Mod API'si danışmanı istek başına açıp kapatabiliyor mu? Danışman deneysel; Anthropic hesabıyla çalışıyor.

### 9. Dil ayarı ve İngilizce komutlar (kullanıcı kararı)

- **Dil:** Claude Code'da `language` adında bir ayar var (`settings.json`, ör. "turkish"). gearbox bunu görebiliyorsa o dilde konuşsun. O dil gearbox'ta yoksa İngilizce konuşsun.
- **Önce bakılacak:** Mod API'sinin türlerinde (`types/index.d.ts`) dil bilgisi yok. Ayar dosyasından okumak ya da işletim sisteminin dilini kullanmak gerekebilir; uygularken belirlenecek.
- **Komutlar her zaman İngilizce.** Öneri:

| Bugün | Yeni |
|---|---|
| `/gear tasarruf` | `/gear savings` |
| `/gear kayit` | `/gear log` |
| `/gear yanlis zayif` / `fazla` | `/gear wrong weak` / `strong` |
| `/gear sifirla` | `/gear reset` |
| `/gear oto` / `sabitle` / `golge` | `/gear on` / `off` / `shadow` |
| `/gear profil tasarruf` / `dengeli` / `kalite` | `/gear profile saver` / `balanced` / `quality` |
| `/gear haiku`, `sor`, `not`, `bant` + `aç` / `kapa` | `/gear haiku`, `ask`, `note`, `band` + `on` / `off` |
| `+ucuz`, `+derin` | `+cheap`, `+deep` |
| (yeni) | `/gear doctor`, `/gear lang` |

- Eski Türkçe komutların bir süre sessizce çalışmaya devam edip etmeyeceğine uygularken karar verilir.

**Yapıldı (18 Ekim 2026, 0.12.0):**

- **Komutlar İngilizce:** `/gear on`, `off`, `shadow`, `savings`, `log`, `wrong weak|strong`, `reset`, `profile saver|balanced|quality`, `haiku`, `ask`, `note`, `band` (`on|off`), `lang en|tr|auto`, `doctor`. **Eski Türkçe adlar çalışmaya devam ediyor** (karar: sessizce; kimsenin alışkanlığı bozulmasın), yardım metni yalnızca İngilizce adları gösteriyor ve eski adların çalıştığını söylüyor. Etiketler `+cheap` ve `+deep` zaten vardı. Profillerin kayıtlı adları Türkçe kaldı (`tasarruf`, `dengeli`, `kalite`; kayıtlı ayarlar bozulmasın), İngilizce adları takma ad.
- **Dil:** `hooks/core/text.ts`. Claude Code'un `language` ayarını bir Mod okuyamıyor (Mod API'sinde yok, eklentinin çalışma ortamında dosya okuma da yok), bu yüzden `auto` sistemin dilini izliyor: Türkçe sistemde Türkçe, başka yerde İngilizce. `/gear lang en|tr` elle seçer. Canlı denendi: bu bilgisayarda `auto` Türkçe seçti. gearbox'ın söylediği her şey iki dilde: komut çıktıları, yardım, durum, günlük, tasarruf metni ve kartı, bant ve düğmeler, uyarılar, bildirimler, devir notu isteği ve devir notunun başlığı. Kuralların yazdığı gerekçeler (`zor iş: "..."` gibi) Türkçe saklanıyor ve İngilizce gösterilirken `reasonText` ile çevriliyor (listede olmayan gerekçe Türkçe kalır).
- **Doğrulanmadı:** İngilizce metinleri bir anadil konuşmacısı okumadı; masaüstü uygulamasında İngilizce bandın görünüşü (düğme boyları) denenmedi; Türkçe ve İngilizce dışında dil yok (Claude Code'un dili İspanyolca ise gearbox İngilizce konuşur).

### 10. Her cevabın altında italik model satırı (kullanıcı isteği)

- **Ne:** Her cevabın altında, italik ve sade: *Opus 5.5 · efor medium*. API'nin bildirdiği, gerçekten cevap veren model yazılır.
- **Ne zaman:** gearbox açıkken, gölgedeyken ve kapalıyken de görünür (kapatma sadece model seçimini kapatır).
- **Bir cevapta birden çok model çalıştıysa** hepsi yazılır. Örnek: *Opus 5.5 · yardımcılar: Sonnet 5.5*.
- **Neden:** opusplan gibi modlarda hangi mesajı hangi modelin yazdığı karışıyor. Bugünkü gölge satırında hem "önerirdi" hem "cevap" yazdığı için kafa karıştırıyor.
- `/gear note off` ile kapatılabilir.

**Yapıldı (18 Ekim 2026, 0.12.0):**

- Her cevabın altında, gearbox açıkken, gölgedeyken ve kapalıyken de, tek italik satır: `*Opus 5.5 · efor medium*`. Model, API'nin cevap veren diye bildirdiği; efor, isteğin gittiği efor (API cevabın eforunu bildirmiyor). Yardımcılar (alt ajanlar) çalıştıysa: `*Opus 5.5 · efor medium · yardımcılar: Sonnet 5.5*`; modeller turun içinde toplanıyor, sonraki cevapta yazılmıyor. Yanına düz yazıyla plan modu ve limit uyarısı ekleniyor.
- **Satırdan çıkarılanlar (kullanıcı "sade" dedi):** kademe ve gerekçe, önbellek rakamları, tur maliyeti ve "seçici modeliyle" karşılaştırması. Bunlar `/gear` (son karar ve gerekçesi), `/gear log` ve `/gear savings` içinde duruyor. Gölge modda "önerirdi" ve "cevap" karışıklığı kalktı: satır yalnızca cevap veren modeli yazıyor, gearbox'ın önerisi bantta ve günlükte.
- **Canlı denendi (Haiku, 2.1.299):** satır cevabın altında bilgi satırı olarak çıktı (`*Haiku 5.5 · efor low*`).
- **Doğrulanmadı:** gerçek bir alt ajanla yardımcı satırı (testte sahte yardımcı kullanıldı); masaüstü uygulamasında italiğin görünüşü.

### 11. Görünürlük ve resmî dizine başvuru

- **Resmî dizin nedir:** anthropics/claude-plugins-official, Anthropic'in yönettiği eklenti kataloğu (40,2 bin yıldız). Claude Code'da `/plugin > Discover` ekranında ve `/plugin install isim@claude-plugins-official` komutuyla çıkıyor. Katalogda 315 eklenti var.
  - Anthropic'in kendi yaptıkları (40 tane): kod inceleme, güvenlik, dil desteği, kullanım raporu gibi.
  - Şirketlerin ve topluluğun eklentileri: GitHub, Linear, Figma, AWS, Azure gibi.
- **Hedef (kullanıcı kararı): katalogda model seçen ilk Mod olmak.** Bugün katalogda model seçen eklenti yok; kullanımla ilgili olanlar sadece rapor (session-report, receipts). Rakipler (ör. dominicrico/jev-router, QueryKeys/flintrelay) de başvurabilir; hız önemli.
- **Başvuru:** formla (clau.de/plugin-directory-submission). Dış eklentiler "kalite ve güvenlik standartlarını" karşılamalı. Ayrıntılı ölçüt yayımlanmamış.
- **Başvurudan önce:**
  - isim kararı: katalogdaki isim sonradan değiştirilemiyor; GitHub'da "gearbox" adlı en az 6 repo daha var. Kullanıcı kararı erteledi; başvurudan önce verilecek;
  - İngilizce ürün (adım 9);
  - gizlilik açıklaması: ne kaydediliyor, Haiku'ya ne gidiyor;
  - README'de "early access" yerine Mods'un yayında olduğu (1 Ekim 2026).
- **Başvuru öncesi hazırlık (18 Ekim 2026, yapıldı):** README'ler (İngilizce ve Türkçe) "Gizlilik" bölümü aldı (ne saklanıyor: ayarlar, son 200 kararın ilk 100 karakteri, toplamlar; ne modele gidiyor: emin olunamayan mesajın ilk 4.000 karakteri Haiku'ya, devir notu için sohbetin özeti; gearbox'ın kendi ağ isteği yok, kodda doğrulandı). "early access" ifadesi "Mod" oldu. `CHANGELOG.md` (sürüm notları) ve `.github/ISSUE_TEMPLATE/` (hata kaydı ve yanlış seçim şablonları) eklendi. İngilizce ürün (adım 9) da tamam. **Başvurudan önce kalanlar, kullanıcının işi:** isim kararı, 20–30 saniyelik demo görüntüsü, başvuru formunun kendisi (clau.de/plugin-directory-submission). Ayrıca Anthropic'in "kalite ve güvenlik standartları" yayımlanmadığı için formda ne sorulduğu görülmeden eksik kalıp kalmadığı bilinmiyor.
- **Başvuru yolu değişmiş (18 Ekim 2026, Anthropic belgelerinden okundu: claude.com/docs/directory/publish ve /docs/plugins/submit):** `clau.de/plugin-directory-submission` artık geliştirici portalına (claude.ai/directory/manage) yönleniyor; eski Console formu kapandı. Portala Pro, Max, Team ya da Enterprise hesabıyla girilir ve claude.ai'a bağlı bir GitHub hesabı gerekir. **Videoyu isteyen bir alan yok.** Portal adımları: depo (Source) ve Validate, liste ayrıntıları (plugin.json ve README'den okunur, README listenin açıklaması olur, yani herkese açık), veri işleme soruları (kişisel veri okuyor/saklıyor mu, bağlayıcılar dışında bir yere veri gönderiyor mu, ne kadar tutuyor, 18 yaş altı için mi), uyumluluk onayları, gönderim. Doğrulama kuralları: README en az 40 kelime, LICENSE, isim küçük harf/rakam/tire ve başkasının listesine benzememeli. README'ye GIF ya da PNG konabilir (Markdown resim sözdizimiyle); mp4 gibi ikili dosyalar inceleyiciye takılır. Mod'lar (`modules` dizisi) destekleniyor. Her sürüm güvenlik taramasından geçer ve yeni liste insan incelemesine girer; README'de eklentinin çalıştırdığı ve gönderdiği her şey yazılmalı (Gizlilik bölümü bunun için). Depo 84 dosya, hiçbiri 256 KiB üstü değil, depo herkese açık.
- **Başvuru öncesi son tarama (18 Ekim 2026, 0.12.1; kullanıcı İngilizce README'de Türkçe kalmış bir satır buldu):** İngilizce README'deki Türkçe örnekler (plan istekleri, yazıyla model seçme, gerçek kullanım alıntıları, görev 8, "max ile") İngilizceye çevrildi; İngilizce örneklerin kodda gerçekten tanındığı testle doğrulandı. Ölçüm tablolarına hangi sürümde alındıkları yazıldı (10 görev: autogear 0.8.1; yönlendirme sayıları 0.12'ye göre güncellendi: T1 33, T3 29, T4 14; sınıflandırma tablosu 0.5–0.6'dan, kurallar bugün aynı 77 mesajda %88 tam / %99 ±1 ama setler ayar sırasında okundu). Türkçe ekranda eski komut adları (`/gear yanlis`, `/gear sifirla`) yerine İngilizceleri. CHANGELOG'da `tasarruf` yerine `saver`. Yol haritası sırası düzeldi. Kök klasördeki CLAUDE.md `.claude/CLAUDE.md`'ye taşındı: `claude plugin validate`'in tek uyarısı oydu, artık uyarısız geçiyor. 2.1.295 ve 2.1.299'da 173 test geçiyor.
  - **Gözlem, düzeltilmedi:** önceki sohbetteki "readmeyi bence en baştan tekrar oku daha detaylı. düzeltilmesi gereken ufak detaylar gördüm…" mesajını kurallar "belirgin sinyal yok" (T1) gördü, Haiku T0 dedi; büyük sohbette olduğu için Sonnet · low'da kaldı. Küçük sohbette Haiku'ya giderdi. "baştan oku ve düzelt" türü istekler için kural eksiği (adım 5).
- **Portalda ilk doğrulama (18 Ekim 2026, commit e51d6e8):** geçti, engel yok; 6 uyarı, 2 inceleme beklemesi (policy hold). Ayrıca gönderim engeli: "The connected GitHub account can't push to this repository". Bilgisayardaki `gh` hesabı emreyaman1 ve depoda admin; yani sorun claude.ai'daki GitHub bağlantısında (başka hesap ya da Claude GitHub App'in bu depoya erişimi yok), kullanıcının açması gerekiyor. Bulgular ve 0.12.2'deki cevabı: `/clear`'ı kendisi çalıştırması (MOD_RUNS_COMMAND, hold) ve `prompt.submit` kancası (MOD_HOOKS_OPERATION, not) için README'ye "Neye bağlanır, ne çalıştırır" bölümü; ortamdan kimlik bilgisi okuyup dışarı gönderme şüphesi (MCP_FORWARDS_CREDENTIAL_ENV, hold: catch-tests düzeneğindeki değişken adı bir değişkenden okunuyordu, external.mjs internete çıkıyor) için değişken adı açık yazıldı; getter'lar (MOD_BOUNDARY_SHAPES) düz fonksiyon oldu; `globalThis` takma adı (MOD_REFLECTION) kalktı; simge (ICON_MISSING): Claude'un çizdiği ilk öneriyi kullanıcı beğenmedi; Claude Design'ın yaptığı seçildi (yeşil zeminde beyaz dişli, ortasında sarı gösterge ibresi; 1024 piksel PNG, 59 KB, `.claude-plugin/icon.png`). Portal simgeyi eklentinin ilk kaydedildiği ya da gönderildiği anda bir kez alıyor, sonra değişmiyor; bu yüzden simge gelmeden portalda kaydedilmeyecek. Yeri `.claude-plugin/icon.png`, kare PNG ya da JPEG, 512–2048 piksel, 2 MB altı, SVG ve WebP kabul edilmiyor; `tests/eval.test.ts` için "indir ve çalıştır" uyarısı (RUNTIME_FETCH_EXEC) dosyada karşılığı bulunamadı, dosya adı `classifier.test.ts` oldu, kalkıp kalkmadığı yeniden doğrulamada görülecek. `plugin.json`daki `types` alanı için uyarı (UNKNOWN_KEY) bırakıldı: Claude Code'un kendi doğrulaması onu okuyor, portal "kalabilir" diyor.
- **Diğer öneriler:**
  - kıyas tablosu (adım 4);
  - 20–30 saniyelik demo görüntüsü;
  - ham ölçüm sonuçları;
  - sürüm notları;
  - Reddit r/ClaudeAI ve Hacker News'te tanıtım;
  - awesome-claude-code listeleri;
  - hata kaydı (issue) şablonları.

### 12. Ölçümleri genişletmek

- **Neden dış kıyasta zayıf:** SWE-bench ve Terminal-Bench metinleri uzun İngilizce hata kayıtları; kurallar kısa sohbet mesajları için yazıldı. Uzun metinde ipucu kelimeleri zaten geçtiği için kademe yukarı kayıyor (350 görevin 207'sinde gereğinden yüksek). İşin zorluğu çoğu zaman metinde değil kodda.
- **Ne yapılmalı:**
  - Uçtan uca ölçüm: işi yaptı mı, testleri geçti mi, kaça mal oldu.
  - Görev setini 6'dan 20–30'a çıkar. Videodaki gibi gerçek büyük açık kaynak projelerde (ör. sqlglot, pytest, datasette) gizli testli görevler kullan.
  - Her görevi 3 kez çalıştır.
  - Gerçek kullanım setini büyüt (adım 5).

**Hazırlandı (17 Ekim 2026), ücretli çalıştırma onay bekliyor:**

- sqlglot (MIT, 9.700 yıldız, yaklaşık 100 bin satır Python) kullanıcının izniyle `eval/.work/repos/sqlglot` altına indirildi (74 MB; repoya girmez).
- 10 görev `eval/tasks/sqlglot.json`'da: Temmuz 2026'dan sonraki gerçek düzeltmeler (Claude'un bilgi sınırı Haziran 2026, ezber riski düşük). Kod düzeltmeden hemen önceki hâliyle, git geçmişi olmadan kuruluyor; kontrolü o düzeltmenin eklediği testler yapıyor. Türler: belirsiz anlatılmış hata 2, yanıltıcı hata 1 (rapor DuckDB'yi suçluyor, hata StarRocks'ta), sebebi saklı hata 2, yeri belli hata 3, yeni özellik 2.
- `--dry` ile 10'unun 10'u ücretsiz doğrulandı: verildiği gibi kalıyor, gerçek düzeltmeyle geçiyor.
- Optimizasyon hataları alınamadı: testleri duckdb ve pytz paketlerini istiyor; bunları kurmak ayrı bir indirme, sorulmadı.
- Kıyaslanacak kollar: gearbox 0.8.2 (yeni hata avı kuralı), gearbox 0.8.1 (eski kural), hep Sonnet orta, hep Opus yüksek.
- pytest ve datasette denenmedi: kurulumları paket indirmesi istiyor.

**Bir tur yapıldı (17–18 Ekim 2026; harcama liste fiyatıyla yaklaşık $26,8):**

| Düzen | Geçen | Maliyet |
|---|---|---|
| gearbox 0.8.2 (yeni hata avı kuralı) | 8/10 | $4,90 |
| gearbox 0.8.1 (eski kural) | 8/10 | $5,43 |
| Sonnet · medium | 9/10 | $2,49 |
| Opus · high | 9/10 | $8,98 |

- Opus high ilk denemede 4 görevden sonra kullanıcının 5 saatlik limitine takıldı; kalan 6 görev limit sıfırlanınca çalıştırıldı (6/6).
- **Kesin sonuç (bu iki sette, 20 görev, her biri bir kez):** Opus, Sonnet medium'un çözemediği hiçbir görevi çözmedi. Sonnet medium'un kaldığı tek görevde (sq-tsql-output) bütün düzenler kaldı. Toplamda Sonnet medium 19/20, Opus high 19/20 (3,6 kat maliyet), gearbox 18/20 (Sonnet'in yaklaşık 2 katı maliyet). gearbox'ın kaldığı iki görev, Sonnet medium'un tek başına geçtiği görevler; tek çalıştırmada şans payı.
- **Hata avı ayrımı (kullanıcının önerisi) doğrulandı:** iki yeri belli hata avı 0.8.2'de Sonnet'e gitti, ikisi de geçti, $0,49; 0.8.1'de Opus'ta $1,39.
- **gearbox'ın pahalı kısmı:** Opus'a verdiği 5 görev (iki belirsiz rapor, yanıltıcı rapor, iki görev daha) $3,52; aynıları Sonnet medium'da $1,17 ve hepsi geçti (biri hariç: sq-tsql-output herkes kaldı).
- Videodaki "belirsiz ve yanıltıcı hatada Opus gerekli" bulgusu burada çıkmadı: Sonnet medium iki yanıltıcı hatayı (küçük set ve sqlglot) ve belirsiz MySQL raporunu geçti.
- **Karar (kullanıcı, 18 Ekim 2026; 0.9.0):** 'tasarruf' profilinde zor iş (T3) ve belirsiz hata avı da Sonnet high'a gidiyor. Opus yalnızca kritik işte (T4), plan modunda ve kullanıcı istediğinde (`+opus`, "opus ile yap"). Kullanıcının sözü: "in the tasarruf profile send T3 and vague hunts to Sonnet too; keep Opus for T4, plan mode and when I ask for it". 'dengeli' ve 'kalite' değişmedi (T3 Opus high). 143 etiketli mesajda T3'teki 26 mesaj Opus medium'dan Sonnet high'a geçti. Her hücre tek çalıştırmaydı; üç tur (yaklaşık $65) ölçülmedi.
- sq-tsql-output dört düzende de kaldı; görev sağlam (belirsiz anlatım + kestirme düzeltme OUTPUT komutunu bozuyor).

### 13. Sonuçlardan öğrenmek

- **Ne:** Bir kademenin işe yarayıp yaramadığını kaydedip kuralları kendiliğinden ayarlamak: testler geçti mi, `/gear wrong` geldi mi, şikâyet var mı.
- **Örnek:** ruflo (75 bin yıldız) Haiku/Sonnet/Opus seçimini sonuçlara göre güncelliyor.
- **Ne zaman:** birkaç yüz etiketli karar biriktikten sonra.

### 14. context-mode ile birlikte denemek

- context-mode (30 bin yıldız) araç çıktılarını bağlamın dışında tutup bağlamı küçültüyor. Bağlam 40 bin tokenın altında kalırsa gearbox'ın önbellek kuralı daha az devreye girer.
- **Önce:** lisansı belirsiz (NOASSERTION); birlikte birbirini bozmuyor mu, ölç.

### 15. Model kimliklerini kendiliğinden güncellemek

- Yeni model çıkınca `MODEL_IDS` (`hooks/core/models.ts`) elle güncelleniyor. Bunun yerine takma adlar (sonnet, opus) ya da hesaptaki model listesi kullanılsın. Örnek: xafold/jev-router.

### 16. `/gear doctor` komutu

- **Ne:** Kurulum ve ayar sorunlarını tek komutla kontrol edip çözümünü söyleyen komut. Ne kontrol eder:
  - gearbox hangi modda (açık / gölge / kapalı);
  - seçici opusplan mı;
  - efor ayarı ne, yardımcılar neye sabit;
  - sürüm uyumlu mu;
  - son kararlar gerçekten uygulanmış mı.
- **Yapıldı (18 Ekim 2026, 0.12.0):** `/gear doctor`, `hooks/core/doctor.ts`. Her kontrol ✓ (iyi), ⚠ (bakılacak, yanında ne yapılacağı), ℹ (bilgi). Kontroller: açık / gölge / kapalı / durdu (kapalıysa `/gear on` önerir); seçici (Sonnet ya da düşük efor tutuyorsa "gearbox seçicinin üstüne çıkmaz, Opus · high seç"); Claude Code sürümü gearbox'ın denendiği en yeni sürümden yeni mi; son seçimler uygulandı mı (üst üste kaç tur başka model cevapladı); cevap vermeyen modeller; depo yazıp geri okuyabiliyor mu; limit pencereleri okunabiliyor mu; cevap altı satırı ve bant açık mı; plan modu; dil. Ortamdaki `CLAUDE_CODE_EFFORT_LEVEL` ve `CLAUDE_CODE_SUBAGENT_MODEL` için de kontrol yazıldı.
  - **Sınır (dürüst):** eklentinin çalışma ortamında `process` yok (testte "process is not defined"); bu yüzden ortam değişkeni kontrolü büyük olasılıkla hiç çalışmıyor ve sessiz kalıyor. `settings.json`daki `model: opusplan` gibi ayarlar da okunamıyor. 16 Ekim'deki karışıklığın (opusplan, max efor) doğrudan yakalanmış hâli bu yüzden eksik; seçici doktorda Sonnet/düşük efor olarak görünür, ama nedeni (opusplan) söylenemez. Canlı denendi: `/gear doctor` gerçek Claude Code'da çalıştı; ortam kontrolleri denenemedi.
  - **Düzeltildi (0.12.1, 18 Ekim 2026):** Mod API'sinde `$.env.get` varmış (2.1.295 ve 2.1.299'un tür dosyalarında da). Doktor iki değişkeni artık onunla, adıyla okuyor; `claude plugin validate` "env reads: CLAUDE_CODE_EFFORT_LEVEL, CLAUDE_CODE_SUBAGENT_MODEL" diye listeliyor. Test: `mock.env` ile iki değişken verilince doktor ikisini de yazıyor. README'lerin Gizlilik bölümü bu iki okumayı söylüyor. `settings.json`daki `model: opusplan` hâlâ okunmuyor (`$.settings.read()` bütün ayarları, gizli anahtarlar dahil, verir; başvuru incelemesinde kötü görünür diye kullanılmadı).
- **Örnek:** Adityaraj0421/gearbox'un doktor komutu 11 yaygın sorunu kontrol ediyor. 16 Ekim'deki karışıklık (opusplan + gölge mod + max efor + kapalı sanılan düğme) tam bu komutun yakalayacağı türden.

### 17. Büyük sohbetten temiz sohbete geçmek (kullanıcı isteği, 17 Ekim 2026)

**Fikir (kullanıcı):** Bir sohbette birkaç geliştirme yapılınca bağlam (konuşmanın modele gönderilen tamamı) şişiyor, örneğin 700 bin token. Her işten sonra commit ve push alındığına göre iş yeni, boş bir sohbette sürebilir. gearbox bunu fark edip kendisi yapsın.

**Doğru olan, düzeltilen:** Claude her mesajda projeyi baştan taramaz. Ama her adımda (her araç çağrısında) konuşmanın tamamını, daha önce okunan dosyalar ve komut çıktılarıyla birlikte, modele yeniden gönderir. Önbellek bunu ucuzlatır, ortadan kaldırmaz:
- Opus 5.5'te önbellekten okuma milyon token başına $0,20 (liste fiyatı, `hooks/core/prices.ts`). 700 bin tokenlık sohbette her adım yaklaşık $0,14; 20 adımlık bir mesaj yalnızca eskiyi yeniden okumak için yaklaşık $2,80. 30 bin tokenla başlayan temiz sohbette aynı 20 adım yaklaşık $0,12.
- Önbellek bir saat kullanılmazsa söner (abonelikte; bkz. "gearbox ve önbellek"); o zaman 700 bin token bir kez tam yazılır, Opus'ta $3,50–5,60.
- Abonelikte bu para değil, limit olarak düşer. Çok uzun bağlamda modelin dikkatinin dağıldığı da söylenir; ölçülmedi.

**Mod API'si ne izin veriyor** (Claude Code 2.1.299'un kendi tür dosyasından, 17 Ekim 2026; hiçbiri denenmedi):
- Bağlamın doluluğunu okumak: `$.session.usage()` → `context`, durum satırındaki rakamlar. Ücretsiz.
- Konuşmayı sıkıştırmak: `$.session.compact({ instructions })`, `/compact` ile aynı çağrı, turlar arasında.
- Bir eğik çizgi komutunu kişi yazmış gibi çalıştırmak: `$.command.run({ command })`, oturum boşta olunca. `/clear` için kabul edilip edilmediği denenmeli.
- İstem göndermek ya da önermek: `$.prompt.submit`, istem kutusuna yazmak `$.prompt.fill`, Tab ile alınan öneri `$.prompt.suggest`. Bir sonraki isteme ek bilgi: `prompt.submit` kancasında `context`.
- Konuşmanın özetini çıkarmak: `$.model.fork({ prompt })`; aynı konuşmanın önbelleğinden okur.
- **Yok:** yeni, ayrı bir oturum açmak (masaüstü uygulamasının kenar çubuğunda yeni satır). `/clear` aynı süreçte yeni bir oturum kimliğiyle sürer ve ondan sonra `session.start` çalışmaz.

**Önerilen tasarım (araştırmadaki hâli; yapılan sürüm aşağıda):**
1. **Ne zaman:** bağlam bir eşiği geçmiş (ör. 150 bin token; ölçerek seçilir), bir iş bitmiş (commit ya da push başarıyla çalışmış, testler geçmiş) ve yeni mesaj henüz yazılmamış.
2. **Kendiliğinden değil, sorarak:** üstteki bantta ya da istem kutusunda öneri: "Bu sohbet 700 bin token. Temiz sohbete geçilsin mi?" Onaysız bağlam silinmez.
3. **Devir notu:** `$.model.fork` ile kısa bir not yazdırılır: proje, ne yapıldı, son commit, açık işler, kullanıcının kuralları. Aynı modelin önbelleğinden okuduğu için 700 bin tokenda yaklaşık $0,14.
4. **Geçiş:** not saklanır (gearbox'ın deposu `$.store` ya da proje içinde bir dosya), `/clear` çalışır, not yeni sohbetin ilk mesajına `context` olarak eklenir.
5. **Daha basit seçenek:** `/clear` yerine `$.session.compact({ instructions })`. Claude Code'un kendi özeti; yeni ayar gerektirmez. Ama özet ayrıntı atabilir ve konuşma aynı oturumda kalır. Claude Code bağlam dolmaya yaklaşınca kendisi de sıkıştırıyor; 1 milyonluk pencerede 700 binde henüz değil.
6. **gearbox'ın önbellek kuralıyla bağı:** temiz sohbet 40 bin tokenın altında başlar, model yine serbestçe değişebilir (0.9.1 kuralı).

**Denendi (17 Ekim 2026, Claude Code 2.1.299, Haiku ile, toplam yarım sentten az):**
- **Bir eklenti `/clear` çalıştırabiliyor.** Deneme eklentisi ilk tur bitince `$.command.run({ command: 'clear' })` çağırdı: kabul edildi, `session.end` "clear" nedeniyle çalıştı, konuşma yeni kimlikle sürdü ve model ilk mesajdaki kelimeyi bilmedi.
- **Eski sohbet silinmiyor.** Kaydı (`~/.claude/projects/.../<eski kimlik>.jsonl`) yerinde kaldı; `claude --resume <eski kimlik>` ile açılınca kelimeyi hatırladı. `session.end` eski kimliği `resume` alanında veriyor; gearbox bunu devir notuna yazabilir.
- **Temizlenmiş sohbet sıfır değil:** sistem istemi ve araçlarla yaklaşık 15 bin token.
- **Masaüstü uygulaması:** her oturumun kaydında `cliSessionId` ve 9 oturumda `priorCliSessionIds` (önceki kimlikler) var; uygulama zinciri tutuyor. Uygulamanın kendi kodunda (`app.asar`, 2.42304) `/clear` için ayrı bir yol var: temizlenen konuşmanın kimliğini `preClearCliSessionId` olarak saklıyor, arayüze `hasPreClearSession` diye bildiriyor. Yani uygulama temizlenmiş konuşmanın izini tutuyor; ekranda eski mesajların kalıp kalmadığı ve geri dönüş düğmesi olup olmadığı gerçek bir masaüstü sohbetinde denenmedi.
- **Kendi paneli:** `$.ui.open` ile bir panel (Pane) açılabiliyor. Masaüstünde (deneme eklentisi `panel-test`, örnek devir notuyla) `placement: dock` geldi ve panel sağ sütunun **tamamını** kapladı; "Ortam / Bağlam / Değişiklikler" kutuları kayboldu, panelin kapatma ve büyütme düğmesi var. Kullanıcı bunu istemiyor: gearbox o kutuların yanında küçük bir kutu olmalı. API'de buna yer yok: `Pane` için yalnızca `rows` (istem üstünde) ve `columns` (dokta genişlik) isteniyor; sağ sütundaki kutular uygulamanın kendi parçası, eklentiye açık bir bileşen yok (2.1.299'un tür dosyası: bileşenler `AbovePrompt`, `Pane`, transkript satırları). Deneme eklentisi silindi.
- **Karar (kullanıcı, 17 Ekim 2026):** bant yolu. "Önerdiğin şekilde olsun; frontendini sonra geliştiririz, şimdilik çalışsın yeterli."
- **Bugün yapılabilen:** devir notu gearbox'ın zaten çizdiği istem üstü bandında tek satır ("Sohbet 700 bin token · devir notu hazır · [temiz sohbet] [notu gör]"); tam not yalnızca kullanıcı "notu gör"e basınca panelde açılır, işi bitince kapatılır. Sağ sütunda kutu için Anthropic'e istek yazılabilir (eklentilere kenar çubuğu kutusu).

**Yapıldı (ilk sürüm, 17 Ekim 2026; görünüş sonra iyileştirilecek):** `hooks/core/handover.ts` (kurallar ve metinler), `hooks/register.tsx` (bağlantılar), `tests/handover.test.ts` (13 test). 2.1.299 ile bütün testler geçiyor (134).
- **Ne zaman:** ana sohbette bir tur biter, o turda Bash'te başarılı bir `git commit`/`git push` ya da geçen bir test çalıştırması (`npm test`, `pytest`, `claude plugin test` gibi; yalnızca test dosyasını okumak sayılmaz) olmuşsa, ve bağlam 150 bin tokenı geçmişse. Eşik `HANDOVER_TOKENS`: 150 binde Opus'ta her adım yaklaşık $0,03, temiz sohbette yaklaşık $0,005; 20 adımlık bir mesajda yaklaşık $0,50 kalır, notun kendi maliyetinin on katı. Ölçülmedi, başlangıç değeri.
- **Ne zaman değil:** gearbox kapalıyken (`/gear sabitle`) ya da bant kapalıyken (`/gear bant kapa`) not yazılmaz; yardımcıların (alt ajanların) komutları sayılmaz; aynı anda ikinci not yazılmaz.
- **Not:** tur bitince, turu bekletmeden `$.model.fork` ile yazılır (en fazla 8 satır istenir, 12 satırda kesilir, kod bloğu işaretleri atılır). Satırlar: Devir notu (proje, tarih) / Proje (klasör, dal, son commit) / Yapılan / Açık / Kurallar / Oku. Bilmediğini uydurmaması söylenir. Maliyeti gearbox'ın kendi harcaması sayılır (tasarruf hesabında aleyhine).
- **Bant:** gearbox'ın satırının altında ikinci satır: "⚙ Sohbet 700 bin token · devir notu hazır · [temiz sohbet] [notu gör]". Kullanıcı başka bir mesaj yazarsa öneri kalkar (not artık eski kalır); bir sonraki biten işte yenisi yazılır.
- **Kendiliğinden hiçbir şey yapılmaz:** sohbet yalnızca "temiz sohbet"e basınca temizlenir, panel yalnızca "notu gör"e basınca açılır. Panelde not, eski sohbete dönüş satırı ve "kapat" düğmesi var.
- **"temiz sohbet":** not gearbox'ın deposuna (`$.store`, anahtar `handover`) da yazılır, `$.command.run({ command: 'clear' })` çalışır, `session.end` "clear" ile eski sohbetin kimliğini verir. Bant "devir notu ilk mesajınla gidecek" der. Kullanıcının ilk mesajına not, görünmeden (`context`), "Eski sohbet: claude --resume <eski kimlik>" satırıyla eklenir; yalnızca bir kez. Temizleme olmazsa bildirim çıkar, hiçbir şey değişmez.
- **Kullanıcının kendi `/clear`'ı:** not eklenmez, öneri kalkar.

**Masaüstü uygulamasında temizleme sonrası (açık soru, kısmen bakıldı):** uygulamanın kodunda (`app.asar`, 2.42304) kendi temizleme yolu var: temizlenen konuşmanın kimliğini `preClearCliSessionId` olarak tutuyor ve arayüze açık bir `resumePreClearSession` ("temizlemeden önceki sohbete dön") işlemi var. Ama bu yol uygulamanın kendi temizlemesi için. gearbox'ın temizlemesi uygulamanın içinden değil Claude Code'un içinden çalışıyor; uygulama yeni kimliği görünce eski kimliği zincire (`priorCliSessionIds`) ekliyor gibi görünüyor, ama eski mesajların ekranda kalıp kalmadığı, geri dönüş düğmesinin çıkıp çıkmadığı gerçek bir masaüstü sohbetinde **denenmedi**. Kesin olan: eski sohbet diskte kalıyor ve `claude --resume <eski kimlik>` ile açılıyor (yukarıda denendi); not bu satırı taşıyor.

**Kalan:**
- **Düğme denendi (18 Ekim 2026, 0.12.0, 447 bin tokenlık masaüstü sohbeti):** "temiz sohbet" `/clear` çalıştırdı, yeni sohbetin ilk mesajına devir notu gitti; yeni sohbetteki Claude eski konuşmayı görmedi, yalnızca notu. Masaüstü uygulaması eski mesajları ekranda tutuyor ve bağlam kutusu temizlemeden hemen sonra eski rakamı (447 bin) gösterdi; aynı anda oturumun kendi süreci 140 bin token bildirdi (iki büyük dosya okunduktan sonra). Kullanıcı bunu "/clear bağlamı sıfırlamıyor" diye okudu. Sonraki cevaptan sonra kutunun başlığı güncellendi (276 bin, %28), ama altındaki döküm (Messages 390,1 bin, %39) ve ondan çizilen çubuk (yaklaşık %47) temizlemeden önceki hâlinde kaldı; aynı anda oturumun süreci Messages 203,5 bin bildirdi. Bu masaüstü uygulamasının kendi hatası; sağ sütundaki kutular eklentiye açık değil, autogear düzeltemez. **Bulunan hata:** temizlemeden sonra bant autogear'ı "AÇIK" gösterdi, gerçek durum gölgeydi. Sebep: oturumun eklenti durumu (bandın okuduğu değerler) yeni oturum kimliğiyle sıfırdan başlıyor ve `session.start` çalışmıyor. 0.12.1'de bant durumu modülün kendi bilgisinden okuyor; test eklendi (düzeltme olmadan düşüyor).
- **Gerçek bir sohbette denemek:** büyük bir masaüstü sohbetinde commit sonrası bant satırı çıkıyor mu, `$.model.fork` turdan sonra sorunsuz çalışıyor mu, düğmeden `/clear` kabul ediliyor mu, ilk mesaja not gidiyor mu. Testler motorun yerine geçen sahte parçalarla çalışıyor; gerçek motorla denenmedi. Sürüm 0.10.0 yapıldı. Kurulu gearbox kopya değil, doğrudan `C:\gearbox` klasöründen okunuyor (`claude plugin list`: "Read from: C:\gearbox"); yeni kod yeni bir sohbette ya da açık sohbette `/reload-plugins` ile yüklenir.
- **İlk gerçek deneme (17 Ekim 2026, bu sohbet, 0.10.0, gölge mod):** öneri çalıştı: test çalıştırılan turdan sonra not yazıldı (258 bin, sonra 284 bin token), bantta "⚙ Sohbet 284 bin token · devir notu hazır [temiz sohbet] [notu gör]" çıktı. İlk seferde kullanıcı görmedi: not tur bittikten 5–10 saniye sonra geliyor ve kullanıcının bir sonraki mesajı öneriyi siliyor (tasarım gereği), o yüzden "çıkmadı" mesajı öneriyi kaldırdı. Kullanıcı: bant "çok karışık duruyor, biraz düzenlemek lazım" (iki satır, uzun limit uyarısı, iki ⚙); öneri bir sonraki mesajda kaybolup geri gelmedi. **0.10.1'de düzeltildi (kullanıcı: "şimdi yap"):** öneri sen yazmaya devam etsen de durur, **×** ile kapanır ya da yeni not gelince yenilenir; not yazılırken "Devir notu hazırlanıyor…" görünür; ikinci satır "Devir notu hazır · sohbet 284 bin token", ⚙ işaretsiz; bantta limit uyarısı yalnızca başı ("5 saatlik limit %93"; tamamı cevabın altında ve `/gear`'da); gölge modda "önerisi … · cevabı seçici veriyor" yerine "… önerirdi". "temiz sohbet" düğmesi henüz denenmedi; "hazırlanıyor" satırı için test yok.
- Masaüstünde temizleme sonrası eski mesajlar ve geri dönüş (yukarıda).
- Not eksik kalırsa yeni sohbet önemli bir kararı bilmez. Kalıcı bellek CLAUDE.md ve bu gibi plan dosyaları; not "Oku" satırında onlara işaret ediyor.
- **Ölç:** aynı beş geliştirme işi tek sohbette ve her işten sonra temizlenerek; maliyet, limit ve sonuç kıyası. Eşik (150 bin) buna göre ayarlanır.
- Görünüş: bant satırı ve panel sade; kullanıcı "frontendini sonra geliştiririz" dedi.

## Yapmamaya karar verilenler

| Özellik | Örnek proje | Neden yapmıyoruz |
|---|---|---|
| Her adımda yeniden model seçmek | jev-router, weave-os/router | Model her değişince önbellek bozulur; jev-router'ın kendi ölçümünde uzun oturumlarda fatura düşmemiş. |
| Başka şirketlerin modelleri | claude-code-router, weave-os/router | Kapsam dışı; araya giren program ve API anahtarı ister. |
| Kararı dış bir servise sormak | jev-router (TypeSafe) | Mesaj üçüncü bir şirkete gider; gizlilik avantajı kaybolur. |
| Web paneli | claude-agent-tools, weave-os/router | Cevap altı satırı, bant ve tasarruf kartı yeterli. |
| Ucuz cevabı otomatik olarak güçlü modelle tekrar çalıştırmak | NadirClaw | Maliyeti ikiye katlar; kartopu freni yeterli. |
| "Her şey Sonnet" ile kıyas | — | Kullanıcı kararı: gerçekte kimse böyle kullanmıyor. |
