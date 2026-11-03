import { addToQueue, subtractSent, dropOld, toItems, kstDay, recordClaudeUsage, flushClaudeUsage } from "./claudeUsageReport";

const U = { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 5, cache_creation_input_tokens: 1 };

test("같은 날·기능·모델은 한 줄로 합친다", () => {
  let q = addToQueue({}, "2026-11-03", "spend_analysis", "claude-opus-5-5", U);
  q = addToQueue(q, "2026-11-03", "spend_analysis", "claude-opus-5-5", { input_tokens: 10 });
  q = addToQueue(q, "2026-11-03", "notif_parse", "claude-opus-5-5", U);
  expect(Object.keys(q)).toHaveLength(2);
  expect(q["2026-11-03|spend_analysis|claude-opus-5-5"]).toEqual({ n: 2, i: 110, o: 20, cr: 5, cw: 1 });
});

test("보낸 만큼 빼고 보낸 줄만 지운다", () => {
  const q = addToQueue({}, "2026-11-03", "f", "m", U);
  const later = addToQueue(q, "2026-11-03", "f", "m", { input_tokens: 7 });
  expect(subtractSent(later, q)).toEqual({ "2026-11-03|f|m": { n: 1, i: 7, o: 0, cr: 0, cw: 0 } });
  expect(subtractSent(q, q)).toEqual({});
});

test("7일 지난 줄은 버리고 항목에는 토큰·모델·기능만 담는다", () => {
  const now = Date.parse("2026-11-03T03:00:00Z");
  expect(kstDay(now)).toBe("2026-11-03");
  const q = dropOld({ ...addToQueue({}, "2026-10-01", "f", "m", U), ...addToQueue({}, "2026-10-28", "f", "m", U) }, now);
  expect(toItems(q)).toEqual([{ d: "2026-10-28", f: "f", m: "m", n: 1, i: 100, o: 20, cr: 5, cw: 1 }]);
});

test("기록하면 서버로 보내고, 받으면 큐를 비운다(5분 안에는 다시 안 보냄)", async () => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ status: 200 });
  recordClaudeUsage("spend_classify", "claude-haiku-5-5", U);
  await new Promise((r) => setTimeout(r, 0));
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const [url, init] = global.fetch.mock.calls[0];
  expect(url).toContain("app=mybudget");
  const body = JSON.parse(init.body);
  expect(body.items[0]).toMatchObject({ f: "spend_classify", m: "claude-haiku-5-5", i: 100 });
  expect(Object.keys(body)).toEqual(["device", "items"]);
  expect(JSON.parse(localStorage.getItem("claudeUsageQueue"))).toEqual({});
  recordClaudeUsage("spend_classify", "claude-haiku-5-5", U);
  await flushClaudeUsage();
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("네트워크 실패면 큐에 남긴다", async () => {
  localStorage.clear();
  global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
  recordClaudeUsage("f", "m", U);
  await new Promise((r) => setTimeout(r, 0));
  expect(Object.keys(JSON.parse(localStorage.getItem("claudeUsageQueue")))).toHaveLength(1);
});
