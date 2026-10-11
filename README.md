# gearbox

Claude Code için otomatik vites: her mesajda modeli ve eforu işin zorluğuna göre seçer, sağ alttaki seçicinin üstüne asla çıkmaz.

> Durum: 0.1.0, ilk sürüm. Claude Code'un **early access** eklenti (function hooks) API'si üzerine kurulu; API sürümler arasında değişebilir.

## Nasıl çalışır

1. **Sınıflandırma** (`hooks/core/signals.ts`): Mesaj, Türkçe ve İngilizce sinyallerle T0–T4 kademelerinden birine konur: uzunluk, anahtar kelimeler, hata çıktısı, dosya sayısı, kısa onaylar ("evet, devam"), şikâyetler ("hâlâ olmadı"). Kurallar emin olamazsa Haiku'ya tek kısa bir soru sorulur.
2. **Politika** (`hooks/core/policy.ts`): Kademe, profil tablosundan model ve efora çevrilir, sonra üç sınırdan geçer:
   - **Tavan:** Seçicideki model ve efor aşılmaz.
   - **Önbellek:** Bağlam büyükse (40K+ token) bir kademelik farklar için model değiştirilmez, sadece efor değişir. Model geçişi bütün konuşmayı önbelleksiz yeniden gönderir.
   - **Tempo:** 5 saatlik ya da haftalık limit sürdürülebilir hızın üstünde harcanıyorsa efor bir kademe iner; %90'ı geçince Opus kullanılmaz.
3. **Uygulama** (`hooks/register.ts`): `turn.step` kancası her model isteğinden önce kararı uygular. Bir turun bütün istekleri aynı modelle gider. Alt ajanlara dokunulmaz.

| Kademe | Örnek | tasarruf (Pro) |
|---|---|---|
| T0 önemsiz | "bu fonksiyon ne yapıyor", commit mesajı | Haiku · low |
| T1 rutin | net, tek yerlik değişiklik | Sonnet · medium |
| T2 standart | özellik, test, hata çıktılı debug | Sonnet · high |
| T3 zor | belirsiz hata, mimari, refactor | Opus · medium |
| T4 kritik | çok adımlı büyük iş, tekrarlayan başarısızlık | Opus · high |

`dengeli` ve `kalite` profilleri Max planları için daha cömert.

## Seçici = tavan

Sağ alttaki seçici, gearbox'ın harcayabileceği en üst sınırdır. Tam otomatik için seçiciyi bir kez **Opus · high** yap; gearbox bunun altında seçer. Seçiciyi değiştirdiğinde yeni tavanı bildirir. O an gerçekte çalışan model durum çubuğunda ve her cevabın altında görünür.

## Kontrol

| Komut | İş |
|---|---|
| `/gear` | durum, son karar ve gerekçesi, istatistik |
| `/gear oto` / `/gear sabitle` | yönlendiriciyi aç / kapat (sabit: seçici ne diyorsa o) |
| `/gear profil tasarruf\|dengeli\|kalite` | kademe tablosu |
| `/gear haiku aç\|kapa` | önemsiz işler Haiku'ya gitsin mi |
| `/gear sor aç\|kapa` | kurallar emin olamazsa Haiku'ya sorulsun mu |
| `/gear not aç\|kapa` | cevabın altındaki satır |

Mesajın başına yazılan etiketler o mesaj için seçimi ezer ve modele gitmeden silinir: `+haiku` `+sonnet` `+opus`, `+low` … `+max`, `+ucuz` (T0), `+derin` (T4). `ultrathink` yazmak T4 demektir.

## Geliştirme

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

Oturumda denemek için: `claude --plugin-dir <bu klasör>`, ya da masaüstü uygulaması için `~/.claude/settings.json` içindeki `env` bloğunda `CLAUDE_CODE_PLUGIN_DIRS`.

## Yol haritası

- [ ] Faz 0: canlı doğrulama (model ve efor gerçekten değişiyor mu, model ve efor geçişlerinin önbelleğe etkisi)
- [ ] Alt ajan kuralları (keşif ajanları Haiku · low)
- [ ] Geçmiş mesajlardan etiketli test seti, sınıflandırıcı isabet ölçümü
- [ ] Elle düzeltmelerden öğrenme, istatistik paneli
- [ ] İngilizce README, marketplace ile yayın
