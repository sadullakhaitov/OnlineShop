# Multimedia

Buxoro shahri va tumanlari uchun maishiy texnika internet-do'koni.
Интернет-магазин бытовой техники для Бухары и районов.

## Stack

- Next.js (App Router) + TypeScript, React 19
- Tailwind CSS v4; design tokens and the liquid glass system live in `src/app/globals.css`
- next-intl: `uz` (default) and `ru`, texts in `messages/`
- Light and dark themes (saved in the browser, follow the system by default)
- PostgreSQL through Drizzle ORM for orders, customers and payments
- Payme (Merchant API) and Click (SHOP API), sign-in by phone number and SMS code

The same web app is meant to run as the Telegram Mini App, and the future
mobile app will talk to the same server routes.

## Pages

| Address | What it is |
| --- | --- |
| `/uz`, `/ru` | Home page |
| `/uz/catalog` | Catalogue: categories, brand and price filters, sorting, search (`?q=`) |
| `/uz/product/[slug]` | Product page: price, specifications, similar products |
| `/uz/favorites` | Favourites, kept in the visitor's browser |
| `/uz/cart` | Cart, kept in the visitor's browser |
| `/uz/checkout` | Checkout: contact, delivery or pickup, payment method |
| `/uz/order/[id]` | Order status and payment; the address itself is the key to the order |
| `/uz/login` | Sign-in by phone number and a 6-digit code |
| `/uz/account` | The customer's orders |
| `/uz/pay/demo/[id]` | Test payment page, only in demo mode |

Server routes under `/api`:

| Address | What it does |
| --- | --- |
| `GET /api/search` | Live search suggestions |
| `GET /api/products?ids=&locale=` | Current prices and availability for the cart |
| `POST /api/orders` | Places an order and answers with the payment address |
| `POST /api/auth/code`, `/verify`, `/logout` | Sign-in code, sign-in, sign-out |
| `POST /api/payments/payme` | Payme calls this address |
| `POST /api/payments/click/prepare`, `/complete` | Click calls these two addresses |
| `POST /api/payments/demo` | Confirms or declines a test payment, only in demo mode |

## Structure

```
messages/                 translations (uz.json, ru.json)
drizzle/                  SQL migrations, generated from src/db/schema.ts
scripts/migrate.mjs       applies the migrations to PostgreSQL
src/app/[locale]/         pages and layout
src/app/api/              server routes
src/components/           layout, home, catalog, product, search, favorites,
                          cart, checkout, order, account, ui
src/data/                 sample categories and products, delivery zones and prices
src/db/                   database tables and the connection
src/i18n/                 locale routing
src/lib/                  code shared with the browser: catalogue queries, cart,
                          favourites, phone numbers, formatting, theme, motion
src/server/               server-only code: orders, sign-in, sessions, SMS, settings
src/server/payments/      Payme and Click protocols, payment links, the simulator
```

## Settings

`.env.example` lists every setting with an explanation. Copy it to
`.env.local` on your computer, or enter the same names on the hosting. With no
settings at all the site still runs: see demo mode below.

## Database

- Tables are described in `src/db/schema.ts`: customers, sessions, sign-in
  codes, orders with their items, Payme and Click transactions.
- **On your computer** nothing has to be installed. Without `DATABASE_URL` the
  site keeps an embedded PostgreSQL (PGlite) in `.data/` and creates the tables
  itself. Delete the folder to start from an empty shop.
- **On hosting** set `DATABASE_URL` to a PostgreSQL database. `npm run build`
  applies the migrations before building. Serverless hosting (Vercel and the
  like) has no disk for the embedded database, so there `DATABASE_URL` is
  required: without it the catalogue works, but ordering and sign-in answer
  with an error.
- After changing `src/db/schema.ts` run `npm run db:generate` and commit the
  new file in `drizzle/`.

Products are still sample data in `src/data/products.ts`, with drawn
illustrations instead of photos. Pages and orders never read that file
directly: they go through `src/lib/catalog.ts`, so moving products into the
database only means rewriting that one file. An order keeps its own copy of
each product's name and price.

## Orders

- Customers can order without signing in. The order page lives at an address
  with a long random id, is hidden from search engines and does not pass its
  address on to other sites.
- Prices, availability, the delivery price and the total are always calculated
  on the server from the catalogue; the browser only sends product ids and
  quantities. If the total changed since the customer saw it, the order is
  refused and the customer is asked to check the updated prices.
- Order status: `new`, `confirmed`, `delivering`, `delivered`, `cancelled`.
  Payment status: `unpaid`, `paid`, `refunded`. A successful online payment
  confirms the order by itself.
- Delivery zones and prices are in `src/data/delivery.ts`: Bukhara city and
  the districts of the region. **The prices, the free-delivery threshold and
  the delivery days are placeholders** to be replaced with the shop's own.
