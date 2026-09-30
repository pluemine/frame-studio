import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, validateSettings, assertSafeSvg } from "../settings.mjs";
test("neutral defaults preserve native resolution without brand marks", () => {
  const s = validateSettings({});
  assert.equal(s.name, "");
  assert.equal(s.slogan, "");
  assert.equal(s.logo, undefined);
  assert.deepEqual(s.social, []);
  assert.equal(s.width, "original");
});
test("portable preset accepts Thai and deduplicates selected social icons", () => {
  const s = validateSettings({
    name: "  ตัวอย่าง  ",
    slogan: "พื้นที่เล็ก ๆ สำหรับภาพ",
    social: "x,instagram,x",
    fontSize: "32",
  });
  assert.equal(s.name, "ตัวอย่าง");
  assert.equal(s.fontSize, 32);
  assert.deepEqual(s.social, ["x", "instagram"]);
  assert.deepEqual(validateSettings(JSON.parse(JSON.stringify(s))), s);
});
test("invalid presets cannot reach the renderer", () => {
  for (const value of [
    { sloganPosition: "inline" },
    { color: "#fff" },
    { fontSize: NaN },
    { width: 9000 },
    { social: ["unknown"] },
    { corners: "false" },
    { name: "two\nlines" },
    { logo: {} },
    [],
  ])
    assert.throws(() => validateSettings(value));
  assert.equal(DEFAULTS.social.length, 0);
});
test("SVG logo validation blocks active and external content", () => {
  assert.doesNotThrow(() =>
    assertSafeSvg('<svg><path fill="currentColor" d="M0 0h2"/></svg>'),
  );
  for (const svg of [
    '<svg onload="alert(1)"/>',
    "<svg><script/></svg>",
    '<svg><image href="https://example.com/a.png"/></svg>',
    "<svg><foreignObject/></svg>",
  ])
    assert.throws(() => assertSafeSvg(svg));
});
