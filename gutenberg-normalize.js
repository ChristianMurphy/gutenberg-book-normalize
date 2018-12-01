"use strict";

const globby = require("globby");
const unified = require("unified");
const rehype = require("rehype-parse");
const santize = require("rehype-sanitize");
const { readSync: toVfile } = require("to-vfile");
const { writeFile } = require("fs").promises;
const { basename } = require("path");
const { select, selectAll } = require("hast-util-select");
const find = require("unist-util-find");
const reporter = require("vfile-reporter");

const titleRegex = /title:\w*(.+)/i;
const authorRegex = /author:\w*(.+)/i;

const simplifier = () => (ast, vfile) => {
  const metadataNode = select("pre", ast);
  let author, title;
  if (metadataNode) {
    const titleNode = find(metadataNode, n => titleRegex.test(n.value));
    const authorNode = find(metadataNode, n => authorRegex.test(n.value));

    if (titleNode) {
      title = titleRegex.exec(titleNode.value)[1].trim();
    } else {
      vfile.fail("missing title");
    }
    if (authorNode) {
      author = authorRegex.exec(authorNode.value)[1].trim();
    } else {
      vfile.fail("missing author");
    }
  } else {
    vfile.fail("missing metadata");
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
      console.error(reporter(err));
    }
  }
})();
