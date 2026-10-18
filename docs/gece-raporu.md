# Gece raporu (18–19 Ekim 2026)

Sen bilgisayardan uzaktayken autogear üzerinde yapılan işin özeti. Her adımın ayrıntısı ve ölçümleri `docs/gece-gunlugu.md` dosyasında.

## Kısaca

- **7 geliştirme yapıldı**, hepsi `gelistirme` dalında (dal: projenin ana sürümüne karışmadan değişikliklerin denendiği paralel kopya). Dal GitHub'a gönderildi; **ana sürüme (`main`) hiçbir şey gönderilmedi**, `C:\gearbox` klasörüne dokunulmadı. Senin kurulu autogear'ın değişmedi.
- Her geliştirmeden sonra bütün testler iki Claude Code sürümünde (2.1.299 ve 2.1.295) geçti: başta 173 test vardı, sonda 180. `claude plugin validate` (eklentinin kurallara uyup uymadığını kontrol eden komut) her seferinde uyarısız geçti.
- **2 iş ölçüldü ve yapılmamasına karar verildi** (aşağıda, nedenleriyle).
- Harcama: model çağrısı olarak yalnızca bir küçük Haiku ölçümü, liste fiyatıyla **$0,014**. Geri kalan bütün ölçümler ücretsizdi (kurallar bilgisayarda çalışıyor, modele bir şey gitmiyor). Bu oturumun kendisi kotandan harcadı: rapor yazılırken 5 saatlik limit %34, haftalık limit %65 doluydu (oturumun başında ne kadar dolu olduğunu bilmiyorum). Haftalık limitin dolup seni günlerce bekletmemesi için, değeri düşük işlere girmeden durdum.

## Ne yapıldı

Sınıflandırıcı: autogear'ın mesajına bakıp işin zorluğuna not veren kısmı. Not ("kademe") T0 önemsiz, T1 rutin, T2 standart, T3 zor, T4 kritik. Önce elle yazılmış kurallara bakar; emin değilse Haiku'ya sorar. **Alt sınır**: Haiku daha düşük bir not verse bile inilmeyecek en düşük not.

16–18 Ekim'deki 98 gerçek mesajını (ölçüm betiklerinin kendi soruları hariç) bugünkü kurallarla yeniden okudum. Bulduğum hata türlerini düzelttim:

| # | Ne düzeldi | Gerçek örnek |
|---|---|---|
| 1 | "Baştan dikkatlice oku, düzelt", "gözden geçir", "review", "proofread" gibi istekler en az T2 (sekiz dilde) | "readmeyi bence en baştan tekrar oku daha detaylı…": kurallar işaret görmemişti, Haiku T0 demişti |
| 3 | İş isteyip sonunda "anlat" diyen mesaj artık kesin "soru" (T0) değil; Haiku'ya soruluyor | "sürümü artır, kurulu kopyayı güncelle, nasıl deneyeceğimi anlat": kesin T0'dı, Haiku'ya hiç sorulmuyordu |
| 4 | "Evet, pushla." önemsiz iş (T0); önceki zor işin notunu taşımıyor | iki kez T3 olarak gitmişti |
| 5 | "incelemede", "gözden geçirildi" bir istek sayılmıyor | "hâlâ incelemede olduğu için hiçbir şey pushlamıyoruz": Haiku T0 demişti, kural T2'de tutuyordu |
| 6 | Testler, commit ve push PowerShell'de çalıştırılsa da sayılıyor | Windows'ta Claude komutları PowerShell'le de çalıştırıyor; "başarısız test sonrası bir kademe yukarı" ve "temiz sohbet önerisi" orada hiç çalışmıyordu |
| 7 | Önemsiz bir mesajdan sonra "devam", "sonraki adımı uygula" en az T1 ve Haiku'ya soruluyor | "sonraki adımı uygula" önceki T0 mesajın notunu kesin olarak almıştı |

(2 numara aşağıda: ölçüldü, yapılmadı.)

**Önce/sonra ölçüm (her kural değişikliğinde):**

- 2.111 etiketli ölçüm mesajı (dev, holdout, fresh, gerçek kullanım tekrarı, sekiz dilde 143 mesaj, held, held2, blind, blind2): yedi geliştirmenin toplamında yalnızca **2 mesaj** değişti, ikisi de iyi yönde (kör setten İspanyolca ve Fransızca birer inceleme isteği alt sınır kazandı). Hiçbir sette kötüleşme yok.
- 741 uzun İngilizce görev (SWE-bench Verified ve Terminal-Bench; başkalarının zorluk verdiği dış ölçüt): yalnızca **1 görev** T1'den T2'ye çıktı. Ciddi hata (zor işi çok düşük kademeye koymak) değişmedi.
- Gerçek Haiku ile küçük deneme (10 mesaj, $0,014): düzeltilen dört gerçek mesajın dördü de T2'ye düştü. Haiku'nun T0 ya da T1 dediği üç inceleme isteğini alt sınır T2'de tuttu.
- **Dürüstlük notu:** bu setlerin çoğu daha önce kurallar ayarlanırken okundu ("tüketildi"). "Hiçbir şey bozulmadı" demek için iyi; kuralların gerçek başarısını göstermez. Yeni kuralları denediğim örnekleri ben yazdım; 98 gerçek mesajın etiketleri de benim yargım. Yeni kuralların gerçekte ne kadar işe yaradığını en iyi senin gölge kaydın gösterecek.

