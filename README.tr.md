# gearbox
n[English](README.md) · **Türkçe**

Claude Code için otomatik vites: her mesajda modeli (Haiku, Sonnet, Opus) ve eforu işin zorluğuna göre seçer, sağ alttaki seçicinin üstüne asla çıkmaz. Amaç limitin daha uzun sürmesi ve zor işlerin yine güçlü modelle yapılması.

> Durum: 0.3.0. Claude Code'un **early access** eklenti (function hooks) API'si üzerine kurulu; o API sürümler arasında değişebilir. Aşağıdaki güvenlik ağları bu yüzden var.

## Kurulum

Bu bilgisayarda, bir terminalde:

```bash
claude plugin marketplace add C:\gearbox
```

```bash
claude plugin install gearbox@gearbox
```

Kurulumdan sonra açılan her Claude Code oturumunda (masaüstü uygulaması dahil) çalışır. GitHub'a yüklendikten sonra başkaları için tek satır:

```
/plugin install gearbox --marketplace <kullanıcı>/<repo>
```

## Nasıl çalışır

1. **Sınıflandırma** (`hooks/core/signals.ts`): Mesaj T0–T4 kademelerinden birine konur. Türkçe ve İngilizce sinyaller okunur; mesajdaki kod, dosya ve değişken adları dikkate alınmaz. Fiil tek başına değil nesnesiyle değerlendirilir ("rengi değiştir" ≠ "ödeme sistemi ekle"). Kurallar emin olamazsa Haiku'ya tek kısa bir soru sorulur.
2. **Politika** (`hooks/core/policy.ts`): Kademe, profil tablosundan model ve efora çevrilir, sonra şu sınırlardan geçer:
   - **Tavan:** Seçicideki model ve efor aşılmaz.
   - **Önbellek:** Bağlam büyükse (40K+ token) bir kademelik farklar için model değiştirilmez, yalnızca efor değişir; model geçişi bütün konuşmayı önbelleksiz yeniden gönderir.
   - **Tempo:** 5 saatlik ya da haftalık limit sürdürülebilir hızın üstünde harcanıyorsa efor bir kademe iner; %90'ı geçince Opus kullanılmaz.
3. **Uygulama** (`hooks/register.ts`): Her model isteğinden hemen önce kararı uygular. Bir turun bütün istekleri aynı modelle gider. Alt ajanlara dokunulmaz.

| Kademe | Örnek | tasarruf (Pro) |
|---|---|---|
| T0 önemsiz | "bu fonksiyon ne yapıyor", commit mesajı, yeniden adlandırma | Haiku · low |
| T1 rutin | net, tek yerlik değişiklik | Sonnet · medium |
| T2 standart | özellik, test yazma, hata çıktılı debug | Sonnet · high |
| T3 zor | belirsiz hata, mimari, performans, güvenlik | Opus · medium |
| T4 kritik | çok adımlı büyük iş, tekrarlayan başarısızlık | Opus · high |

`dengeli` ve `kalite` profilleri Max planları için daha cömert.

## Seçici = tavan

Sağ alttaki seçici, gearbox'ın harcayabileceği en üst sınırdır. Tam otomatik için seçiciyi bir kez **Opus · high** yap; gearbox bunun altında seçer. Seçiciyi değiştirdiğinde yeni tavanı bildirir. O an gerçekten çalışan model durum çubuğunda ve her cevabın altında görünür.

## Kontrol

| Komut | İş |
|---|---|
| `/gear` | durum, son karar ve gerekçesi, limitler, istatistik |
| `/gear oto` / `/gear sabitle` | yönlendiriciyi aç / kapat (sabit: seçici ne diyorsa o) |
| `/gear profil tasarruf\|dengeli\|kalite` | kademe tablosu |
| `/gear haiku aç\|kapa` | önemsiz işler Haiku'ya gitsin mi |
| `/gear sor aç\|kapa` | kurallar emin olamazsa Haiku'ya sorulsun mu |
| `/gear not aç\|kapa` | cevabın altındaki satır |

Mesajın başına yazılan etiketler o mesaj için seçimi belirler ve modele gitmeden silinir: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). `ultrathink` T4 demektir.

## Güvenlik ağları

