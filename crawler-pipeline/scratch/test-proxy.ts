import { fetch } from "undici"; // Let's check both undici fetch and native fetch

const targetUrl = "https://upos-hz-mirrorakam.akamaized.net/upgcxcode/02/34/918273402/918273402-1-208.mp4?e=ig8euxZM2rNcNbRB7WdVhwdlhWUBhwdVhoNvNC8BqJIzNbfqXBvEqxTEto8BTrNvN0GvT90W5JZMkX_YN0MvXg8gNEV4NC8xNEV4N03eN0B5tZlqNxTEto8BTrNvNeZVuJ10Kj_g2UB02J0mN0B5tZlqNCNEto8BTrNvNC7MTX502C8f2jmMQJ6mqF2fka1mqx6gqj0eN0B599M=&og=ali&trid=6db030775b8348bbb0276c12a36a47eu&gen=playurlv3&os=akam&deadline=1783425873&nbs=1&uipk=5&mid=3707018118432885&oi=1984347217&platform=pc&upsig=00131d2aa7e529d5836c8ce973628733&uparams=e,og,trid,gen,os,deadline,nbs,uipk,mid,oi,platform&hdnts=exp=1783425873~hmac=a32c3cf821b986be7bc99a565ceb1b3ff8baee43611a0e5bae048bbd7ac32d4a&bvc=vod&nettype=0&bw=1245109&lrs=0&buvid=E9D363C3-B0A2-73DD-D1DC-B3156F13587246784infoc&build=0&dl=0&f=u_0_0&qn_dyeid=a38a0745bc20e1f900c9a8936a4ccf31&agrr=1&orderid=0,2";

async function testNative() {
  console.log("Testing with native globalThis.fetch...");
  try {
    const headers = new Headers();
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    headers.set("Referer", "https://www.bilibili.com/");
    headers.set("Origin", "https://www.bilibili.com");

    const res = await globalThis.fetch(targetUrl, {
      method: "GET",
      headers,
    });
    console.log(`Native Fetch status: ${res.status} ${res.statusText}`);
    console.log("Headers:");
    res.headers.forEach((v, k) => console.log(` - ${k}: ${v}`));
  } catch (err: any) {
    console.error("❌ Native Fetch error:", err.message, err.stack);
  }
}

async function testUndici() {
  console.log("\nTesting with undici.fetch...");
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.bilibili.com/",
      "Origin": "https://www.bilibili.com"
    };

    const res = await fetch(targetUrl, {
      method: "GET",
      headers,
    });
    console.log(`Undici Fetch status: ${res.status} ${res.statusText}`);
  } catch (err: any) {
    console.error("❌ Undici Fetch error:", err.message, err.stack);
  }
}

async function main() {
  await testNative();
  await testUndici();
}

main().catch(console.error);
