import * as cheerio from "cheerio";

import { fetchHtmlWithCache } from "@/lib/onvista/fetch";

export async function resolveProductUrlBySearch(isin: string) {
  // IMPORTANT: onvista search uses a trailing slash. Without it the site often returns
  // a generic page and the ISIN can't be resolved reliably.
  const url = `https://www.onvista.de/suche/?searchValue=${encodeURIComponent(isin)}`;
  const { html, finalUrl } = await fetchHtmlWithCache(url, { cacheSeconds: 60 * 60 });

  // In many cases onvista redirects the search directly to the product page.
  if (
    finalUrl.includes("/derivate/Optionsscheine/") &&
    finalUrl.toLowerCase().includes(isin.toLowerCase())
  ) {
    return finalUrl;
  }

  const $ = cheerio.load(html);

  const links = $("a[href]")
    .toArray()
    .map((el) => $(el).attr("href") || "")
    .filter((href) => href.includes("/derivate/Optionsscheine/"));

  const match = links.find((href) => href.toLowerCase().includes(isin.toLowerCase()));
  if (!match) return null;
  return match.startsWith("http") ? match : `https://www.onvista.de${match}`;
}
