# Gece günlüğü (18–19 Ekim 2026)

Kullanıcı bilgisayardan uzakken yapılan geliştirmenin adım adım kaydı. Bağlam sıkışırsa buradan sürdürülür. Bütün iş `C:\gearbox-dev` klasöründe, `gelistirme` dalında; `main`'e ve `C:\gearbox`'a dokunulmuyor (dizin incelemesi sürüyor).

## Kurulum

- `git worktree add C:\gearbox-dev -b gelistirme` (main @ 136ec60'tan).
- Yalnızca bu bilgisayarda duran gerçek kullanım seti (`eval/field.ts`, `tests/field.test.ts`) ve Haiku cevap önbelleği (`eval/.work/`) çalışma kopyasına kopyalandı; git onları zaten dışarıda tutuyor (`.git/info/exclude`), commit'e girmiyor.
- Test komutu: iki Claude Code sürümü (2.1.299 ve 2.1.295) ile `claude plugin test .`, ayrıca `claude plugin validate .`.

## Başlangıç ölçümü (hiçbir değişiklik yokken)

- Testler: 2.1.299'da 173/173, 2.1.295'te 173/173 geçti. `validate` geçti, uyarı yok.
- Kurallar tek başına: dev %100 tam / %100 ±1; holdout %91 / %98; fresh %85 / %100; gerçek kullanım tekrarı %59 / %98, ciddi hata 0.
- 143 mesaj × 8 dil (LANG): tam isabet tr %92, en %92, es %85, de %85, fr %86, ru %81, zh %83, ja %83; ciddi hata her dilde 0.
- held (36 × 8): %81–97 tam; blind (24 × 8): %63–88 tam; ciddi hata 0.
- Bu sayılar kıyas için; setlerin çoğu daha önce kurallar ayarlanırken okundu ("tüketildi"), yani kuralların gerçek başarısını değil, değişikliğin bir şeyi bozup bozmadığını gösterir.

## Geliştirme 1: "baştan oku, dikkatlice kontrol et, düzelt" türü mesajlar

- **Sorun (kanıt):** 18 Ekim'deki gerçek mesaj "readmeyi bence en baştan tekrar oku daha detaylı. düzeltilmesi gereken ufak detaylar gördüm bir tane daha fazla olabilir". Kurallar hiçbir işaret görmedi (T1, emin değil), Haiku T0 dedi. Küçük bir sohbette bu iş Haiku'ya, yani en zayıf modele giderdi; 400 satırlık bir README'yi ince ince okuyup hata bulmak zayıf modelin kaçıracağı türden iş.
- **Değişiklik:** yeni kural "dikkatli okuma ve düzeltme": (a) "gözden geçir", "elden geçir", "review", "proofread", "look over" gibi sözler tek başına; ya da (b) bir okuma/kontrol fiili ("oku", "kontrol et", "read", "check", "go through") + bir özen sözü ("baştan", "tekrar", "dikkatlice", "detaylı", "satır satır", "again", "carefully", "whole") + düzeltilecek bir şey ("düzelt", "hata", "eksik", "detaylar", "fix", "mistake"). Sonuç T2, emin değil (Haiku'ya sorulur), ama Haiku daha düşük derse T2'de kalır (alt sınır). Haiku daha yüksek derse (T3) onun dediği olur. Yedi dilin karşılıkları da eklendi (İspanyolca "revisa", Almanca "überprüfe", Fransızca "relis", Rusça "перечитай", Çince "审查/仔细", Japonca "見直し"). İçinde "review" geçen özellik isteği ("add a review form") özellik olarak kalıyor.
- **Neden T2 ve neden bu kadar dar:** T2 Sonnet · medium demek; net anlatılmış işte en iyi değer (adım 6 ve 12'nin ölçümleri). "oku" tek başına tetiklemiyor ("bu dosyayı oku ve anlat" soru olarak T0 kaldı); "go through" ve "double-check" yalnızca özen sözü ve düzeltilecek bir şeyle birlikte sayılıyor, çünkü "go through the steps", "double-check the port" küçük işler.
- **Test:** `tests/core.test.ts` içinde yeni test: gerçek mesaj T2 ve alt sınır 2; sekiz dilde 12 inceleme isteği Haiku T0 dese bile en az T2; üç yanlış alarm örneği. Değişiklik olmadan test düşüyor (denendi: gerçek mesaj T1 çıktı).
- **Tam test:** 2.1.299 174/174, 2.1.295 174/174, `validate` geçti, uyarı yok.
- **Önce/sonra (kurallar tek başına, ücretsiz):** dev, holdout, fresh, gerçek kullanım tekrarı, 143 × 8 dil, held, blind: bütün özet satırları birebir aynı. 2.111 mesajdan yalnızca 2'si değişti, ikisi de kör setten ve ikisi de iyi yönde: İspanyolca "formulario ... revisa" (etiket T2) ve Fransızca "Revois la gestion des fichiers téléversés" (etiket T3) artık T2 alt sınırı taşıyor; eskiden Haiku T1'e indirebilirdi.
- **Dış ölçüt (`node eval/external.mjs`, 741 uzun İngilizce görev, ücretsiz):** yalnızca 1 görev T1'den T2'ye çıktı (gereğinden yüksek tahmin 128 → 129 ve 209 → 210); ciddi hata değişmedi (10 ve 6).
- **Ölçülemeyen:** bu tür mesaj ölçüm setlerinde neredeyse hiç yok; yeni kuralın gerçek kullanımda ne sıklıkla doğru çalıştığını yalnızca gölge kayıt gösterir. Kural benim yazdığım örneklerle denendi; dürüst bir ölçüm değil.
- **Bulunan, düzeltilmeyen:** "fix the errors in the README", "korrigiere die Fehler", "исправь ошибки" gibi metin düzeltme istekleri "belirsiz anlatılmış hata" (T3, hata avı) sayılıyor, çünkü "error/Fehler/ошибк" hata ayıklama sözü. Bu gereğinden yüksek (pahalı yön), zayıf modele gitme riski yok; düzeltmek hata avı kuralının sırasını değiştirmeyi gerektirir, riskli olduğu için dokunulmadı.
- **Karar:** commit.

## Adım 2: yardımcıların (alt ajanların) kotadaki payı

- **Bu ölçüm neyi cevaplayacak:** yardımcıları işin türüne göre ucuz modele (keşif işini Haiku'ya) vermek değer mi? Notlardaki koşul: "önce payını ölç; değmiyorsa yapma".
- **Yöntem (ücretsiz, model çağrısı yok):** `~/.claude/projects` altındaki bütün sohbet kayıtları okundu; ölçüm betiklerinin geçici klasörleri (`Temp-gearbox-*`, `Temp-claude-*`, scratch) dışarıda. Her model isteğinin token sayıları liste fiyatıyla çarpıldı (aynı istek bir kez sayıldı). Yardımcı sayılan: `subagents/` klasöründeki kayıtlar ve yan kol (`isSidechain`) satırları. Betik oturumun geçici klasöründe (`subshare.mjs`), repoya eklenmedi.
- **Sonuç:** 30 Temmuz – 18 Ekim 2026, 1.976 oturum. Toplam $2.725 (liste fiyatı; abonelikte limit olarak düşer). Ana sohbet: Opus 15.743 istek $2.282, Sonnet 3.479 istek $402, Haiku 2.025 istek $1,7. Yardımcılar: 27 çalıştırma, Sonnet 668 istek $38,5, Opus 18 istek $1,0, Haiku 33 istek $0,02. **Yardımcıların payı %1,4.**
- 16 Ekim notundaki "yaklaşık 200 yardımcı" bugünkü kayıtlarda yok: kayıtlarda yalnızca 27 Agent çağrısı var (25 genel amaçlı, 2 kullanıcının kendi tanımlı yardımcısı). Eski sayı başka bir şeyi saymış olabilir; doğrulanamadı.
- **Karar: yardımcı yönlendirme yapılmıyor.** En iyi durumda (bütün yardımcılar Haiku'ya) kazanç %1,3 civarı; buna karşılık keşif yardımcısının eksik getirdiği bilgi, onu kullanan pahalı ana işi bozabilir. README'lerin yol haritası satırı ve `docs/sonraki-adimlar.md` adım 7 bu ölçümle güncellendi. Kullanıcı yardımcıları daha çok kullanmaya başlarsa yeniden ölçülmeli.

## Adım 3: gerçek kullanımın yeniden okunması (16–18 Ekim)

- **Bu inceleme neyi cevaplayacak:** gerçek mesajlarda kuralların hâlâ kaçırdığı türler var mı? (Gerçek kullanım seti `eval/field.ts` 11–16 Ekim'i kapsıyor; sonrası hiç ölçülmedi.)
- **Yöntem (ücretsiz):** kayıtlardaki kullanıcı mesajları (16 Ekim 12:00 – 18 Ekim), Haiku ölçüm betiklerinin kendi soruları hariç: 98 mesaj. Her biri bugünkü kurallarla okundu, yanına autogear'ın deposundaki günlükten o gün Haiku'nun cevabı ve seçilen kademe kondu. Etiket benim yargım (işin sonradan ne çıktığına bakarak), yani tek kişilik ve dürüst bir ölçüm değil; hata türünü bulmak için.
- **Bulunanlar:**
  1. **Kesin ve yanlış T0 (ciddi):** "Önce adım 17'yi gerçek bir sohbette deneyelim: sürümü artır, kurulu kopyayı güncelle, nasıl deneyeceğimi anlat." ve "held ve held2 setlerini Haiku ile ölç … eval/haiku.mjs'e bu setleri okuttur, sonra çalıştır; sonucu sade dille anlat." Sondaki "anlat" (açıkla) mesajı "soru" yapıyor, kurallar emin olduğu için Haiku'ya da sorulmuyor. Küçük sohbette Haiku'ya gider. 98 mesajda 3 tane.
  2. **"Evet, pushla."** önceki işin kademesini (T3) sürdürüyor; işin kendisi önemsiz (T0). 2 tane. Büyük sohbette model zaten değişmiyor, yalnız efor; küçük kazanç.
  3. **Yanlış alt sınır:** "hâlâ incelemede olduğu için hiçbir şey pushlamıyoruz" mesajındaki "incelemede" (incelemede olmak) "incele" (incelemek isteği) sanılıyor, Haiku T0 dese de T2'de tutuluyor. 1 tane. Benim yeni kuralımdaki "gözden geçir" de aynı açığa sahip ("gözden geçirildi").
  4. Gereğinden yüksek ama zararsız (dokunulmadı): "sadece not al" diye biten uzun not listeleri T4 (#5, #6; işin kendisi T2); "yarın başlarız o işlere", "bunu kullanıcaz" gibi sözlere Haiku önceki kademeye bakıp T3 diyor.

## Geliştirme 3: "…yap, sonucu anlat" artık kesin bir soru (T0) değil

- **Değişiklik:** "soru" kuralı (T0, kesin) artık mesajda bir değiştirme fiili ("güncelle", "yap", "change") ya da çalıştırma/ölçme fiili ("çalıştır", "ölç", "kur", "run", "measure", "install"; yedi dilde karşılıkları) varken çalışmıyor. Böyle bir mesaj iş sayılıyor ve kurallar emin değil: Haiku'ya soruluyor. Çalıştırma/ölçme fiili tek başına da artık "iş" (T1, emin değil); eskiden "soru" ya da "belirgin sinyal yok" sayılıyordu.
- **Neden kesin T0 kötü:** kurallar emin olunca Haiku'ya hiç sorulmuyor; küçük sohbette iş doğrudan Haiku modeline gidiyor. Bu üç mesajın işi (sürüm artırma ve kurulum, ölçüm betiğini değiştirip çalıştırma) T1–T2.
- **Test:** yeni test, gerçek iki mesaj ve iki benzeri: emin değil ve "iş" türü; "bu fonksiyon ne yapıyor?" ve "son commit'te ne değişti, özetle" yine kesin T0.
- **Tam test:** 2.1.299 175/175, 2.1.295 175/175, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli ölçüm mesajında hiçbir değişiklik yok (bütün setler, sekiz dil); dış ölçüt (741 görev) birebir aynı. 98 gerçek mesajda 3 mesaj kesin T0'dan "T1, Haiku'ya sor"a geçti (ve ardından gelen bir "sonraki adımı uygula" onların kademesini aldı).
- **Ölçülemeyen:** Haiku'nun bu üç mesaja ne diyeceği (ölçülmedi; o gün sorulmamıştı). Haiku T0 derse yine T0'a düşebilir; kazanç, artık sorulması.

## Geliştirme 4: "Evet, pushla." önemsiz iş (T0), önceki işin kademesi değil

- **Değişiklik:** kısa bir onayın ("evet", "tamam", "ok") yanında yalnızca önemsiz bir iş ("pushla", "commit et") varsa ve işi sürdüren bir söz ("yap", "devam", "uygula") yoksa, mesaj önemsiz iş (T0) sayılıyor. Eskiden onay olduğu için önceki işin kademesini (gerçek kullanımda T3) taşıyordu. "evet öyle yap ve pushla", "tamam devam et, sonra commitle" önceki kademede kalıyor.
- **Yan düzeltme:** dil tanıma "evet", "tamam", "hayır", "lütfen", "yes" sözlerini Türkçe/İngilizce işareti saymıyordu; "Evet, 0.12.0 commitini GitHub'a pushla." yabancı dil sanılıp Haiku'ya sorulacaktı. Eklendi.
- **Test:** yeni test (gerçek iki mesaj ve üç karşı örnek). 2.1.299 176/176, 2.1.295 176/176, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli mesajda değişiklik yok; dış ölçüt birebir aynı; 98 gerçek mesajda 2 mesaj (iki "pushla") T0'a indi.
- **Bilinen risk (eskiden de vardı):** önemsiz işten hemen sonra gelen "devam" ya da "sonraki adımı uygula" önceki mesajın kademesini (T0) alıyor; küçük sohbette Haiku'ya gider. Tek başına "pushla" için bu bugün de böyle. 98 gerçek mesajda pushla'dan sonra hiç "devam" gelmedi (her seferinde yeni bir iş tarifi geldi), bu yüzden şimdilik dokunulmadı; rapora yazıldı.

## Geliştirme 5: "incelemede", "gözden geçirildi" bir istek değil

- **Değişiklik:** "incele" ipucu artık "incelemede", "incelemeye", "incelendi/incelenmiş" gibi durum bildiren biçimleri saymıyor; "gözden geçir/elden geçir" de edilgen biçimi ("gözden geçirildi") saymıyor. Bunlar "bir şeye bak" isteği değil, bir durum.
- **Kanıt:** "hâlâ incelemede olduğu için hiçbir şey pushlamıyoruz sanırsam" mesajına Haiku T0 dedi, ama "incele" yüzünden konan alt sınır onu T2'de tuttu (gereğinden yüksek). 98 gerçek mesajda 1 tane.
- **Test:** yeni test (gerçek mesaj, "README gözden geçirildi mi?"; "bu modülü incele" ve "README'yi gözden geçir" alt sınırı koruyor). 2.1.299 177/177, 2.1.295 177/177, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli mesajda değişiklik yok; dış ölçüt aynı; 98 gerçek mesajda 1 mesaj (yukarıdaki) alt sınırını kaybetti.

## Ölçüm: düzeltilen mesajlarda Haiku ne diyor (gerçek Haiku, $0,014)

- **Bu ölçüm neyi cevaplayacak:** yeni kurallarla, kurallar + Haiku birlikte (autogear'ın gerçekte yaptığı) bu mesajları nereye koyuyor?
- **Sonuç (10 mesaj, her biri bir kez):** dört gerçek mesajın dördü de T2'ye düştü (Haiku bu sefer T2 dedi; 17 Ekim'de aynı README mesajına T0 demişti, yani Haiku aynı mesaja her seferinde aynı cevabı vermiyor). İnceleme isteklerinde Haiku "proofread the README" ve Fransızca "relis le README…" için T0, "review my changes" için T1 dedi; alt sınır üçünü de T2'de tuttu. "kodu gözden geçir" için Haiku T3 dedi, o geçerli oldu.
- **Okuma:** alt sınır, tam da Haiku'nun düşük dediği yerde işe yarıyor. Tek çalıştırma, küçük örnek.

## Adım 8'e bakış: danışman (advisor) istek başına açılabilir mi? (ücretsiz, tür dosyası okundu)

- **Sonuç:** hayır. Mod API'sinde bir isteğin yalnızca modeli ve eforu değiştirilebiliyor; danışman için alan yok. Danışmanın çağrıları cevapta görünüyor ama değiştirilemiyor; ayarlar yalnızca okunabiliyor. Tek yol `/advisor` komutunu turlar arasında çalıştırmak; bu kalıcı bir ayar değişikliği ve dizin incelemesinin zaten işaretlediği türden ("kendi kendine komut çalıştırıyor").
- **Karar:** kod yazılmadı. `docs/sonraki-adimlar.md` adım 8'e bulgu ve öneri yazıldı (yapılmasın; yapılırsa bir kez ve sorarak). Kanıt da zayıf: adım 4'te danışmanlı düzen 9/10, tek başına Sonnet 10/10.

## Geliştirme 6: PowerShell komutları da sayılıyor

- **Sorun (kanıt):** autogear iki şey için komutları izliyor: test ya da derleme başarısız kaldıysa bir sonraki mesajı bir kademe yukarı almak ("kartopu freni") ve commit/push/geçen test sonrası büyük sohbette temiz sohbet önermek. İkisi de yalnızca Bash'e bağlıydı. Windows'ta Claude Code komutları PowerShell aracıyla da çalıştırıyor (bu oturumun kendi ortamında PowerShell birincil kabuk). Kullanıcının 15 Eylül'den beri kayıtlarında 6.166 Bash ve 415 PowerShell komutu var; PowerShell'dekilerden 14'ü test/derleme komutu. PowerShell'i birincil kullanan bir Windows kullanıcısında iki özellik de hiç çalışmazdı.
- **Değişiklik:** aynı izleme PowerShell aracına da eklendi (aynı kural, aynı fonksiyon). Komut değiştirilmiyor ve durdurulmuyor. README'lerin "Neye bağlanır" bölümü "yalnızca Bash ve PowerShell" oldu.
- **Test:** iki yeni test: PowerShell'de başarısız `npm test` sonraki mesajı bir kademe yukarı alıyor; PowerShell'de `git commit` büyük sohbette devir notunu başlatıyor. Değişiklik olmadan ikisi de düşüyor (denendi: 177 geçti, 2 kaldı). Tam test: 2.1.299 179/179, 2.1.295 179/179; `validate` uyarısız, yeni kancayı "tool.call{tool=PowerShell}" diye listeliyor.
- **Ölçüm:** sınıflandırma değişmedi (2.111 mesajda 0 değişiklik).
- **Dikkat:** bu, eklentinin bağlandığı olay listesine yeni bir satır ekliyor; `main`'e katılınca dizin taraması bunu görür (README'de yazıyor).
- **Bulunan, düzeltilmeyen:** "test" ya da "build" kelimesi geçen her komut (`cat tests/…`, içinde "test" geçen bir `node -e` betiği) kontrol sayılıyor. Kayıtlarda bunlardan 8'i hata verdi; hiçbiri turun son kontrolü olmadığı için sonucu etkilemedi (günlükte "test/derleme kırık" işareti 209 kayıtta 0). Sıkılaştırmak (yalnız gerçek test çalıştırıcıları) kartopu frenini zayıflatabilir; dokunulmadı.

## Geliştirme 7: önemsiz bir mesajdan sonra "devam" önemsiz iş değil

- **Sorun:** "devam", "sonraki adımı uygula" önceki mesajın kademesini kesin olarak alıyor. Önceki mesaj önemsizse (bir push, bir soru; T0), sürdürülen iş de T0 sayılıyor ve küçük sohbette Haiku'ya gidiyor. Gerçek kullanımda bir kez oldu (17 Ekim: "sonraki adımı uygula", önceki mesaj kesin T0 sayıldığı için; o hata Geliştirme 3'te düzeldi). Geliştirme 4 ("Evet, pushla." T0) bu durumu biraz daha sık yapabilirdi; bu adım o riski kapatıyor.
- **Değişiklik:** önceki kademe T0 iken işi sürdüren bir söz ("devam", "uygula", "yap", "sonraki adımı …", "go ahead", "继续", "продолжай" vb.) artık "T1, emin değil, alt sınır T1": Haiku'ya soruluyor, ama Haiku T0 derse T1'de kalıyor. Yalın onay ve teşekkür ("tamam", "evet", "merci") eskisi gibi önceki kademede. Önceki kademe T1 ve üstüyse hiçbir şey değişmedi.
- **Test:** yeni test (dört sürdürme sözü, üç karşı örnek). 2.1.299 180/180, 2.1.295 180/180, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli mesajda değişiklik yok; gerçek kullanım tekrarı (FIELD) aynı. 98 gerçek mesajda ek değişiklik yok (o tek örnek Geliştirme 3'ten sonra zaten önceki kademesi T1 olan bir mesajın ardından geliyor).
- **Bedel:** T0'dan sonraki her "devam" için bir Haiku sorusu (yaklaşık $0,0002) ve en az Sonnet.

## Son kontrol ve bitiş

- Son hâl: 2.1.299 180/180, 2.1.295 180/180, `validate` uyarısız. Başlangıca göre 2.111 etiketli mesajdan 2'si değişti (ikisi de iyi yönde), bütün özet satırları birebir aynı; dış ölçütte 741 görevden 1'i T1→T2.
- Limit: 5 saatlik %34, haftalık %65 (Pro). Haftalık limit dolarsa kullanıcı 5 gün bekler; kalan işler (aşağıdaki "düzeltilmeyenler") ya riskli ya da kazancı küçük olduğu için burada durdum.
- Rapor: `docs/gece-raporu.md`. `docs/sonraki-adimlar.md` güncellendi. Dal main'e katılmadı.

## Geliştirme 8 (kullanıcı "devam et, limiti önemseme" dedi): metindeki hatalar hata avı değil

- **Sorun:** "fix the errors in the README", "korrigiere die Fehler in der Anleitung", "исправь ошибки в README" "belirsiz anlatılmış hata" (T3, hata avı) sayılıyordu: 'error/Fehler/ошибк' hata ayıklama sözü. 'dengeli' profilde bu Opus · high demek; işin kendisi bir metni okuyup düzeltmek. Türkçe "README'deki hataları düzelt" ise hiçbir işaret görmüyordu (T1, emin değil).
- **Değişiklik:** bir metin sözü (README, docs, doküman, belge, metin, çeviri; yedi dilde karşılıkları) + düzeltme fiili + hata sözü varsa ve çalışan bir program yoksa (çalışmıyor, crash, build, test, sayfa, ekran, konsol, sunucu, api, link), dosya adı ve hata çıktısı yoksa: "metindeki hataları düzeltmek", T2, emin değil, alt sınır T1 (dikkatli okuma sözü de varsa T2). Yazım hatası ("typo", "yazım", "faute de frappe", "опечатки") kendi önemsiz iş kuralında kalıyor.
- **İlk deneme bir sette kötüleşme verdi, düzeltildi:** ilk hâlde "hata" kelimesi hem hata sözü hem düzeltme fiili sayıldı; holdout'ta "hata mesajını daha anlaşılır bir cümleyle değiştir" (T1) T2'ye çıktı (holdout tam isabet %91 → %88), Fransızca "corrige les fautes de frappe" ve bir Almanca kör mesaj da kaydı. Düzeltme fiili ayrı tutuldu, yazım hatası ve dosya adı hariç bırakıldı; ikinci denemede 2.111 mesajda 0 değişiklik.
- **Test:** yeni test (beş dilde metin düzeltme; karşı örnekler: "the docs page shows an error" hata avı kalıyor, "fix the error in login.js" hata ayıklama, "README'deki yazım hatalarını düzelt" T0). 2.1.299 181/181, 2.1.295 181/181, `validate` uyarısız. Dış ölçüt aynı.

## Geliştirme 9: "dönüyor" (geri veriyor) "donuyor" (donma) değil

- **Sorun (kanıt):** kurallar Türkçe harfleri sadeleştirerek okuyor (ö→o, ü→u). Bu yüzden "500 hatası dönüyor" (sunucu hata döndürüyor) ile "uygulama donuyor" (donma, takılma) aynı kelime oluyordu. Net bir hata bildirimi, sebebi saklı bir donma sanılıp T3 hata avına gidiyordu. Holdout setinde bu yüzden yanlış olan bir mesaj vardı (etiket T2, tahmin T3; daha önce "bilinen hata" diye listeleniyordu).
- **Değişiklik:** sadeleştirmeden önce Türkçe harfle yazılmış "dönüyor / dönüyo / döndürüyor", anlamı olan "veriyor" sözüne çevriliyor. Türkçe harfsiz yazılmış "donuyor" eskisi gibi donma sayılıyor (kullanıcı harfsiz yazınca iki anlam ayırt edilemiyor; yüksek tahmin daha güvenli yön).
- **Test:** yeni test (holdout mesajı T2 "hata ayıklama", hata avı değil; "uygulama bazen donuyor…" ve "ekran donuyor" hâlâ hata avı). 2.1.299 182/182, 2.1.295 182/182, `validate` uyarısız.
- **Önce/sonra:** 2.111 mesajda yalnızca bu mesaj değişti (Türkçe asıl sette ve 8 dillik setin Türkçesinde), ikisi de doğru yöne: holdout tam isabet %91 → %93, LANG tr %92 → %93, hata avı sayısı 10 → 9. Dış ölçüt aynı. **Dürüstlük:** holdout bu mesaj yüzünden "tüketilmiş" sayılmalı; bu artış kuralın genel başarısının kanıtı değil, yalnızca o tek hatanın düzeldiği.

## Geliştirme 10: "neden çok …", "neden bu döngü" hata avı değil

- **Sorun:** "bir hatanın sebebini bulmak" kuralı (T3, kesin, hata avı) "neden" + bir arıza sözü arıyor. Arıza sözleri kelime başı olarak çok genişti: "cok" (çöktü için) Türkçedeki en sık kelimelerden "çok"u da tutuyordu; "don" (dondu için) "döngü", "donanım" ve İngilizce "don't"u; "cift" (çift sipariş için) "çift tırnak"ı. Sonuç: "bu klasörde neden çok dosya var?", "neden bu döngüyü kullandın?", "neden çift tırnak kullandın?" kesin T3 hata avıydı (Haiku'ya sorulmadan Sonnet · high, 'dengeli'de Opus · high).
- **Değişiklik:** bu üç söz yalnızca arıza bildiren biçimleriyle sayılıyor: "çöktü/çöküyor/çökme", "dondu/donuyor/donma", "çift sipariş/kayıt/ödeme/işlem/mail". Bu sorular artık "tek zor işareti" (T2, emin değil): Haiku'ya soruluyor, en az T1.
- **Test:** yeni test (üç soru hata avı değil; "uygulama neden çöktü?", "neden ekran dondu", "çift tıklayınca neden çift sipariş" hâlâ hata avı). 2.1.299 183/183, 2.1.295 183/183, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli mesajda 0 değişiklik. Dış ölçütte 1 görev (etiket T1) T3'ten T2'ye indi, doğru yöne (büyük olasılıkla İngilizce "don't" yüzünden yanlış tutuluyordu). 98 gerçek mesajda ek değişiklik yok.

## Geliştirme 11: yalnızca benzeyen sözler (süre, "olup olmadığını", "yanlışlıkla", "planladığım")

- **Yöntem:** kayıtlardaki 1.398 gerçek mesajının 10.852 farklı kelimesi tek tek kurallardan geçirildi; hangi kelimelerin tek başına "zor iş", "hata", "şikâyet", "plan" vb. saydığı listelendi ve gerçek mesajdaki yerine bakıldı (ücretsiz).
- **Bulunan ve düzeltilen dört tür:**
  1. **Süre = tekrarlayan başarısızlık (T4, kesin, en pahalı):** "merhaba yaklaşık 3 gündür görüşmüyoruz", "2 aydır tek başıma geliştirdiğim bu projeyi…", "son 5 gündür … açıktı" ve ölçüm setindeki "keep the session open for 30 days" T4 sayılıyordu. Artık süre sözü ("3 gündür", "for days", "seit drei Tagen", "уже неделю") yalnızca aynı cümlede bir arıza ya da uğraşma sözü varsa (hata, çözemiyoruz, olmuyor, uğraşıyoruz, deniyoruz, fail, stuck; yedi dilde karşılıkları) tekrarlayan başarısızlık sayılıyor.
  2. **"olup olmadığını" = şikâyet:** "olmadı" ipucu "olmadığını"yı da tutuyordu; "uyumlu olup olmadığını kontrol eden bir sistem" şikâyet sayılıp kademe artırılıyordu. Artık yalnızca "olmadı".
  3. **"yanlışlıkla" = şikâyet:** "yanlışlıkla esc'ye bastım devam et" şikâyet sayılıp bir kademe artırılıyordu. "yanlışlıkla" çıkarıldı.
  4. **"planladığım/planlamıştık" = plan isteği (T3):** "satın almayı planladığımız akıllı prizlerin modellerini söyle", "sanırsam planlamıştık hepsini?" plan isteği sayılıyordu. Geçmiş zaman ve sıfat biçimleri çıkarıldı; "bunu planla" hâlâ plan isteği.
- **İlk deneme iki sette kötüleşme verdi, düzeltildi:** Rusça "мы бьёмся над этим неделю…" ve Fransızca "ça fait une semaine qu'on lutte contre la même panne…" (held2, etiket T4) uğraşma sözü tanınmadığı için T3 ve T1'e düştü (held2 fr'de ciddi hata 0 → 1). Yedi dilde uğraşma/arıza sözleri eklendi (luchar, kämpfen, lutter, panne, бьёмся, ломается, 折腾, 苦戦 …); ikinci denemede ikisi de T4'e döndü. **Dürüstlük:** held2'ye bakarak düzelttiğim için o set bu konuda artık tüketildi.
- **Test:** yeni test (gerçek beş mesaj ve dört karşı örnek). 2.1.299 184/184, 2.1.295 184/184, `validate` uyarısız.
- **Önce/sonra:** 2.111 etiketli mesajda 1 değişiklik, doğru yöne ("keep the session open for 30 days", etiket T2: T4 → T2; LANG en tam isabet %92 → %93). Dış ölçüt aynı.

## Denendi, geri alındı: fiilsiz özellik sözü "emin değil"

- **Fikir:** "giriş yaptım", "nasıl giriş yapıcam?", "portal neresi? re-validate tuşu nerde?" içlerinde bir özellik sözü ("giriş", "validate") olduğu için kesin T2 sayılıyor; iş fiili olmayanları "emin değil" yapıp Haiku'ya sormak.
- **Sonuç:** 2.111 mesajda kademe değişmedi, 20 mesajda yalnızca güven düştü (aralarında "show a progress bar while uploading" gibi gerçek işler de var, çünkü İngilizce "show" iş fiili sayılmıyor).
- **Neden geri alındı:** Haiku'nun düşürebileceği en alt nokta T1 (iş sayılan mesajda bir kademe aşağısı), ve 'tasarruf' ile 'dengeli' profillerde T1 ve T2 aynı model ve efor (Sonnet · medium). Yani değişiklik yönlendirmeyi değiştirmiyor, yalnızca fazladan Haiku sorusu ekliyordu. Alt sınırı 0'a indirmek ise fiilsiz yazılmış gerçek özellik isteklerini Haiku modeline düşürebilir. Değer katmadığı için commit edilmedi.

## Ölçüm: kuralları görmemiş bir modelin yeni seti (blind3 ve tricky)

- **Bu ölçüm neyi cevaplayacak:** bu gecenin değişiklikleri, başkasının yazdığı yeni mesajlarda bir şey değiştiriyor mu, ve kurallar bugün nerede kaçırıyor?
- **Yöntem:** Sonnet 5.5'e (`claude -p`, araçsız) yalnızca beş kademenin tanımı verildi, kurallar ve kelime listeleri değil. İki istem: (1) "bir geliştiricinin bir yapay zekâ kod ajanına gerçekten yazacağı 24 mesaj, o dilde, sohbet üslubuyla; kademelere yayılmış (yaklaşık 4 T0, 5 T1, 6 T2, 6 T3, 3 T4); karanlık mod, giriş sayfası, ödemede yarış durumu, JS'ten TS'e gibi hazır örnekleri kullanma", sekiz dilde; (2) "kelimelerden yanlış yargılanması kolay 24 mesaj: dikkatle tekrar okuyup düzeltme istekleri, commit'ten sonra kısa onaylar, arıza olmayan süre sözleri, iş de isteyen sorular, metin düzeltme, sorunsuz koda 'neden' soruları, hiçbir şey istemeyen durum sözleri; aralarında birkaç gerçek zor iş ve tekrarlayan başarısızlık", İngilizce ve Türkçe. Toplam 239 mesaj, liste fiyatıyla $0,37. Etiketler o modelin; kimse kontrol etmedi.
- **İlk okuma (dürüst, bu gecenin ilk 10 geliştirmesinden sonra):** başlangıç (main) kuralları ile bu dalın kuralları neredeyse aynı: tam isabet 153 → 153, ±1 211 → 212, **ciddi hata 12 → 12**, fazla tahmin 56 → 56. Yani o ana kadarki düzeltmeler gerçek kullanımdan gelen dar türlerdi; başkasının yazdığı genel mesajlarda neredeyse hiç fark yaratmadı. İki küçük kötüleşme vardı (tek kelimelik yazım düzeltmesinin T2'ye çıkması), düzeltildi.
- **Okunan kaçırmalar (12 ciddi hata ve 14 iki kademe fazla):** değer değişikliği "geçiş" sanılıyor ("rengini maviden yeşile çevir", "timeout 30'dan 60'a", "从 30 改成 60"); veritabanı "migration" dosyası yazmak "geçiş" sanılıyor; "N kadar dosya" diye sayılmış geniş iş tanınmıyor ("40 kadar dosya var", "около 60 файлов"); "yeni … yapısına geçir" tanınmıyor; "last two attempts", "after three attempts", "back and forth", "for an hour", İspanyolca "intentaste dos veces" tekrarlayan başarısızlık sayılmıyor; "idk whats going on" kesin soru (T0) sayılıyor; dokümanı koda göre kontrol edip düzeltme (Japonca) soru sayılıyor; "commit mesajı yaz: …" içindeki açıklama yüzünden özellik sayılıyor; "nasıl çalışıyor" içindeki "çalışıyor" uğraşma sanılıp "2 aydır" ile T4 oluyor; "her seferinde" (her defasında) tek başına tekrarlayan başarısızlık; "adım adım" sıra sözü sayılmıyor; Japonca "方針案" plan isteği, Almanca "wechseln von … auf" geçiş sayılmıyor.
- Bu türlerin hepsi düzeltildi (Geliştirme 12). Bu yüzden **blind3 ve tricky artık tüketildi**; dürüst ölçüm için aynı yolla yeni bir set üretildi (aşağıda, blind4).

## Geliştirme 12: yeni setin kaçırdığı türler

- **Değişiklikler:** (1) değer değişikliği (küçük şey sözü: renk, timeout, port; ya da "30'dan 60'a", "from 5s to 15s", "从 30 改成 60") ve veritabanı migration dosyası artık "bir yapıdan diğerine geçiş" değil; ürün sürümü ("Python 2'den 3'e") hâlâ geçiş. (2) Türkçe "yeni … yapısına/mimarisine geçir/taşı" geçiş. (3) Sayılmış dosya ("40 kadar dosya", "about 60 files", "около 60 файлов") + bir değiştirme fiili: "çok dosyaya yayılan iş", T3, emin değil, alt sınır T2. (4) Tekrarlayan başarısızlık: "last/after N attempts", "N attempts at/to", "back and forth", "for an hour"; İspanyolca "intentaste/probaste N veces". "her seferinde" artık yalnızca bir arıza sözüyle birlikte. Uğraşma sözlerinden "çalışıyor" çıkarıldı ("çalışıyorsun" kaldı). (5) "what's going on / wrong / happening" soru sayılmıyor; "not found", "bulunamadı" hata ayıklama sözü. (6) Bir metin (README, docs, .md dosyası) okunup düzeltilecekse inceleme (T2, alt sınır 2). (7) "commit mesajı yaz: …" içinde ne yazarsa yazsın önemsiz iş. (8) "adım adım", "step by step" sıra sözü; Japonca "方針案" plan isteği; Almanca "wechseln von … auf" geçiş.
- **Test:** yeni test (16 denetim; gerçek ve yeni setten örnekler, karşı örnekler: "Python 2'den 3'e geçir" geçiş, "bu klasörde 12 dosya var, hangisi ne işe yarıyor?" alt sınırsız, "her seferinde aynı hata çıkıyor" T4). blind3 ve tricky setleri `eval/i18n/` altına eklendi, test çıktısında BLIND3 ve TRICKY satırları var. 2.1.299 195/195, 2.1.295 195/195, `validate` uyarısız.
- **Önce/sonra:**
  - Eski 2.111 etiketli mesaj: 7 değişiklik, 6'sı doğru yöne, 1'i aynı (alt sınır eklendi), kötüleşen yok. Örnekler: Çince "把 MAX_RETRIES 从 3 改成 5" T3 → T1 (etiket T1), "Add an index … in a new alembic migration" T3 → T1 (etiket T1), "commit mesajı yaz: … maviden yeşile çevirdim" T3 → T0 (etiket T0). Kör setlerin özet satırları bu yüzden yükseldi (BLIND en %75 → %79, tr %83 → %88; BLIND2 en %71 → %75, fr %58 → %63; LANG zh %83 → %85). BLIND2 "hiç ayar yapılmamış" set; bu gece ona bakarak değil, blind3'e bakarak düzelttim; yani BLIND2'deki artış dürüst bir işaret (küçük: 3 mesaj).
  - Dış ölçüt, saklı yarı (350 görev, hiç bakılmayan): tam isabet %32 → %33, ±1 %74 → %75, fazla tahmin 210 → 204, eksik 29 → 30, ciddi 6 → 6. SWE-bench'in tamamı: tam %35 → %37, fazla 306 → 295.
  - blind3 + tricky (tüketildi, yalnız bilgi için): tam 153 → 168, ±1 211 → 229, ciddi 12 → 2, fazla 56 → 50.
