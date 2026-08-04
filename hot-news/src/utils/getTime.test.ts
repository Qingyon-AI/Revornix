import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTime } from "./getTime";

// 各家热榜给出的时间格式五花八门：秒级/毫秒级时间戳、"昨日 12:30"、"3月5日"、
// "20分钟前"、ISO 串。解析错了不会报错，只会让条目排到错误的位置或显示成 1970 年。
//
// 大量分支依赖"现在"，所以这里冻结时间 —— 否则测试会在跨日、跨年时随机变红。

const NOW = "2026-03-15T10:30:00.000Z";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(NOW));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getTime 时间戳", () => {
  it("毫秒级时间戳原样返回", () => {
    const ms = 1773570600000;
    expect(getTime(ms)).toBe(ms);
  });

  it("秒级时间戳被换算成毫秒", () => {
    // 少乘 1000 会把 2026 年的条目显示成 1970 年
    const seconds = 1773570600;
    expect(getTime(seconds)).toBe(seconds * 1000);
  });

  it("数字字符串按同样规则处理", () => {
    expect(getTime("1773570600")).toBe(1773570600 * 1000);
  });
});

describe("getTime 相对与中文格式", () => {
  it("HH:mm 落在今天", () => {
    const got = getTime("08:15");
    expect(got).toBeDefined();
    const d = dayjs(got);
    expect(d.format("YYYY-MM-DD")).toBe(dayjs().format("YYYY-MM-DD"));
    expect(d.hour()).toBe(8);
    expect(d.minute()).toBe(15);
  });

  it("昨日 HH:mm 落在前一天", () => {
    const got = getTime("昨日 22:10");
    expect(got).toBeDefined();
    const d = dayjs(got);
    expect(d.format("YYYY-MM-DD")).toBe(dayjs().subtract(1, "day").format("YYYY-MM-DD"));
    expect(d.hour()).toBe(22);
  });

  it("昨天 HH:mm 同样落在前一天", () => {
    const got = getTime("昨天 09:05");
    expect(dayjs(got).format("YYYY-MM-DD")).toBe(
      dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    );
  });

  it("N 分钟前是相对当前时刻", () => {
    const got = getTime("20分钟前");
    expect(got).toBeDefined();
    expect(dayjs(got).valueOf()).toBe(dayjs().subtract(20, "minute").valueOf());
  });

  it("M月D日 落在今年当天零点", () => {
    const got = getTime("3月5日");
    expect(got).toBeDefined();
    const d = dayjs(got);
    expect(d.month()).toBe(2); // 0-indexed：3 月
    expect(d.date()).toBe(5);
    expect(d.hour()).toBe(0);
  });

  it("M月D日 HH:mm 保留时分", () => {
    const got = getTime("3月5日 14:20");
    expect(got).toBeDefined();
    const d = dayjs(got);
    expect(d.date()).toBe(5);
    expect(d.hour()).toBe(14);
    expect(d.minute()).toBe(20);
  });
});

describe("getTime 标准格式", () => {
  it("解析 YYYY-MM-DD HH:mm:ss", () => {
    const got = getTime("2026-03-05 14:20:30");
    expect(got).toBeDefined();
    const d = dayjs(got);
    expect(d.format("YYYY-MM-DD")).toBe("2026-03-05");
    expect(d.hour()).toBe(14);
  });

  it("解析 YYYY/MM/DD", () => {
    const got = getTime("2026/03/05");
    expect(got).toBeDefined();
    expect(dayjs(got).format("YYYY-MM-DD")).toBe("2026-03-05");
  });

  it("解析 ISO 串", () => {
    const got = getTime("2026-03-05T14:20:30");
    expect(got).toBeDefined();
    expect(dayjs(got).format("YYYY-MM-DD")).toBe("2026-03-05");
  });
});

describe("getTime 无法解析时", () => {
  it("不抛出 —— 单条数据格式异常不该让整个热榜接口 500", () => {
    expect(() => getTime("不是时间")).not.toThrow();
    expect(() => getTime("")).not.toThrow();
  });

  it("解析不了时返回 0（当前行为，存疑）", () => {
    // 这里记录的是**现状**而非期望：解析失败走的是显式 `return 0`，
    // 而 0 当时间戳就是 1970-01-01 —— 前端会把它显示成 1970 年，排序时也会
    // 排到最前，而不是被识别成"没有时间"。函数签名本身是 `number | undefined`，
    // 返回 undefined 才符合它的意图。
    //
    // 没有顺手改：调用点的 timestamp 字段有的声明为 `number`（必填），改语义
    // 会波及前端展示，属于行为变更而不是重构。先用测试把现状钉住，改与不改
    // 是一个单独的决定。
    expect(getTime("不是时间")).toBe(0);
  });
});
