# bbkit

> 🚨 this is a work in progress!

A command-line tool for working with broadband datasets (currently just FCC availability)

## Installation

To install bbkit:

```bash
npm i -g @bbcommons/bbkit
```

## Upgrading

To upgrade bbkit to the latest version:

```bash
npm i -g @bbcommons/bbkit@latest
```

## Usage

bbkit consists of nested functions where the general syntax is:

```
bb [dataset] [function]
```

For example:

```
bb bdc-availability download
```

To learn more about what functions are available and how they work, add the `--help` flag at any level. For example: `bb bdc-availability --help`.

> 🚨 **Do-good disclosure**: bbkit is provided by Broadband Commons openly-licensed and free of charge to help digital-divide problem-solvers do their work. Some of this data may be hosted on government websites with specific policies around downloading. While we are not aware of any restrictions that would prohibit using a tool like bbkit, we strongly recommend getting to know who owns the data you're using and what they consider to be fair access. Some rules of thumb are: 1) only download what you need, 2) don't download it more often than the data is updated, and 3) have good intentions 🤝

### `bb bdc-availability download`

Downloads a subset of the public BDC availability files. These are zipped CSV files where each row is a unique combination of broadband serviceable location ID, provider, and advertised service.

```bash
Usage: index [options] <entity-type> <entity-ids> <filing-type> <output-dir>

Arguments:
  entity-type                      Only `states` is supported currently
  entity-ids                       `all`, or a comma-separated list of entity IDs, e.g. `ca,nv,az`
  filing-type                      `fixed` or `mobile`
  output-dir                       Path to the directory to save downloads to

Options:
  -t, --tech <tech>                Technology names or codes to filter by, e.g. `fiber`, `3g`, `wired`, or
                                   `10,40,50`
  -f, --format <format>            File format (for mobile only; `gpkg` or `shp`)
  -d, --filing-date <filing-date>
  -h, --help
```

#### Examples

> 💡 When running `download`, your last argument should be a path to the directory where you want files to be stored. For example: `/Users/sam/Downloads/bdc-data`

- Download fixed availability for all states for the latest filing period: `bb bdc-availability download states all fixed <path to a folder to save to>`
- Download fixed availability for a previous filing date: `bb bdc-availability download states all fixed -d 2022-12-31 <path to a folder to save to>`
- Download all technologies for a single state: `bb bdc-availability download states oh fixed <path to a folder to save to>`
- Download fiber availability for a single state: `bb bdc-availability download states oh fixed -t fiber <path to a folder to save to>`
- Download all technologies for a few states: `bb bdc-availability download states co,wy,mt fixed <path to a folder to save to>`

#### What do I do next?

TODO tips how to unzip files, concat them, load into a db, etc.

## Development

To install bbkit locally and work on the code:

1. Clone this repo to your local machine
2. `cd` into the repo
3. Run `npm link`

`npm link` creates a symlink between your code and the `bb` command, so you can edit the code without having to reinstall the tool globally every time.