- Until the admin panel exists (step 4), new orders are visible only in the
  database, and nothing moves an order past `confirmed`.

## Demo mode

Demo mode stands in for the outside services that are not connected yet:

- the sign-in code is shown on the sign-in page instead of being sent by SMS;
- Payme and Click are paid on a built-in test page. That page sends the same
  requests the real services send, through the same code, so the order goes
  through the real payment logic. No money moves.

It is on in `npm run dev` and off in a production build. Set `DEMO_MODE=true`
on hosting to try the whole shop before the real keys arrive. As soon as a
service gets its real keys, its demo switches off by itself.

With demo mode off and nothing connected, the shop still takes orders with
payment on receipt; Payme and Click are hidden, and sign-in is unavailable
until an SMS service is connected.

## Connecting Payme

1. In the Payme business cabinet create a cash desk for the site. Set the
   endpoint address to `https://<site>/api/payments/payme` and add one payment
   account field named `order_id`.
2. Enter `PAYME_MERCHANT_ID` and `PAYME_KEY`. For the sandbox use the test key
   and `PAYME_CHECKOUT_URL=https://test.paycom.uz`; for real payments use the
   main key and remove `PAYME_CHECKOUT_URL`.
3. Run the sandbox tests in the cabinet against the endpoint.

The account Payme sends back is the order number (for example `100001`), the
amount is in tiyin. One order can be paid by one transaction at a time, and a
transaction that is not paid within 12 hours is cancelled.

Not done yet: the fiscal receipt data (`detail` with IKPU codes of the goods),
which Payme may ask for before switching on real payments, and a check of the
address Payme calls from.

## Connecting Click

1. In the Click merchant cabinet create a service for the site with the
   addresses `https://<site>/api/payments/click/prepare` and
   `https://<site>/api/payments/click/complete`.
2. Enter `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID` and `CLICK_SECRET_KEY`.

`merchant_trans_id` is the order number. If an order was meanwhile paid
another way, the Complete request is answered with "cancelled", which makes
Click return the money.

## Connecting SMS

`src/server/sms.ts` sends sign-in codes through Eskiz.uz once `ESKIZ_EMAIL`
and `ESKIZ_PASSWORD` are set. Eskiz delivers only texts approved as templates
in its cabinet, so these two must be approved first (the number is the code):

```
Multimedia internet-do'koniga kirish kodi: 123456
Код для входа в интернет-магазин Multimedia: 123456
```

Another SMS service only needs a different `sendSms` in that one file.

Sign-in protection: a code lives 5 minutes and allows 5 attempts; one phone
gets at most one code a minute and five an hour; codes and session keys are
stored only as hashes; the session cookie cannot be read by scripts.

## What is tested, and what is not

- `npm test` runs the automatic tests on an in-memory database: the Payme and
  Click protocols (including repeated and simultaneous requests, refunds and
  wrong signatures), orders, sign-in and phone numbers.
- The whole path (cart, checkout, test payment, order page, sign-in, account)
  was walked through in a browser in demo mode, on desktop and phone sizes, in
  both languages and both themes; the payment routes were also called over
  HTTP against a real PostgreSQL server.
- **Not tested against the real services:** Payme and Click have only seen
  requests built from their documentation, never their own sandboxes, and the
  Eskiz sender has never sent a real SMS. Expect small adjustments when the
  real keys are connected.

## Design rules worth knowing

- **Glass and fades.** A `backdrop-filter` stops seeing the page behind it
  while any ancestor is semi-transparent, which makes glass visibly snap when
  a fade ends. Fades are therefore applied to the glass element itself: use the
  `enter` class (on page open) or `<Reveal as="…">` (on scroll), never an
  opacity wrapper around glass.
- **Layers.** Custom classes in `globals.css` sit in `@layer base` and
  `@layer components`, so Tailwind utilities in markup always win.
- **Shared picture.** A product picture has the same view-transition name on
  its card and on its page (`productArtName`), which makes it glide between
  the two. A product must not appear twice on one page with that name.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, demo mode, embedded database
npm test
npm run lint
npm run build        # applies database migrations first when DATABASE_URL is set
npm start
npm run db:generate  # after changing src/db/schema.ts
npm run db:migrate   # apply migrations to DATABASE_URL by hand
```

## Roadmap

1. Foundation and home page (done)
2. Catalogue, filters, search, product page, favourites (done)
3. Cart, checkout, delivery, Click and Payme, customer account (done; the
   payment and SMS services wait for the shop's own keys)
4. Admin panel and Telegram Mini App, then the mobile app

Still placeholders: delivery prices and days, the shop's phone, e-mail,
address and working hours, and the information pages listed in the footer
without links.
