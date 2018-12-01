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

function bookAuthorAndTitle(ast, vfile) {
  // find preformatted metadata tag
  const metadataNode = select("pre", ast);
  let author, title;
  if (metadataNode) {
    // look for text that looks like title and author
    const titleNode = find(metadataNode, n => titleRegex.test(n.value));
    const authorNode = find(metadataNode, n => authorRegex.test(n.value));

    if (titleNode) {
      // extract the raw text
      title = titleRegex.exec(titleNode.value)[1].trim();
    } else {
      // error when missing
      vfile.fail("missing title", metadataNode);
    }

    if (authorNode) {
      // extract the raw text
      author = authorRegex.exec(authorNode.value)[1].trim();
    } else {
      // error when missing
      vfile.fail("missing author", metadataNode);
    }
  } else {
    // error when missing
    vfile.fail("missing metadata", ast);
  }

  return {
    author,
    title
  };
}

const simplifier = () => (ast, vfile) => {
  const { author, title } = bookAuthorAndTitle(ast, vfile);

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
