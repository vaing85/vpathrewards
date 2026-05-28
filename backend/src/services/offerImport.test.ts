/**
 * Tests for offer-import CSV parsing — both the native format and the CJ-raw
 * "Links" export. Locks the dedupe, logo-skip, evergreen-rename, and field
 * mapping rules used by the bulk-import endpoint.
 */
import test from 'node:test';
import assert from 'node:assert';
import { parseCsvCells, detectFormat, parseImportCsv } from './offerImport';

// ─── parseCsvCells — robust CSV parser ────────────────────────────────────────

test('parseCsvCells: simple rows', () => {
  const out = parseCsvCells('a,b,c\n1,2,3\n4,5,6');
  assert.deepStrictEqual(out, [['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']]);
});

test('parseCsvCells: quoted field with comma inside', () => {
  const out = parseCsvCells('a,b\n"hello, world",x');
  assert.deepStrictEqual(out, [['a', 'b'], ['hello, world', 'x']]);
});

test('parseCsvCells: quoted field with embedded newline (CJ-style descriptions)', () => {
  const out = parseCsvCells('a,b\n"line one\nline two",x');
  assert.deepStrictEqual(out, [['a', 'b'], ['line one\nline two', 'x']]);
});

test('parseCsvCells: escaped double-quote inside quoted field', () => {
  // CSV uses "" to represent a literal " inside a quoted field
  const out = parseCsvCells('a\n"she said ""hi"""');
  assert.deepStrictEqual(out, [['a'], ['she said "hi"']]);
});

test('parseCsvCells: handles CRLF line endings', () => {
  const out = parseCsvCells('a,b\r\n1,2\r\n3,4');
  assert.deepStrictEqual(out, [['a', 'b'], ['1', '2'], ['3', '4']]);
});

// ─── detectFormat ─────────────────────────────────────────────────────────────

test('detectFormat: ADVERTISER header → cj-raw', () => {
  assert.strictEqual(
    detectFormat(['ADVERTISER', 'NAME', 'CLICK URL']),
    'cj-raw'
  );
});

test('detectFormat: native headers → native', () => {
  assert.strictEqual(
    detectFormat(['merchant_name', 'title', 'cashback_rate', 'affiliate_link']),
    'native'
  );
});

// ─── parseImportCsv: native format passthrough ────────────────────────────────

test('parseImportCsv: native format trims fields and maps aliases', () => {
  const csv = 'merchant_name,title,rate,link\n  Acme , Spring Sale , 5 , https://e.com/?a=1';
  const { format, rows } = parseImportCsv(csv);
  assert.strictEqual(format, 'native');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].merchant_name, 'Acme');
  assert.strictEqual(rows[0].title, 'Spring Sale');
  assert.strictEqual(rows[0].cashback_rate, '5');
  assert.strictEqual(rows[0].affiliate_link, 'https://e.com/?a=1');
});

// ─── parseImportCsv: CJ-raw transformation ────────────────────────────────────

const CJ_HEADER =
  '"ADVERTISER","TARGETED COUNTRIES","LINK ID","NAME","DESCRIPTION","KEYWORDS",' +
  '"LINK TYPE","THREE MONTH EPC","SEVEN DAY EPC","LAST UDPATED","HTML LINKS",' +
  '"JAVASCRIPT LINKS","CLICK URL","PROMOTION TYPE","COUPON CODE","PROMOTIONAL DATE",' +
  '"PROMOTIONAL END DATE","CATEGORY","ADV_CID","RELATIONSHIP STATUS","LANGUAGE","MOBILE OPTIMIZED"';

const cjRow = (overrides: Partial<Record<string, string>>): string => {
  const base = {
    ADVERTISER: 'Demo Store', NAME: 'Widget Sale', DESCRIPTION: 'Save big',
    'LINK TYPE': 'Banner', 'CLICK URL': 'https://cj.example.com/click1',
    'COUPON CODE': '', ADV_CID: '999111',
  };
  const v = { ...base, ...overrides };
  // Order MUST match CJ_HEADER. Pad the rest with blanks.
  const cols = [
    v.ADVERTISER, '', '', v.NAME, v.DESCRIPTION, '',
    v['LINK TYPE'], '', '', '', '', '',
    v['CLICK URL'], '', v['COUPON CODE'], '', '', '',
    v.ADV_CID, 'Active', 'English', 'Yes',
  ];
  return cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(',');
};