- **Kendini denetleme:** Her turdan sonra API'nin bildirdiği gerçek modele bakar. Seçtiği model üst üste 3 tur uygulanmazsa (bir Claude Code güncellemesi eklenti API'sini değiştirmişse) kendini kapatır ve haber verir; `/gear oto` yeniden dener.
- **Yedek model:** Seçilen model yanıt vermezse (kimliği eskimiş, planında yok) istek seçicideki modelle yeniden gönderilir, o model o oturumda bir daha seçilmez.
- **Kartopu freni:** Ucuz bir modelle yapılan tur, testleri ya da derlemesi kırık bitmişse bir sonraki tur bir kademe güçlü modelle yapılır. "Olmadı", "hâlâ aynı hata" gibi şikâyetler de kademeyi yükseltir; üst üste ikinci şikâyette iki kademe.
- **Sürüm uyarısı:** Claude Code, gearbox'ın denendiği sürümden (`hooks/core/version.ts`) yeniyse bir kez haber verir.
- **Haftalık uyumluluk testi:** GitHub'da `.github/workflows/compat.yml` her hafta en yeni Claude Code ile doğrulama ve testleri çalıştırır.
- **Canlı duman testi:** `node scripts/smoke.mjs`, üç kısa mesajı gerçekten gönderip modelin değiştiğini API'nin cevabından doğrular (biraz kota harcar).

## Ölçümler

### Sınıflandırma (`eval/`)

143 etiketli mesaj üç kümede: kuralların ayarlandığı küme (66), ayardan önce ayrılan küme (43), ayarlardan sonra yazılıp bir kez ölçülen yeni küme (34). Etiketler "bu işi hangi güçte model yapmalı" sorusuna göre kondu. Son iki kümenin toplamı (77 mesaj):

| Yöntem | Tam isabet | ±1 kademe | Ciddi hata* | Haiku'ya sorulan |
|---|---|---|---|---|
| Sadece kurallar | %83 | %94 | 4 | %0 |
| Sadece Haiku | %77 | %97 | 0 | %100 |
| **Kurallar + emin değilse Haiku (gearbox)** | **%90** | **%100** | **0** | **%19** |
| Her zaman Haiku, yüksek olan | %74 | %96 | 0 | %100 |

\* Zor bir işi (T3+) T0/T1'e ya da iki kademe aşağı koymak. Not: ayardan önce ayrılan kümenin hataları bir kez görüldü ve yeni kümedeki hatalar "emin değilse sor" eşiğini etkiledi; gerçek isabet bir miktar düşük olabilir.

### Çıktı kalitesi (`eval/tasks/`)

Küçük bir proje üzerinde 6 gerçek görev; her görevin sonucu Claude'un çalışırken görmediği testlerle kontrol edilir.

| Görev | gearbox'ın seçtiği | Sonuç | Maliyet | Opus · high, gearbox'sız |
|---|---|---|---|---|
| 1 Yeniden adlandırma | Haiku | Geçti | $0.011 | Geçti, $0.277 |
| 2 Kargo eşiği | Sonnet | Geçti | $0.173 | — |
| 3 Kupon özelliği ve testleri | Sonnet | Geçti | $0.124 | Geçti, $1.387 |
| 4 Hata mesajıyla verilen sayfalama hatası | Sonnet | Geçti | $0.072 | Geçti, $0.255 |
| 5 İnce kuruş yuvarlama hatası | Opus | Geçti | $0.423 | — |
| 6 İndirimin kargoya da uygulanması | Sonnet | Geçti | $0.099 | Geçti, $0.460 |

İki yolla da denenen 4 görevde gearbox $0.31, hep Opus · high $2.38 harcadı: aynı başarıyla yaklaşık 8 kat ucuz, 8 kat hızlı (73 sn'ye karşı 619 sn). Maliyetler API liste fiyatıyla; abonelik kotası da kabaca bu oranda tükenir. Her görev bir kez, küçük bir projede çalıştırıldı: sonuç kesin değil, yön gösterici.

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

`eval/haiku.mjs` ve `eval/tasks.mjs` gerçek model çağrısı yapar, biraz kota harcar. Haiku cevapları `eval/.work` altında önbelleğe alınır.

## Bir Claude Code güncellemesinden sonra

1. `claude plugin test .` ve `node scripts/smoke.mjs` çalıştır.
2. İkisi de geçiyorsa `hooks/core/version.ts` içindeki `TESTED_THROUGH` değerini yeni sürüme çek.
3. Yeni modeller çıktıysa `hooks/core/models.ts` içindeki `MODEL_IDS` tablosunu güncelle.

## Yol haritası

- [x] Canlı doğrulama, kendini denetleme, yedek model, kartopu freni
- [x] Sınıflandırma ve çıktı kalitesi ölçümleri
- [ ] Alt ajan kuralları (keşif ajanları Haiku · low)
- [ ] Elle düzeltmelerden öğrenme, istatistik paneli
- [x] İngilizce README, lisans (MIT)
- [ ] GitHub'da yayın
