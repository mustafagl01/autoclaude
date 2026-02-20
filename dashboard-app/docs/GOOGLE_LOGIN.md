# Google ile giriş

## Çalışması için yapılacaklar

1. **Google Cloud Console**
   - [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
   - “Create Credentials” → “OAuth client ID”
   - Application type: **Web application**
   - **Authorized redirect URIs** kısmına tam olarak ekle:
     - Yerel: `http://localhost:3000/api/auth/callback/google`
     - Canlı (Vercel): `https://SENIN-DOMAIN.vercel.app/api/auth/callback/google`

2. **Vercel Environment Variables**
   - `GOOGLE_CLIENT_ID` = Google’dan aldığın Client ID
   - `GOOGLE_CLIENT_SECRET` = Google’dan aldığın Client Secret
   - `NEXTAUTH_URL` = Canlı site adresin (örn. `https://xxx.vercel.app`)
   - Deploy’dan sonra bu değişkenleri eklediysen **Redeploy** yap.

3. **Kod tarafı**
   - `trustHost: true` auth config’e eklendi (Vercel’de “Host must be trusted” hatasını önlemek için).

## Hâlâ çalışmıyorsa

- Vercel loglarında `[next-auth]` ile başlayan hata mesajına bak.
- Redirect URI’nin Google Console’daki ile **birebir aynı** olduğundan emin ol (http/https, sonunda slash yok).
- Tarayıcıda “Sign in with Google” tıklayınca gittiği URL’yi kontrol et; orada Google’dan dönen hata varsa (örn. redirect_uri_mismatch) yukarıdaki URI’yi düzelt.

## Google girişini tamamen kaldırmak istersen

- Login sayfasındaki “Sign in with Google” butonunu kaldır.
- `app/api/auth/[...nextauth]/route.ts` içinde `GoogleProvider` ve ilgili env kontrolünü kaldır.
- (İsteğe bağlı) Veritabanından `google_id` sütununu bırakabilirsin; kullanılmaz ama zarar vermez.
