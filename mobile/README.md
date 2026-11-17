# Multimedia — mobile app

The shop's app for Android and iPhone, built with Expo (React Native). It uses
the same server, database, prices, orders and payments as the website.

## What it has

| Screen | What it does |
| --- | --- |
| Home | Search, sections, deals, popular products |
| Catalogue | Search, sections, "on sale" and "in stock" filters, sorting |
| Product | Pictures, price, warranty, specifications, similar products |
| Cart, Favourites | Kept on the phone |
| Checkout | Name and phone (filled in when signed in), delivery zone or pickup, Click, Payme or cash |
| Order | Status steps, pay button, pull down to refresh |
| Account | Sign-in by SMS code, orders, language (Uzbek or Russian), light, dark or phone theme, information pages, contacts |

The look follows the website: frosted glass panels, the same colours, a light
and a dark theme.

## Running it

```bash
cd mobile
npm install
EXPO_PUBLIC_API_URL=http://<computer's address on the Wi-Fi>:3000 npx expo start
```

Scan the QR code with Expo Go on the phone. The website must be running
(`npm run dev` in the main folder). On the phone, `localhost` is the phone
itself, so give the computer's address on the local network.

The release build talks to the address in `app.json` → `expo.extra.apiUrl`
(now `https://multimedia.uz`; change it to the shop's real domain).

## Building for the stores

Builds are made in the cloud with EAS, no Xcode or Android Studio needed:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android   # .aab for Google Play
npx eas-cli@latest build --platform ios       # needs an Apple Developer account
```

Needed from the shop: an Expo account, a Google Play developer account
($25 once), an Apple Developer account ($99 a year), the app icon and the
store screenshots and texts. The app ids are `uz.multimedia.shop` in
`app.json`.

## How it talks to the server

| Request | Server route |
| --- | --- |
| Catalogue, product, zones and pages | `GET /api/mobile/catalog`, `/products/[slug]`, `/config` |
| Sign-in code | `POST /api/auth/code` (the website's) |
| Sign-in | `POST /api/mobile/auth/verify`, returns a token kept in the phone's keychain |
| Placing an order | `POST /api/orders` (the website's) |
| Account and order | `GET /api/mobile/me`, `/orders/[id]` |
| Product pictures | `/art/<kind>.svg` |

Requests of a signed-in customer carry `Authorization: Bearer <token>`.

## Checks

```bash
npx tsc --noEmit
```