test('CJ-raw: detected, fields mapped, ADV_CID carried as cj_advertiser_id', () => {
  const csv = [CJ_HEADER, cjRow({ NAME: 'Pranks', DESCRIPTION: 'Practical joke products' })].join('\n');
  const { format, rows } = parseImportCsv(csv);
  assert.strictEqual(format, 'cj-raw');
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].merchant_name, 'Demo Store');
  assert.strictEqual(rows[0].title, 'Pranks');
  assert.strictEqual(rows[0].description, 'Practical joke products');
  assert.strictEqual(rows[0].affiliate_link, 'https://cj.example.com/click1');
  assert.strictEqual(rows[0].cj_advertiser_id, '999111');
  // cashback_rate is intentionally blank — derived from merchant CJ data
  assert.strictEqual(rows[0].cashback_rate, '');
});

test('CJ-raw: COUPON CODE becomes "Use code: X" in terms', () => {
  const csv = [CJ_HEADER, cjRow({ NAME: 'Italy Promo', 'COUPON CODE': 'ITALY50' })].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows[0].terms, 'Use code: ITALY50');
});

test('CJ-raw: dedupes duplicate titles within the same merchant', () => {
  // Same promo (USA40) as both Banner and Text Link should collapse to one row;
  // the Text Link variant wins because it's preferred over Banner.
  const csv = [
    CJ_HEADER,
    cjRow({ NAME: 'USA40 Promo', 'LINK TYPE': 'Banner',    'CLICK URL': 'https://cj.example.com/banner' }),
    cjRow({ NAME: 'USA40 Promo', 'LINK TYPE': 'Text Link', 'CLICK URL': 'https://cj.example.com/text' }),
  ].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].affiliate_link, 'https://cj.example.com/text');
});

test('CJ-raw: skips pure-logo rows (NAME="Logo" or NAME=ADVERTISER)', () => {
  const csv = [
    CJ_HEADER,
    cjRow({ NAME: 'Logo' }),                                  // skipped
    cjRow({ NAME: 'Demo Store' }),                            // skipped (bare advertiser)
    cjRow({ NAME: 'Costumes', DESCRIPTION: 'Costumes' }),     // kept
  ].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].title, 'Costumes');
});

test('CJ-raw: rewrites Evergreen Link as "Shop {advertiser}"', () => {
  const csv = [
    CJ_HEADER,
    cjRow({ NAME: 'Evergreen Link for Demo Store', 'LINK TYPE': 'Evergreen Link', DESCRIPTION: 'CJ blurb about evergreen links' }),
  ].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows[0].title, 'Shop Demo Store');
  // Generic CJ description should be cleared on rename.
  assert.strictEqual(rows[0].description, undefined);
});

test('CJ-raw: strips HTML-ish tags from description', () => {
  const csv = [
    CJ_HEADER,
    cjRow({ NAME: 'Italy Promo', DESCRIPTION: '<link>Save up to 70%</link>' }),
  ].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows[0].description, 'Save up to 70%');
});

test('CJ-raw: handles multi-line quoted descriptions (real CJ files)', () => {
  // A real CJ description often contains an embedded newline. The parser must
  // keep both lines as a single field so the row isn't broken in two.
  const csv = [
    CJ_HEADER,
    cjRow({ NAME: 'BC40 Promo', DESCRIPTION: 'Save Up to 70%\nUse Code: BC40' }),
  ].join('\n');
  const { rows } = parseImportCsv(csv);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].title, 'BC40 Promo');
  // Newline collapsed to a space by cleanText
  assert.strictEqual(rows[0].description, 'Save Up to 70% Use Code: BC40');
});