## Ölçülüp yapılmayanlar

- **Yardımcıları (alt ajanları) işin türüne göre modele dağıtmak (adım 7):** bütün sohbet kayıtların (30 Temmuz – 18 Ekim, 1.976 oturum) liste fiyatıyla toplandı: toplam $2.725, yardımcılar **$39,5, yani %1,4**. Hepsi Haiku'ya gitse bile kazanç yaklaşık %1,3; buna karşılık zayıf modelin eksik getirdiği bilgi pahalı ana işi bozabilir. **Yapılmadı.** README'nin yol haritası satırı bu ölçümle güncellendi.
- **Danışmanı (advisor) istek başına açmak (adım 8):** Mod API'si (eklentinin Claude Code'la konuştuğu arayüz) buna izin vermiyor; bir isteğin yalnızca modeli ve eforu değiştirilebiliyor. Tek yol `/advisor` komutunu kendiliğinden çalıştırmak; bu senin ayarını kalıcı değiştirir ve dizin incelemesinin zaten işaretlediği türden. **Kod yazılmadı**, bulgu notlara yazıldı.

## Yapılmayanlar ve nedeni

- **Temiz sohbet önerisinin sadeleştirilmesi:** görünüşe dair bir iş; ekranda nasıl durduğunu senin görmen gerekiyor ve sen "frontendini sonra geliştiririz" demiştin. Kanıtsız değiştirmedim.
- **Model kimliklerini kendiliğinden güncellemek (adım 15):** isteğin modelini kısa adla ("sonnet") vermenin çalıştığına dair belge yok; çekirdek yönlendirmeyi kanıtsız değiştirmek riskli.
- **Sürüm numarası artırılmadı.** Değişiklikler `CHANGELOG.md`'de "Unreleased (branch gelistirme)" başlığında. Sürüm, dal ana sürüme katılırken verilir.

## Bulunan ama düzeltilmeyen sorunlar

1. "fix the errors in the README", "korrigiere die Fehler" gibi metin düzeltme istekleri "belirsiz anlatılmış hata" (T3, hata avı) sayılıyor. Gereğinden pahalı ama zayıf modele gitme riski yok; düzeltmek hata avı kuralının sırasını değiştirmek demek, riskli.
2. "Sadece not al" diye biten uzun not listeleri T4 çıkıyor (iş T2). Gereğinden pahalı; bir "üst sınır" kuralı yanlışlıkla gerçek işi düşürebilir.
3. "yarın başlarız o işlere", "bunu kullanıcaz" gibi sözlere Haiku önceki işin notuna bakıp T3 diyor. Gereğinden pahalı; Haiku'ya sorulan soru metnine dokunmak eski Haiku ölçümlerini geçersiz kılar.
4. İçinde "test" ya da "build" geçen her komut (ör. `cat tests/…`) "kontrol" sayılıyor. Kayıtlarda 8 kez hata verdi ama hiçbiri turun son kontrolü olmadığı için sonucu etkilemedi.
5. Bir eğik çizgi komutu (ör. bir skill komutu) yazıldığında autogear onun yazılan satırını sınıflıyor, komutun asıl içeriğini değil. Kayıtlarında böyle bir örnek yok; dokunulmadı.

## Senin vermen gereken kararlar

1. **Dalı ana sürüme katmak:** dizin incelemesi bitince. 7 geliştirmenin hepsi katılmaya hazır (testler ve ölçümler geçti). Dikkat: PowerShell desteği (6) eklentinin bağlandığı olay listesine yeni bir satır ekliyor; ana sürüme girince dizin taraması bunu görür (README'de yazıyor).
2. **Sürüm numarası:** katarken 0.13.0 öneririm (yeni kurallar ve yeni kanca var).
3. **Kendi gözünle doğrulaman iyi olur:** dal kurulduktan sonra gölge modda birkaç gün çalışıp `/gear log` ile yeni kuralların gerçek mesajlarında doğru çalışıp çalışmadığına bakmak; özellikle "baştan oku, düzelt" türü bir istek ve "Evet, pushla."

## Başvuru durumu

Portala bakmadım (giriş gerektiriyor, tıklama yasaktı). Bildiğim son durum: 0.12.2, `main` @ e8ca8b4, incelemede. `main`'e bu gece hiçbir şey gönderilmedi.
