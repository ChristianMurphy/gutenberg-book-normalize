# Gutenberg Book Normalize

> Normalize project Gutenberg books to a format easier for statistical models and machine learning to consume

## Installation

```bash
git clone git@github.com:ChristianMurphy/gutenberg-book-normalize.git
cd gutenberg-book-normalize
npm install
```

## Usage

### Download books

> Download all project Gutenberg English languages books in HTML format

Uses project Gutenberg's official robot access guide recommendations <https://www.gutenberg.org/wiki/Gutenberg:Information_About_Robot_Access_to_our_Pages>

:warning: size is over 40 gigabytes, download time can take 12 hours or more.

```bash
npm run gutenberg-download
```

### Extract books

> Unzips content into files and folders

```bash
npm run gutenberg-extract
```

### Normalize books

> Normalizes HTML content into an easier to process JSON format

```bash
npm run gutenberg-normalize
```

Example output

:warning: WORK IN PROGRESS, format will change

```json
{
  "type": "book",
  "title": "lorem ipsum",
  "author": "lorem ipsum",
  "children": [
    {
      "type": "chapter",
      "title": "lorem ipsum",
      "level": "h2",
      "children": [
        {
          "type": "paragraph",
          "value": "lorem ipsum"
        }
      ]
    }
  ]
}
```

:notebook: format conforms to [unist](https://github.com/syntax-tree/unist).
Any of the [unist utilities](https://github.com/syntax-tree/unist#list-of-utilities) can be used to further process the content.
