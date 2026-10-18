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
