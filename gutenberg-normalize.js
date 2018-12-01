"use strict";

const globby = require("globby");
const unified = require("unified");
const rehype = require("rehype-parse");
const santize = require("rehype-sanitize");
const toVfile = require("to-vfile");
const { writeFile } = require("fs").promises;
const { basename } = require("path");

const simplifier = () => ast => {
  return ast;
};

(async () => {
  // find html files
  const paths = await globby(["extracted/**/*.{html,htm}"]);

  const processor = unified()
    .use(rehype) // parse HTML
    .use(santize) // remove fluff content
    .use(simplifier)
    .freeze();
  for (const p of paths) {
    const content = processor.parse(toVfile.readSync(p));
    await writeFile("json/" + basename(p) + ".json", JSON.stringify(content));
  }
})();
