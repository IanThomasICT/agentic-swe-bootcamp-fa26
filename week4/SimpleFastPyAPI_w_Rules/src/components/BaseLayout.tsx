import { renderToString } from "solid-js/web";
import type { JSX } from "solid-js";

const styles = `
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0 1rem 3rem;
      background: #f5f6f8;
      color: #16181d;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      font-size: 16px;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      max-width: 60rem;
      margin: 0 auto;
      padding: 1.25rem 0;
      border-bottom: 1px solid #d8dbe0;
    }
    main { max-width: 60rem; margin: 0 auto; }
    h1 { font-size: 1.3rem; margin: 0; }
    h2 { font-size: 1.05rem; margin: 0 0 .6rem; }
    .subtitle { margin: .15rem 0 0; color: #5b6169; font-size: .85rem; }
    .card {
      background: #fff;
      border: 1px solid #d8dbe0;
      border-radius: 8px;
      padding: 1rem 1.1rem;
      margin: 1rem 0;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      text-align: left;
      padding: .55rem .4rem;
      border-bottom: 1px solid #e6e8eb;
      font-size: .95rem;
      vertical-align: middle;
    }
    th { font-size: .8rem; text-transform: uppercase; letter-spacing: .03em; color: #5b6169; }
    label { display: block; font-size: .85rem; margin: .7rem 0 .2rem; color: #3d434c; }
    input[type="text"], input[type="email"], input[type="password"] {
      width: 100%;
      max-width: 26rem;
      padding: .45rem .55rem;
      border: 1px solid #c3c7cc;
      border-radius: 5px;
      font-size: .95rem;
      background: #fff;
    }
    button, .button {
      padding: .45rem .9rem;
      border-radius: 5px;
      border: 1px solid #c3c7cc;
      background: #fff;
      color: inherit;
      font-size: .9rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    button.primary { background: #2d5bd7; border-color: #2d5bd7; color: #fff; }
    button.danger { color: #b3261e; border-color: #e2b4b0; }
    .row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    form.inline { display: inline; }
    .muted { color: #5b6169; font-size: .85rem; }
    .flash { padding: .65rem .85rem; border-radius: 6px; margin: 1rem 0; }
    .flash.ok { background: #e7f4ea; border: 1px solid #b6dfc4; }
    .flash.err { background: #fdecea; border: 1px solid #f5c6c2; }
    code { background: #eef0f3; padding: .1rem .3rem; border-radius: 4px; font-size: .85em; }
  `;

interface BaseLayoutProps {
  heading: string;
  headerActions?: JSX.Element;
  children: JSX.Element;
}

export function BaseLayout(props: BaseLayoutProps): JSX.Element {
  return (
    <div data-solid-root>
      <header>
        <div>
          <h1>{props.heading}</h1>
          <p class="subtitle">Managing users</p>
        </div>
        {props.headerActions}
      </header>
      <main>{props.children}</main>
    </div>
  );
}

export function renderDocument(view: JSX.Element, title: string): string {
  const rendered = renderToString(() => view);
  const bodyMarkup = rendered.slice(rendered.indexOf(">") + 1, rendered.lastIndexOf("</div>"));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} &middot; User admin</title>
  <style>${styles}</style>
</head>
<body>${bodyMarkup}</body>
</html>`;
}
