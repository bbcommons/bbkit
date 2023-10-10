# bbkit

> 🚨 this is a work in progress!

A command-line tool for working with broadband datasets (currently just FCC availability)

## Installation

TODO not yet packaged; see Development section for how to install in development
mode

## Usage

### BDC Availability

`bb bdc-availability download`

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

- Download fixed availability for all states for the latest filing period: `bb bdc-availability download states all fixed`
- Download fixed availability for a previous filing date: `bb bdc-availability download states all fixed -d 2022-12-31`
- Download all technologies for a single state: `bb bdc-availability download states oh fixed`
- Download fiber availability for a single state: `bb bdc-availability download states oh fixed -t fiber`
- Download all technologies for a few states: `bb bdc-availability download states co,wy,mt fixed`

## Development

1. Clone this repo to your local machine
2. `cd` into the repo
3. Run `npm i -g .`
