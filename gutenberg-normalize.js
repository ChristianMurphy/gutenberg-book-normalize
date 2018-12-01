"use strict";

const globby = require("globby");
const unified = require("unified");
const rehype = require("rehype-parse");
const santize = require("rehype-sanitize");
const { readSync: toVfile } = require("to-vfile");
const { writeFile } = require("fs").promises;
const { basename } = require("path");
const { select: hSelect, selectAll: hSelectAll } = require("hast-util-select");
const { selectAll: uSelectAll } = require("unist-util-select");
const find = require("unist-util-find");
const reporter = require("vfile-reporter");
const findAllBetween = require("unist-util-find-all-between");
const location = require("vfile-location");

const titleRegex = /title:\w*(.+)/i;
const authorRegex = /author:\w*(.+)/i;

let toOffset;

function bookAuthorAndTitle(ast, vfile) {
  // find preformatted metadata tag
  const metadataNode = hSelect("pre", ast);
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

function bookChapters(ast, vfile) {
  try {
    // use headers as chapter markers
    const chapters = hSelectAll("h1, h2, h3, h4, h5, h6", ast);

    // if no headers found, no chapters
    if (chapters.length < 1) {
      vfile.fail("no chapters", ast);
    }

    // order chapters by their location in the document
    // prevents paragraph duplication between chapters
    chapters.sort(byPosition);

    // extract level and title for chapter
    return chapters.map((n, i, l) => ({
      type: "chapter",
      title: uSelectAll("text", n)
        .map(n => n.value)
        .join(" "),
      level: n.tagName,
      children: bookChapterParagraphs(vfile, n, i, l)
    }));
  } catch (err) {
    // stack overflow means no chapters
    vfile.fail("no chapters", ast);
  }
}

// sort nodes by their starting position in the document, in ascending order
function byPosition(a, b) {
  return toOffset(a.position.start) - toOffset(b.position.start);
}

function bookChapterParagraphs(vfile, chapter, chapterIndex, chapterList) {
  try {
    // find the chapter content using the header as the start
    let end;
    if (chapterIndex + 2 < chapterList.length) {
      // use the next chapter as the end
      end = chapterList[chapterIndex + 1];
    } else {
      // when there are no more chapters, use last child of chapter's parent as the end
      const finalNodes = hSelectAll(":last-child", chapter.parent);
      end = finalNodes[finalNodes.length - 1];
    }
    const chapterContent = findAllBetween(chapter.parent, chapter, end);

    // find all paragraphs in chapter
    return chapterContent
      .filter(n => n.tagName === "p")
      .map(n => ({
        type: "paragraph",
        // extract only the text from the paragraph, no styling or tags
        value: uSelectAll("text", n)
          .map(n => n.value)
          .join(" ")
      }));
  } catch (err) {
    vfile.fail("could not match", chapter);
  }
}

const simplifier = () => (ast, vfile) => {
  // add parent information to each node, needed to determine end of last chapter
  ast = require("unist-util-parents")(ast);
  // allow offset to be determined from position, used for sorting of chapters
  toOffset = location(vfile).toOffset;

  // lookup author and title
  const { author, title } = bookAuthorAndTitle(ast, vfile);

  // parse chapters and paragraphs
  const children = bookChapters(ast, vfile);

  // book is root node
  return {
    type: "book",
    author,
    title,
    children
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
      // read and process file
      const content = await processor.process(toVfile(p));
      // write new file in json folder
      await writeFile("json/" + basename(p) + ".json", content);
    } catch (err) {
      console.error(reporter(err));
    }
  }
})();
