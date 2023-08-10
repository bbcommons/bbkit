# bdckit

A command-line tool for working with FCC Broadband Data Collection (BDC) data

## Installation

TODO not yet packaged; see Development section for how to install in development
mode

## Usage

### `bdc download`

```bash
Usage: bdc download [options] <entity_filter> <filing_filter> <save_dir>

Download BDC data

Arguments:
  entity_filter             Examples: "states", "states:ca", "providers:134234"
  filing_filter             Examples: "fixed", "fixed:wired", "fixed:40,50", "supporting"
  save_dir                  Path to directory where downloads should go. Use "." for the current directory.

Options:
  -d, --filing-date <date>  A previous filing date, e.g. "2023-06-30"
  -h, --help                display help for command
```

Examples:

- Download fixed availability for all states for the latest filing period: `bdc download states fixed`
- Download fixed availability for a previous filing date: `bdc download states fixed --filing-date 2022-12-31`

#### Options

- `--tech`: can be a comma-separated list of tech codes (e.g. `60,70`) or a label (

### Development

1. Clone this repo to your local machine
2. `cd` into the repo
3. Run `npm i -g .`
