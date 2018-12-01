"use strict";

const globby = require("globby");
const unified = require("unified");
const rehype = require("rehype-parse");
const santize = require("rehype-sanitize");
const { readSync: toVfile } = require("to-vfile");
const { writeFile } = require("fs").promises;
const { basename } = require("path");
const { select, selectAll } = require("hast-util-select");

const simplifier = () => ast => {
  const metadataNode = select("pre", ast);
  let author, title;
  if (metadataNode) {
    const metadataText = metadataNode.children[0].value;
    title = /title:\w*(.+)/i.exec(metadataText);
    author = /author:\w*(.+)/i.exec(metadataText);

    if (title) title = title[1].trim();
    if (author) author = author[1].trim();
  }

  return {
    type: "book",
    author,
    title
  };
};

(async () => {
  // find html files
  const paths = await globby(["extracted/**/*.{html,htm}"]);

  const processor = unified()
    .use(rehype) // parse HTML
    .use(santize) // remove fluff content
    .use(simplifier); // reformat to new tree format

  processor.Compiler = JSON.stringify;
  processor.freeze();

  for (const p of paths) {
    try {
      const content = await processor.process(toVfile(p));
      await writeFile("json/" + basename(p) + ".json", content);
    } catch (err) {
      console.error(err);
    }
  }
})();
