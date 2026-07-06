/**
 * # API client cho Tieba (百度贴吧)
 */

import type { IApiClient, RequestOptions, CookieData } from "../../base/base_client.js";
import type { Page, BrowserContext } from "playwright-core";
import crypto from "crypto";
import { ensureTiebaSuffix, tiebaLinkFromName, formatUnixTime, TieBaExtractor } from "./extractor.js";
import type { TiebaNote, TiebaComment, TiebaCreator } from "../../model/tieba.js";
import { TiebaSearchSortType, TiebaSearchNoteType } from "./field.js";

const PC_SIGN_SECRET = "36770b1f34c9bbf2e7d1a99d2b82fa9e";

export class TiebaClient implements IApiClient {
  private cookies: CookieData[] = [];
  private headers: Record<string, string> = {};
  public playwrightPage?: Page;
  private _pcTbs: string = "";
  private _host: string = "https://tieba.baidu.com";

  constructor(options?: { proxy?: string; headers?: Record<string, string> }) {
    this.headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://tieba.baidu.com/",
      "Origin": "https://tieba.baidu.com",
      ...options?.headers,
    };
  }

  setPage(page: Page): void {
    this.playwrightPage = page;
  }

  _signPcParams(params: Record<string, any>): string {
    const sortedKeys = Object.keys(params).sort();
    let signText = "";
    for (const key of sortedKeys) {
      if (key === "sign" || key === "sig" || params[key] === undefined || params[key] === null) {
        continue;
      }
      signText += `${key}=${params[key]}`;
    }
    signText += PC_SIGN_SECRET;
    return crypto.createHash("md5").update(signText, "utf8").digest("hex");
  }

  async _ensureTiebaOrigin(): Promise<void> {
    if (!this.playwrightPage) {
      throw new Error("playwrightPage is required for tieba PC API requests");
    }
    const currentUrl = this.playwrightPage.url();
    if (!currentUrl.startsWith(this._host)) {
      await this.playwrightPage.goto(this._host, { waitUntil: "domcontentloaded" });
    }
  }

  async _fetchJsonByBrowser(
    uri: string,
    method: string = "GET",
    params?: Record<string, any>,
    data?: Record<string, any>,
    useSign: boolean = false
  ): Promise<any> {
    await this._ensureTiebaOrigin();
    
    // Filter undefined/null values
    const cleanedParams = params 
      ? Object.fromEntries(Object.entries(params).filter(([_, v]) => v !== undefined && v !== null)) 
      : {};
    const cleanedData = data 
      ? Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)) 
      : {};

    if (useSign) {
      const signSource = method.toUpperCase() === "POST" ? cleanedData : cleanedParams;
      signSource["subapp_type"] = "pc";
      signSource["_client_type"] = "20";
      signSource["sign"] = this._signPcParams(signSource);
    }

    let url = `${this._host}${uri}`;
    if (Object.keys(cleanedParams).length > 0) {
      const q = Object.entries(cleanedParams)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
      url = `${url}?${q}`;
    }

    let body = "";
    if (Object.keys(cleanedData).length > 0) {
      body = Object.entries(cleanedData)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&");
    }

    if (!this.playwrightPage) {
      throw new Error("playwrightPage is not initialized on TiebaClient");
    }

    const response = await this.playwrightPage.evaluate(
      async ({ url, method, body }) => {
        const headers: Record<string, string> = { "Accept": "application/json, text/plain, */*" };
        const options: RequestInit = { method, credentials: "include", headers };
        if (method === "POST") {
          headers["Content-Type"] = "application/x-www-form-urlencoded;charset=UTF-8";
          options.body = body;
        }
        const resp = await fetch(url, options);
        const text = await resp.text();
        return { status: resp.status, text };
      },
      { url, method: method.toUpperCase(), body }
    );

    if (response.status !== 200) {
      throw new Error(`Tieba PC API failed, status=${response.status}, url=${url}`);
    }

    let jsonData: any;
    try {
      jsonData = JSON.parse(response.text);
    } catch (exc) {
      throw new Error(`Tieba PC API returned non-JSON, url=${url}, body=${response.text.slice(0, 500)}`);
    }

    const errorCode = jsonData.error_code !== undefined 
      ? jsonData.error_code 
      : (jsonData.no !== undefined ? jsonData.no : 0);

    if (String(errorCode) !== "0" && String(errorCode) !== "None" && String(errorCode) !== "undefined") {
      throw new Error(`Tieba PC API error, url=${url}, response=${JSON.stringify(jsonData)}`);
    }

    return jsonData;
  }

  async _getPcTbs(): Promise<string> {
    if (this._pcTbs) {
      return this._pcTbs;
    }
    const syncData = await this._fetchJsonByBrowser(
      "/c/s/pc/sync",
      "GET",
      { subapp_type: "pc", _client_type: "20" },
      undefined,
      true
    );
    this._pcTbs = syncData?.data?.anti?.tbs || "";
    if (!this._pcTbs) {
      throw new Error(`Can not get Tieba tbs from pc sync API: ${JSON.stringify(syncData)}`);
    }
    return this._pcTbs;
  }

  async _getPcPageData(noteId: string, page: number = 1): Promise<any> {
    const tbs = await this._getPcTbs();
    return await this._fetchJsonByBrowser(
      "/c/f/pb/page_pc",
      "POST",
      undefined,
      {
        pn: page,
        lz: 0,
        r: 2,
        mark_type: 0,
        back: 0,
        fr: "",
        kz: noteId,
        session_request_times: 1,
        tbs,
        subapp_type: "pc",
        _client_type: "20",
      },
      true
    );
  }

  _extractCreatorPortrait(creatorUrl: string): string {
    const urlStr = (creatorUrl || "").trim();
    if (!urlStr) return "";
    try {
      const parsed = new URL(urlStr.startsWith("http") ? urlStr : `https://${urlStr}`);
      const portrait = parsed.searchParams.get("id") || parsed.searchParams.get("portrait") || parsed.searchParams.get("un") || "";
      return decodeURIComponent(portrait).split("?")[0];
    } catch {
      // Fallback regex
      const match = urlStr.match(/[?&](id|portrait|un)=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[2]).split("?")[0];
      }
      return urlStr.split("?")[0];
    }
  }

  async request(method: string, url: string, options?: RequestOptions): Promise<any> {
    let targetUrl = url;
    if (url.startsWith("/")) {
      targetUrl = `${this._host}${url}`;
    }

    if (this.playwrightPage) {
      const response = await this.playwrightPage.evaluate(
        async ({ url, method, headers, body }) => {
          const opt: RequestInit = { method, credentials: "include" };
          if (headers) opt.headers = headers;
          if (body) opt.body = body;
          const resp = await fetch(url, opt);
          const text = await resp.text();
          return { status: resp.status, text };
        },
        {
          url: targetUrl,
          method: method.toUpperCase(),
          headers: options?.headers as Record<string, string>,
          body: options?.body ? String(options.body) : undefined
        }
      );
      if (options?.headers?.Accept?.includes("html") || !response.text.trim().startsWith("{")) {
        return response.text;
      }
      return JSON.parse(response.text);
    } else {
      const resp = await fetch(targetUrl, {
        method: method.toUpperCase(),
        headers: {
          ...this.headers,
          ...options?.headers,
        } as Record<string, string>,
        body: options?.body ? String(options.body) : undefined,
      });
      const text = await resp.text();
      if (options?.headers?.Accept?.includes("html") || !text.trim().startsWith("{")) {
        return text;
      }
      return JSON.parse(text);
    }
  }

  async getNotesByKeyword(
    keyword: string,
    page: number = 1,
    pageSize: number = 10,
    sort: TiebaSearchSortType = TiebaSearchSortType.TIME_DESC,
    noteType: TiebaSearchNoteType = TiebaSearchNoteType.FIXED_THREAD
  ): Promise<TiebaNote[]> {
    const params = {
      rn: Math.max(pageSize, 20),
      st: sort,
      word: keyword,
      needbrand: 1,
      sug_type: 2,
      pn: page,
      come_from: "search",
      subapp_type: "pc",
      _client_type: "20",
    };

    try {
      const apiData = await this._fetchJsonByBrowser(
        "/mo/q/search/multsearch",
        "GET",
        params,
        undefined,
        true
      );
      const notes = TieBaExtractor.extractSearchNoteListFromApi(apiData).slice(0, pageSize);
      return notes;
    } catch (e) {
      console.error(`[TiebaClient.getNotesByKeyword] Search failed:`, e);
      throw e;
    }
  }

  async getNoteById(noteId: string): Promise<TiebaNote> {
    try {
      const apiData = await this._getPcPageData(noteId, 1);
      return TieBaExtractor.extractNoteDetailFromApi(apiData);
    } catch (e) {
      console.error(`[TiebaClient.getNoteById] Failed to get post details for noteId ${noteId}:`, e);
      throw e;
    }
  }

  async getNoteAllComments(
    noteDetail: TiebaNote,
    crawlInterval: number = 1.0,
    callback?: (noteId: string, comments: TiebaComment[]) => Promise<void>,
    maxCount: number = 10
  ): Promise<TiebaComment[]> {
    const result: TiebaComment[] = [];
    let currentPage = 1;
    const totalPages = noteDetail.total_replay_page || 1;

    while (totalPages >= currentPage && result.length < maxCount) {
      try {
        const apiData = await this._getPcPageData(noteDetail.note_id!, currentPage);
        let comments = TieBaExtractor.extractTiebaNoteParentCommentsFromApi(apiData, noteDetail);

        if (comments.length === 0) {
          break;
        }

        if (result.length + comments.length > maxCount) {
          comments = comments.slice(0, maxCount - result.length);
        }

        if (callback) {
          await callback(noteDetail.note_id!, comments);
        }

        result.push(...comments);

        // Fetch sub-comments if enabled/required
        await this.getCommentsAllSubComments(comments, crawlInterval, callback);

        await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));
        currentPage++;
      } catch (e) {
        console.error(`[TiebaClient.getNoteAllComments] Failed to get page ${currentPage} comments:`, e);
        break;
      }
    }
    return result;
  }

  async getCommentsAllSubComments(
    comments: TiebaComment[],
    crawlInterval: number = 1.0,
    callback?: (noteId: string, comments: TiebaComment[]) => Promise<void>
  ): Promise<TiebaComment[]> {
    const allSubComments: TiebaComment[] = [];

    for (const parentComment of comments) {
      const subCommentCount = parentComment.sub_comment_count || 0;
      if (subCommentCount === 0) {
        continue;
      }

      let currentPage = 1;
      const maxSubPageNum = Math.floor(subCommentCount / 10) + 1;

      while (maxSubPageNum >= currentPage) {
        const subCommentUrl = `${this._host}/p/comment?tid=${parentComment.note_id}&pid=${parentComment.comment_id}&fid=${parentComment.tieba_id}&pn=${currentPage}`;
        
        try {
          if (!this.playwrightPage) {
            throw new Error("playwrightPage is not initialized on TiebaClient");
          }
          await this.playwrightPage.goto(subCommentUrl, { waitUntil: "domcontentloaded" });
          await new Promise(resolve => setTimeout(resolve, 1500));

          const subComments = await TieBaExtractor.extractTiebaNoteSubCommentsFromPage(this.playwrightPage, parentComment);
          if (subComments.length === 0) {
            break;
          }

          if (callback) {
            await callback(parentComment.note_id!, subComments);
          }

          allSubComments.push(...subComments);
          await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));
          currentPage++;
        } catch (e) {
          console.error(`[TiebaClient.getCommentsAllSubComments] Failed to get comment ${parentComment.comment_id} sub-comments:`, e);
          break;
        }
      }
    }
    return allSubComments;
  }

  async getNotesByTiebaName(tiebaName: string, pageNum: number): Promise<TiebaNote[]> {
    const pageSize = 30;
    const apiPage = Math.floor(pageNum / pageSize) + 1;
    const tbs = await this._getPcTbs();

    try {
      const apiData = await this._fetchJsonByBrowser(
        "/c/f/frs/page_pc",
        "POST",
        undefined,
        {
          kw: encodeURIComponent(tiebaName),
          pn: apiPage,
          sort_type: -1,
          is_newfrs: 1,
          is_newfeed: 1,
          rn: pageSize,
          rn_need: 10,
          tbs,
          subapp_type: "pc",
          _client_type: "20",
        },
        true
      );
      return TieBaExtractor.extractTiebaNoteListFromFrsApi(apiData).slice(0, pageSize);
    } catch (e) {
      console.error(`[TiebaClient.getNotesByTiebaName] Failed to get Tieba note list:`, e);
      throw e;
    }
  }

  async getCreatorInfoByUrl(creatorUrl: string): Promise<TiebaCreator> {
    const portrait = this._extractCreatorPortrait(creatorUrl);
    if (!portrait) {
      throw new Error(`Can not extract Tieba creator portrait from url: ${creatorUrl}`);
    }

    try {
      const apiData = await this._fetchJsonByBrowser(
        "/c/u/pc/homeSidebarRight",
        "GET",
        {
          portrait,
          un: "",
          subapp_type: "pc",
          _client_type: "20",
        },
        undefined,
        true
      );
      return TieBaExtractor.extractCreatorInfoFromApi(apiData);
    } catch (e) {
      console.error(`[TiebaClient.getCreatorInfoByUrl] Failed to get creator info:`, e);
      throw e;
    }
  }

  async getNotesByCreatorPortrait(portrait: string, pageNumber: number, pageSize: number = 20): Promise<any> {
    return await this._fetchJsonByBrowser(
      "/c/u/feed/myThread",
      "GET",
      {
        pn: pageNumber,
        rn: pageSize,
        portrait,
        type: 1,
        un: "",
        subapp_type: "pc",
        _client_type: "20",
      },
      undefined,
      true
    );
  }

  async getNotesByCreator(userName: string, pageNumber: number): Promise<any> {
    if (!this.playwrightPage) {
      throw new Error("playwrightPage is not initialized on TiebaClient");
    }
    const creatorUrl = `${this._host}/home/get/getthread?un=${encodeURIComponent(userName)}&pn=${pageNumber}&id=utf-8&_=${Date.now()}`;
    
    try {
      await this.playwrightPage.goto(creatorUrl, { waitUntil: "domcontentloaded" });
      await new Promise(resolve => setTimeout(resolve, 1500));

      const jsonText = await this.playwrightPage.evaluate(() => document.body.innerText);
      return JSON.parse(jsonText);
    } catch (e) {
      console.error(`[TiebaClient.getNotesByCreator] Failed to get creator post list:`, e);
      throw e;
    }
  }

  async getAllNotesByCreatorUserName(
    userName: string,
    crawlInterval: number = 1.0,
    callback?: (notes: TiebaNote[]) => Promise<void>,
    maxNoteCount: number = 0,
    creatorPageHtmlContent?: string
  ): Promise<TiebaNote[]> {
    const result: TiebaNote[] = [];

    // Special handling for homepage html content
    if (creatorPageHtmlContent && this.playwrightPage) {
      const threadIds = await TieBaExtractor.extractCreatorThreadIdListFromPage(this.playwrightPage);
      const noteDetailTasks = threadIds.map(id => this.getNoteById(id));
      const notes = (await Promise.all(noteDetailTasks)).filter(Boolean);
      if (callback && notes.length > 0) {
        await callback(notes);
      }
      result.push(...notes);
    }

    let notesHasMore = 1;
    let pageNumber = 1;
    const pagePerCount = 20;
    let totalGetCount = 0;

    while (notesHasMore === 1 && (maxNoteCount === 0 || totalGetCount < maxNoteCount)) {
      const notesRes = await this.getNotesByCreator(userName, pageNumber);
      if (!notesRes || notesRes.no !== 0) {
        break;
      }
      const notesData = notesRes.data || {};
      notesHasMore = notesData.has_more !== undefined ? notesData.has_more : 0;
      const threadList = notesData.thread_list || [];

      const noteDetailTasks = threadList.map((note: any) => this.getNoteById(String(note.thread_id)));
      const notes = (await Promise.all(noteDetailTasks)).filter(Boolean);
      if (callback && notes.length > 0) {
        await callback(notes);
      }
      
      result.push(...notes);
      await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));
      pageNumber++;
      totalGetCount += pagePerCount;
    }
    return result;
  }

  async getAllNotesByCreatorUrl(
    creatorUrl: string,
    crawlInterval: number = 1.0,
    callback?: (notes: TiebaNote[]) => Promise<void>,
    maxNoteCount: number = 0
  ): Promise<TiebaNote[]> {
    const portrait = this._extractCreatorPortrait(creatorUrl);
    if (!portrait) {
      throw new Error(`Can not extract Tieba creator portrait from url: ${creatorUrl}`);
    }

    const result: TiebaNote[] = [];
    let pageNumber = 1;
    const pageSize = 20;

    while (maxNoteCount === 0 || result.length < maxNoteCount) {
      const notesRes = await this.getNotesByCreatorPortrait(portrait, pageNumber, pageSize);
      let threadIdList = TieBaExtractor.extractCreatorThreadIdListFromApi(notesRes);
      if (threadIdList.length === 0) {
        break;
      }

      if (maxNoteCount > 0 && result.length + threadIdList.length > maxNoteCount) {
        threadIdList = threadIdList.slice(0, maxNoteCount - result.length);
      }

      const noteDetailTasks = threadIdList.map(id => this.getNoteById(id));
      const notes = (await Promise.all(noteDetailTasks)).filter(Boolean);
      if (callback && notes.length > 0) {
        await callback(notes);
      }
      result.push(...notes);

      const data = notesRes.data || {};
      const hasMore = Number(data.has_more || 0);
      if (!hasMore) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, crawlInterval * 1000));
      pageNumber++;
    }

    return result;
  }

  async pong(context?: BrowserContext): Promise<boolean> {
    if (!context) {
      return false;
    }
    try {
      const cookies = await context.cookies([this._host]);
      const cookieMap = Object.fromEntries(cookies.map(c => [c.name, c.value]));
      const hasSession = !!(cookieMap.STOKEN || cookieMap.PTOKEN || cookieMap.BDUSS);
      return hasSession;
    } catch {
      return false;
    }
  }

  async updateCookies(cookies: CookieData[]): Promise<void> {
    this.cookies = cookies;
  }

  getActiveCookies(): CookieData[] {
    return this.cookies;
  }
}
