import { describe, expect, it } from "vitest";

import { parseChineseNumber } from "./getNum";

// 热榜的热度值来自各家页面，格式不统一："1.2万"、"3亿"、"5000"。解析错了不会报错，
// 只会让排序莫名其妙 —— 把"1.2万"读成 1.2 就会把最热的条目排到最后。

describe("parseChineseNumber", () => {
  it("解析万", () => {
    expect(parseChineseNumber("1.2万")).toBe(12000);
  });

  it("解析亿", () => {
    expect(parseChineseNumber("3亿")).toBe(3e8);
  });

  it("解析千", () => {
    expect(parseChineseNumber("5千")).toBe(5000);
  });

  it("解析百", () => {
    expect(parseChineseNumber("8百")).toBe(800);
  });

  it("纯数字原样返回", () => {
    expect(parseChineseNumber("5000")).toBe(5000);
  });

  it("小数正确缩放", () => {
    expect(parseChineseNumber("1.5亿")).toBe(1.5e8);
  });

  it("整数万不产生浮点误差", () => {
    // 排序用得上精确值，10000.000000001 这类结果会让相等比较失效
    expect(Number.isInteger(parseChineseNumber("1万"))).toBe(true);
  });

  it("单位优先级：亿先于万", () => {
    // 遍历顺序决定结果。若先匹配到"万"，"1亿"这种含多单位的串会被算错。
    // 这里锁住当前行为：亿在对照表中排在最前。
    expect(parseChineseNumber("2亿")).toBe(2e8);
  });

  it("无法解析时返回 NaN 而不是 0", () => {
    // 返回 0 会被当成"热度为零"参与排序；NaN 至少能被调用方识别出来
    expect(Number.isNaN(parseChineseNumber("暂无"))).toBe(true);
  });

  it("空字符串返回 NaN", () => {
    expect(Number.isNaN(parseChineseNumber(""))).toBe(true);
  });
});
