import Script from "next/script";

/**
 * Visit statistics, switched on by setting the counter numbers on the host:
 * NEXT_PUBLIC_YANDEX_METRIKA_ID (metrika.yandex.uz) and NEXT_PUBLIC_GA_ID
 * (analytics.google.com, "G-…"). Without them nothing is loaded.
 */
export function Analytics() {
  const yandex = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID?.replace(/\D/g, "");
  const google = process.env.NEXT_PUBLIC_GA_ID?.replace(/[^A-Za-z0-9-]/g, "");

  return (
    <>
      {yandex && (
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
k=e.createElement(t),a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${yandex},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true});`}
        </Script>
      )}
      {google && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${google}`} strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag("js",new Date());gtag("config","${google}");`}
          </Script>
        </>
      )}
    </>
  );
}
