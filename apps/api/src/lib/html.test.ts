import { describe, it, expect } from "vitest";
import { escapeHtml, htmlDoc } from "./html";

describe("escapeHtml", () => {
  it("should escape ampersand", () => {
    expect(escapeHtml("A & B")).toBe("A &amp; B");
  });

  it("should escape less than", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("should escape greater than", () => {
    expect(escapeHtml("x > y")).toBe("x &gt; y");
  });

  it("should escape double quotes", () => {
    expect(escapeHtml('Say "hello"')).toBe("Say &quot;hello&quot;");
  });

  it("should escape single quotes", () => {
    expect(escapeHtml("It's working")).toBe("It&#039;s working");
  });

  it("should escape all special characters together", () => {
    const input = `<div class="test" data-value='A & B'>Content</div>`;
    const expected = `&lt;div class=&quot;test&quot; data-value=&#039;A &amp; B&#039;&gt;Content&lt;/div&gt;`;
    expect(escapeHtml(input)).toBe(expected);
  });

  it("should handle empty string", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("should handle string with no special characters", () => {
    expect(escapeHtml("Hello World")).toBe("Hello World");
  });

  it("should handle multiple ampersands", () => {
    expect(escapeHtml("A && B && C")).toBe("A &amp;&amp; B &amp;&amp; C");
  });
});

describe("htmlDoc", () => {
  it("should generate basic HTML document", () => {
    const html = htmlDoc({
      title: "Test Page",
      body: "<h1>Hello</h1>"
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Test Page</title>");
    expect(html).toContain("<h1>Hello</h1>");
  });

  it("should escape title", () => {
    const html = htmlDoc({
      title: "<script>alert('xss')</script>",
      body: "Content"
    });

    expect(html).toContain("&lt;script&gt;alert(&#039;xss&#039;)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  it("should include description meta tag when provided", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content",
      description: "This is a test page"
    });

    expect(html).toContain('<meta name="description" content="This is a test page">');
  });

  it("should escape description", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content",
      description: 'Test "quotes" & <tags>'
    });

    expect(html).toContain('content="Test &quot;quotes&quot; &amp; &lt;tags&gt;"');
  });

  it("should include canonical URL when provided", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content",
      canonicalUrl: "https://example.com/page"
    });

    expect(html).toContain('<link rel="canonical" href="https://example.com/page">');
  });

  it("should include Open Graph tags when provided", () => {
    const html = htmlDoc({
      title: "Test Article",
      body: "Content",
      description: "Article description",
      og: {
        type: "article",
        url: "https://example.com/article",
        image: "https://example.com/image.png"
      }
    });

    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<meta property="og:url" content="https://example.com/article">');
    expect(html).toContain('<meta property="og:title" content="Test Article">');
    expect(html).toContain('<meta property="og:description" content="Article description">');
    expect(html).toContain('<meta property="og:image" content="https://example.com/image.png">');
  });

  it("should include og:title even without og object", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content"
    });

    expect(html).toContain('<meta property="og:title" content="Test">');
  });

  it("should set lang to zh-CN", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content"
    });

    expect(html).toContain('<html lang="zh-CN">');
  });

  it("should include viewport meta tag", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content"
    });

    expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1">');
  });

  it("should include robots meta tag", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content"
    });

    expect(html).toContain('<meta name="robots" content="index,follow">');
  });

  it("should include navigation topbar", () => {
    const html = htmlDoc({
      title: "Test",
      body: "Content"
    });

    expect(html).toContain('<a href="/">Home</a>');
    expect(html).toContain('<a href="/playground/">Playground</a>');
    expect(html).toContain('<a href="/learn">Learn</a>');
    expect(html).toContain('<a href="/api/">API</a>');
  });

  it("should handle minimal params", () => {
    const html = htmlDoc({
      title: "Minimal",
      body: "<p>Test</p>"
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("<title>Minimal</title>");
    expect(html).toContain("<p>Test</p>");
  });
});
