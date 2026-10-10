#!/usr/bin/env python3
"""Poland / FA(3): compare src/xsdcheck.js with real XSD validation (lxml / libxml2) and test the FA(3) writer.

  python3 -I tools/check_pl.py [--per-base N] [--keep]

 1. build/pl/xsd/        the official schema with a local schemaLocation (lxml cannot fetch the imported URL)
 2. build/pl/samples/    every sample of test/pl-samples.mjs written by generateFA3 -> all must be schema-valid
 3. build/pl/official/   example invoices from the Ministry of Finance's public repositories, placeholders filled in
 4. build/pl/mut/        mutated copies of all of the above; verdict of checkXsd (no findings) must equal lxml's verdict
 5. arbitrary well-formed XML: checkXsd and fa3Checks must never throw
Exit code 0 only when everything agrees."""
import sys, os, re, json, glob, copy, random, shutil, hashlib, subprocess, collections, argparse
from lxml import etree

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/home/claude/gh/ksef-docs/faktury/schemy/FA/'
REPOS = ['/home/claude/gh/ksef-client-java', '/home/claude/gh/ksef-client-csharp', '/home/claude/gh/ksef-pdf-generator']
PL = os.path.join(ROOT, 'build/pl')
NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/'
ETD = 'http://crd.gov.pl/xml/schematy/dziedzinowe/mf/2022/01/05/eD/DefinicjeTypy/'
XSI = 'http://www.w3.org/2001/XMLSchema-instance'
XSDNS = 'http://www.w3.org/2001/XMLSchema'
XMLNS = 'http://www.w3.org/XML/1998/namespace'


def setup_xsd():
    d = os.path.join(PL, 'xsd'); os.makedirs(d, exist_ok=True)
    for f in glob.glob(SRC + 'bazowe/*.xsd'): shutil.copy(f, d)
    main = open(SRC + 'schemat_FA(3)_v1-0E.xsd', encoding='utf-8').read()
    patched, n = re.subn(r'schemaLocation="http://crd\.gov\.pl/[^"]*/(StrukturyDanych_v10-0E\.xsd)"', r'schemaLocation="\1"', main)
    assert n == 1, 'import not found in the main schema'
    p = os.path.join(d, 'schemat_FA(3)_v1-0E.xsd'); open(p, 'w', encoding='utf-8').write(patched)
    return etree.XMLSchema(etree.parse(p))


def js(files):
    """run checkXsd + fa3Checks in Node over the files"""
    res = {}
    lst = os.path.join(PL, 'files.txt')
    for i in range(0, len(files), 1500):
        open(lst, 'w').write('\n'.join(files[i:i + 1500]))
        o = subprocess.run(['node', os.path.join(ROOT, 'tools/plrun.mjs'), 'check', '--list', lst], capture_output=True, text=True)
        if o.returncode: print(o.stderr[-3000:]); sys.exit('plrun.mjs failed')
        res.update(json.loads(o.stdout))
    return res


def lxml_errors(schema, path):
    try: doc = etree.parse(path)
    except etree.XMLSyntaxError as e: return None, str(e)
    schema.validate(doc)
    return [(e.line, e.message) for e in schema.error_log], None


# ------------------------------------------------------------------ official examples
NIPS = ['9991002009', '9995366547', '9996455454', '9997544361', '9998633279', '9999722186']
FILL = {'nip': NIPS[0], 'nip_podmiot1': NIPS[0], 'subject2nip': NIPS[1], 'nipOdbiorca': NIPS[1], 'nip_podmiot2': NIPS[1], 'selfInvocingNip': NIPS[2],
        'nip1_podmiot3': NIPS[3], 'nip2_podmiot3': NIPS[4], 'idwew1_podmiot3': NIPS[3] + '-00001', 'idwew2_podmiot3': NIPS[4] + '-00002', 'idWewnetrzne': NIPS[3] + '-00001',
        'invoice_number': '0042', 'invoicing_date': '2026-10-08', 'subject3IdentifierValue': '<NIP>' + NIPS[3] + '</NIP>'}

def official():
    d = os.path.join(PL, 'official'); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    seen = {}; out = []
    for repo in REPOS:
        for f in sorted(glob.glob(repo + '/**/*.xml', recursive=True)):
            raw = open(f, 'rb').read()
            if NS.encode() not in raw: continue
            h = hashlib.md5(raw).hexdigest()
            if h in seen: continue
            seen[h] = f
            text = raw.decode('utf-8-sig')
            missing = [m for m in set(re.findall(r'#([A-Za-z0-9_]+)#', text)) if m not in FILL]
            if missing: print('  unknown placeholders', missing, f)
            text = re.sub(r'#([A-Za-z0-9_]+)#', lambda m: FILL.get(m.group(1), m.group(0)), text)
            rel = os.path.relpath(f, '/home/claude/gh')
            name = '%s__%s' % (rel.split('/')[0].replace('ksef-', ''), os.path.basename(f))
            if os.path.exists(os.path.join(d, name)): name = name.replace('.xml', '_%s.xml' % h[:6])
            p = os.path.join(d, name); open(p, 'w', encoding='utf-8').write(text); out.append((p, rel))
            if 'multiple-Subject3' in name:
                # the template lists NIP and IDWew for the same party; the schema allows only one of them. Second copy: IDWew only
                p2 = p.replace('.xml', '_idwew-only.xml'); open(p2, 'w', encoding='utf-8').write(re.sub(r'\s*<NIP>(%s|%s)</NIP>' % (NIPS[3], NIPS[4]), '', text)); out.append((p2, rel + ' (NIP lines of Podmiot3 removed)'))
    return out


# ------------------------------------------------------------------ mutations
X = lambda n: 'x' * n
LENS = [1, 2, 3, 8, 9, 10, 12, 13, 14, 16, 17, 20, 21, 32, 33, 34, 35, 50, 51, 240, 241, 255, 256, 257, 512, 513, 3500, 3501]
STR = ['', ' ', '  ', '\n', 'x', ' x ', 'x  y', 'x\ty', 'x\ny', ' ', 'x ', ' x', '​', '\U0001F600', 'ąćęłńóśźż', 'a&b<c>"d\'', 'x\u0085y', ' '] \
    + [X(n) for n in LENS] + ['\U0001F600' * n for n in (9, 10, 13, 14, 16, 17, 20, 21, 32, 33, 34, 35, 50, 51, 256, 257, 512, 513)] \
    + [X(n) + ' ' for n in (9, 13, 16, 20, 32, 34, 50, 256, 512, 3500)] + [' ' + X(n) for n in (9, 13, 16, 34, 256, 512, 3500)] + [X(n - 2) + '  ' + 'y' for n in (13, 16, 20, 34, 50, 256, 257, 512, 513)] \
    + ['x ' * 256, 'x ' * 257, 'x\n' * 1750, 'x\n' * 1751, ' ' * 10, ' ' * 34, ' ' * 35, '\t' * 12]
DATE = ['2026-02-30', '2026-02-29', '2024-02-29', '2100-02-29', '2000-02-29', '1900-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-04-30', '2026-06-31', '2026-09-31', '2026-11-31', '2026-01-32',
        '2026-01-00', '2026-12-31', '2026-1-5', '26-01-05', '2026/01/05', '05.01.2026', '20260105', '2026-01-05Z', '2026-01-05+01:00', '2026-01-05T00:00:00', '1899-12-31', '1900-01-01', '2005-12-31', '2006-01-01',
        '2016-06-30', '2016-07-01', '1989-12-31', '1990-01-01', '2050-01-01', '2050-01-02', '2050-12-31', '2051-01-01', '0000-01-01', '0001-01-01', '-2026-01-05', '+2026-01-05', '12026-01-05', '02026-01-05',
        '2026-01-05 ', ' 2026-01-05', '\n2026-01-05\n', '2026-01- 05', '２０２６-01-05', '2026-٠١-05', '9999-12-31', '2026-01-05-01:00', '']
DT = ['2026-02-01T00:00:00', '2026-02-01T00:00:00Z', '2026-02-01T24:00:00Z', '2026-02-01T24:00:00.000Z', '2026-02-01T24:00:01Z', '2026-02-01T24:00:00.5Z', '2026-02-01T23:59:60Z', '2026-02-01T23:60:00Z', '2026-02-01T25:00:00Z',
      '2026-02-01T10:00:00+14:00', '2026-02-01T10:00:00+14:01', '2026-02-01T10:00:00+15:00', '2026-02-01T10:00:00-14:00', '2026-02-01T10:00:00-14:30', '2026-02-01T10:00:00+02:60', '2026-02-01T10:00:00+2:00', '2026-02-01T10:00:00.123Z',
      '2026-02-01T10:00:00.123456789012Z', '2026-02-01T10:00:00.Z', '2026-02-01T10:00:00,5Z', '2026-02-01 10:00:00Z', '2026-02-01T10:00Z', '2026-02-01', '2026-02-30T10:00:00Z', '2026-02-29T10:00:00Z', '2024-02-29T10:00:00Z',
      '2025-08-31T23:59:59Z', '2025-09-01T00:00:00Z', '2025-08-31T23:59:59.999Z', '2025-09-01T00:00:00+00:01', '2025-09-01T01:00:00+01:00', '2025-09-01T00:59:59+01:00', '2025-08-31T22:00:00-02:00', '2025-08-31T21:59:59-02:00',
      '2050-01-01T23:59:59Z', '2050-01-02T00:00:00Z', '2050-01-01T23:59:59.5Z', '2050-01-01T23:59:59-00:01', '2050-01-02T01:59:59+02:00', '2050-01-02T02:00:00+02:00', '2021-09-30T23:59:59Z', '2021-10-01T00:00:00Z',
      '2026-02-01t10:00:00z', ' 2026-02-01T10:00:00Z ', '\n2026-02-01T10:00:00Z', '2026-02-01T10:00:00z', '0000-01-01T00:00:00Z', '-0001-01-01T00:00:00Z', '12026-02-01T10:00:00Z', '2026-02-01T1:00:00Z', '',
      # no time zone, around the bounds 2025-09-01T00:00:00Z / 2050-01-01T23:59:59Z / 2021-10-01T00:00:00Z (comparison with a zoned bound is undecidable within 14 hours)
      '2025-08-31T09:59:59', '2025-08-31T10:00:00', '2025-08-31T23:59:59', '2025-09-01T00:00:00', '2025-09-01T13:59:59', '2025-09-01T14:00:00', '2025-09-01T14:00:01', '2025-09-02T00:00:00', '2025-09-02T14:00:01',
      '2049-12-31T00:00:00', '2050-01-01T09:59:58', '2050-01-01T09:59:59', '2050-01-01T10:00:00', '2050-01-01T23:59:59', '2050-01-02T12:00:00', '2050-01-02T13:59:59', '2050-01-02T14:00:00',
      '2021-09-30T09:00:00', '2021-10-01T00:00:00', '2021-10-01T13:00:00', '2021-10-01T14:00:01', '2021-10-02T00:00:00']
NUM = ['0', '00', '0.0', '0.00', '0.000', '-0', '-0.00', '+0', '1', '+1', '01', '1.0', '1.', '.5', '0.5', '-.5', '+.5', '.', '-', '+', '1e3', '1E3', '1,5', '1 000', '1.234', '1.23', '1.2', '1.20', '1.200',
       '12345678901234567890', '1234567890123456', '12345678901234567', '-1234567890123456.78', '1234567890123456.78', '12345678901234567.8', '999999999999999999', '1000000000000000000',
       '0.12345678', '0.123456789', '0.1234567', '0.123456', '1.1234567', '22.123456', '1234567890123456.123456', '12345678901234567.123456', '12345678901234.12345678', '123456789012345.1', '12345678901234.123456789',
       '100', '100.0', '100.01', '100.000000', '100.0000000', '101', '99.999999', '99.9999999', '-1', '-0.01', '0.01', '-0.000000', '14', '99999999999999', '100000000000000', '00000000000000000001', '127', '128', '255',
       '256', '-128', '-129', '32767', '2147483648', '9223372036854775808', '123456789012345678901234', '1234567890123456789012345', 'NaN', 'INF', '-INF', '0x10', '١٢٣', '１２３', '1_000',
       ' 5 ', '5\n', '\t5', '5 5', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '19', '20', '21', '23', '50.5', '50.50', '050.5', '1.0000001', '0.0000001', '100.5', '-5', '5.', '+5.0']
NIP = ['1234567890', '0234567890', '1004567890', '1014567890', '1104567890', '123456789', '12345678901', '123456789X', ' 1234567890', '1234567890 ', '12345\n67890', '１234567890', '٩٩٩١٠٠٢٠٠٩', '1234567890-12345',
       '1234567890-1234', '1004567890-12345', '1234567890-123456', ' 1234567890-12345 ', '1234567890 -12345']
KSEF = ['9991002009-20260930-0A1B2C-3D4E5F-A7', '9991002009-20260930-0A1B2C3D4E5F-A7', '9991002009-20260930-0a1b2c-3D4E5F-A7', 'M123456789-20260930-0A1B2C-3D4E5F-A7', 'ABC1234567-20260930-0A1B2C-3D4E5F-A7',
        '9991002009-20261330-0A1B2C-3D4E5F-A7', '9991002009-20190930-0A1B2C-3D4E5F-A7', '9991002009-20260930-0A1B2C-3D4E5F-A', '9991002009-30260931-0A1B2C-3D4E5F-A7', '9991002009-20260932-0A1B2C-3D4E5F-A7',
        '0991002009-20260930-0A1B2C-3D4E5F-A7', ' 9991002009-20260930-0A1B2C-3D4E5F-A7 ', '9991002009-20260930-0A1B2C--3D4E5F-A7', '9991002009-21000101-000000-FFFFFF-00', 'AB1234567-20260930-0A1B2C-3D4E5F-A7']
SWIFT = ['WBKPPLPP', 'WBKPPLPPXXX', 'WBKPPLPPXX', 'wbkpplpp', 'WBKPPL', 'WBKPPLP1', '1BKPPLPP', 'WBKPPLPPXXXX', 'WBKPPLPP ', 'WBKPPL99123', 'WBKPPLPP1']
CODE = ['PLN', 'EUR', 'USD', 'XXX', 'pln', 'PL', 'EL', 'GR', 'XI', 'XK', 'QQ', 'DE', 'de', ' PL', 'PL ', 'P L', 'PL\n', 'GB', 'XU', 'VAT', 'KOR', 'ZAL', 'ROZ', 'UPR', 'KOR_ZAL', 'KOR_ROZ', 'vat', ' VAT ', 'V AT', '23', '22', '0 KR', '0  KR', '0\tKR',
        '0 WDT', '0 EX', 'zw', 'ZW', 'oo', 'np I', 'np II', 'np III', ' np  I ', 'GTU_01', 'GTU_13', 'GTU_14', 'WSTO_EE', 'I_42', 'I_63', 'B_MPV_PROWIZJA', 'TT_D', 'date', 'datetime', 'dec', 'int', 'time', 'txt', 'text', ' txt', 'FA', 'FA ', 'fa', 'FA (3)', '1-0E']
MAIL = ['a@b', '@b', 'a@', 'ab', 'a@b@c', 'a b@c d', ' a@b ', 'a@\nb', 'a\n@b', X(250) + '@b.pl', X(251) + '@b.pl', '@', 'a@@', '@@@', 'ą@ż', 'a@b ']
LINK = ['https://a.pl/x?IPKSeF=123abcDEF4567', 'http://a-b.example.com:8080/p/q?a=1&IPKSeF=123abcDEF4567&b=2#frag', 'https://a.pl?IPKSeF=123abcDEF4567', 'ftp://a.pl/x?IPKSeF=123abcDEF4567', 'https://a.pl/x?IPKSeF=123abcDEF456',
        'https://a.pl/x', 'https://a/x?IPKSeF=123abcDEF4567', 'https://a.pl/x?a=1IPKSeF=123abcDEF4567', 'https://a.pl/x y?IPKSeF=123abcDEF4567', 'https://-a.pl/?IPKSeF=123abcDEF4567', 'https://a.pl:123456/?IPKSeF=123abcDEF4567',
        'https://a.pl/?IPKSeF=123abcDEF4567#a b', 'https://a.pl/?IPKSeF=123abcDEF4567#a b', 'HTTPS://a.pl/?IPKSeF=123abcDEF4567', 'https://a.pl/?x#y?IPKSeF=123abcDEF4567', 'https://a.pl/' + X(470) + '?IPKSeF=123abcDEF4567',
        'https://a.pl/' + X(480) + '?IPKSeF=123abcDEF4567', 'https://a.pl/?IPKSeF=123abcDEF4567&', 'https://a.pl/??IPKSeF=123abcDEF4567', 'https://a.b.c.d.pl/é?IPKSeF=000aaaaaaaaaa', '123abcDEF4567', '123abcDEF456', '12aabcDEF4567', '123abcDEF45678', '123-bcDEF4567', ' 123abcDEF4567 ']
MISC = ['123456789', '12345678901234', '1234567890', '12345678', '1234567890123', '0000099999', '000009999', '00000999990', '12+3*', 'abc', 'A', 'ABCDEFGHIJKL', 'ABCDEFGHIJKLM', '+*+*', 'a+b', '1' * 16, '1' * 17, '+48 22 555 01 42', '+48 22 555 01 423']
BY_NAME = {'NIP': NIP + STR[:14], 'IDWew': NIP, 'NrKSeFFaKorygowanej': KSEF, 'NrKSeFFaZaliczkowej': KSEF, 'SWIFT': SWIFT, 'REGON': MISC + NIP, 'KRS': MISC, 'NrVatUE': MISC + CODE, 'LinkDoPlatnosci': LINK, 'IPKSeF': LINK,
           'Email': MAIL, 'EmailPU': MAIL, 'Telefon': MISC + STR, 'TelefonPU': MISC, 'KodKraju': CODE, 'KodUE': CODE, 'KodWaluty': CODE, 'WalutaUmowna': CODE, 'PrefiksPodatnika': CODE + ['', ' ', '\n'], 'RodzajFaktury': CODE,
           'P_12': CODE + NUM, 'P_12Z': CODE, 'GTU': CODE, 'GTUZ': CODE, 'Procedura': CODE, 'ProceduraZ': CODE, 'KodFormularza': CODE, 'DataWytworzeniaFa': DT, 'DataGodzRozpTransportu': DT, 'DataGodzZakTransportu': DT}
EVERYTHING = STR + DATE + DT + NUM + NIP + KSEF + SWIFT + CODE + MAIL + LINK + MISC
XSI_TYPES = ['qt:TZnakowy', 'qt:TZnakowy512', 'qt:TZnakowy20', 'qt:TZnakowy50', 'qt:TKwotowy', 'qt:TKwotowy2', 'qt:TNaturalny', 'qe:TZnakowy', 'qe:TNrNIP', 'qx:string', 'qx:integer', 'qx:byte', 'qx:token', 'qx:decimal', 'qt:TAdres', 'qe:TAdres',
             'qt:TPodmiot1', 'qt:TPodmiot2', 'qt:TPodmiot3', 'qt:Bogus', 'TZnakowy', 'TPodmiot2', 'bogus:TZnakowy', ' qt:TZnakowy ', 'qt:TRodzajFaktury', 'qt:TNumerTelefonu', 'qt:TFormaPlatnosci', 'qt:TDataT', 'qt:TData', 'qe:TData', 'qx:date',
             'qx:anySimpleType', 'qx:anyType', 'qt:TKodWaluty', 'qt:TKluczWartosc', 'qe:TWybor1', 'qe:TWybor1_2', 'qe:TNrREGON', 'qt:TStawkaPodatku', 'qt:TGTU', 'qt:TKodyKrajowUE', 'qe:TKodKraju', 'qe:TKodKrajuWydania',
             'qx:normalizedString', 'qx:positiveInteger', 'qx:nonNegativeInteger', 'qe:TNaturalny', 'qt:TNrRB', 'qt:TIlosci', 'qt:TProcentowy', 'qe:TProcentowy', 'qt:TNaglowek', 'qt:', ':TZnakowy', '', 'xsi:type', 'qe:TNrKRS', 'qe:TAdresEmail', 'qt:TNIPIdWew', 'qt:TGLN']

XSI_BY_NAME = {
    'P_2': ['qt:TZnakowy', 'qt:TRodzajFaktury', 'qt:TNumerTelefonu', 'qt:TGTU', 'qt:TStawkaPodatku', 'qt:TZnakowy512', 'qe:TZnakowy', 'qx:token', 'qt:TOznaczenieProcedury', 'TZnakowy', 'fa:TZnakowy', 'qt:TZnakowy2'],
    'Ilosc': ['qx:integer', 'qx:byte', 'qx:long', 'qx:positiveInteger', 'qx:negativeInteger', 'qt:TFormaPlatnosci', 'qt:TLadunek', 'qe:TKwotaC', 'qe:TKwotaCNieujemna', 'qe:TNaturalny', 'qt:TNaturalny', 'qe:TWybor1', 'qx:decimal', 'qx:nonNegativeInteger', 'qt:TRolaPodmiotu3', 'qx:unsignedByte', 'qe:TCalkowity', 'qe:TMiesiac'],
    'P_1': ['qt:TDataT', 'qt:TData', 'qt:TDataU', 'qe:TData', 'qx:date'], 'P_6': ['qt:TDataT', 'qt:TData'], 'Termin': ['qt:TData', 'qt:TDataT', 'qt:TDataU'], 'DataUmowy': ['qt:TData', 'qt:TDataT', 'qt:TDataU'],
    'NIP': ['qe:TNrNIP', 'qe:TNrPESEL', 'qx:string', 'qe:TNrKRS'], 'Adres': ['qt:TAdres', 'qe:TAdres', 'qt:TPodmiot1'], 'DaneIdentyfikacyjne': ['qt:TPodmiot1', 'qt:TPodmiot2', 'qt:TPodmiot3'],
    'P_7': ['qt:TZnakowy512', 'qt:TZnakowy', 'qt:TZnakowy50'], 'Wartosc': ['qt:TZnakowy', 'qt:TNumerTelefonu', 'qt:TRodzajFaktury'], 'SystemInfo': ['qt:TZnakowy', 'qt:TNumerTelefonu', 'qt:TGTU'],
    'DataWytworzeniaFa': ['qt:TDataCzas', 'qe:TDataCzas', 'qx:dateTime'], 'DataGodzZakTransportu': ['qt:TDataCzas', 'qe:TDataCzas', 'qx:dateTime'], 'REGON': ['qe:TNrREGON', 'qe:TNrKRS', 'qx:string'],
    'P_15': ['qt:TKwotowy', 'qt:TKwotowy2', 'qt:TIlosci', 'qx:decimal', 'qe:TKwota2'], 'P_8B': ['qt:TIlosci', 'qt:TKwotowy'], 'Telefon': ['qt:TNumerTelefonu', 'qt:TZnakowy'], 'Udzial': ['qt:TProcentowy', 'qe:TProcentowy'],
    'KodWaluty': ['qt:TKodWaluty', 'qt:TKodyKrajowUE', 'qe:TKodKraju', 'qx:normalizedString'], 'KodKraju': ['qe:TKodKraju', 'qe:TKodKrajuWydania', 'qt:TKodyKrajowUE'], 'RachunekBankowy': ['qt:TRachunekBankowy', 'qt:TAdres'],
    'NrWierszaFa': ['qt:TNaturalny', 'qe:TNaturalny', 'qx:positiveInteger', 'qx:nonNegativeInteger'], 'Naglowek': ['qt:TNaglowek'], 'DodatkowyOpis': ['qt:TKluczWartosc'], 'P_16': ['qe:TWybor1_2', 'qe:TWybor1', 'qe:TWybor1_3', 'qx:byte'],
    'P_19N': ['qe:TWybor1_2', 'qe:TWybor1', 'qe:TWybor1_3'], 'Email': ['qe:TAdresEmail', 'qx:token'], 'WKom': ['qt:TZnakowy2', 'qt:TZnakowy'], 'KRS': ['qe:TNrKRS', 'qe:TNrNIP'], 'RodzajFaktury': ['qt:TRodzajFaktury', 'qt:TZnakowy']}

# the compiled model is used here only to pick interesting values (lengths, digits, bounds, enumerations at their limits); the verdict still comes from lxml
MODEL = json.load(open(os.path.join(ROOT, 'build/rules/fa3.json'), encoding='utf-8'))
def find_particle(p, name):
    if p is None: return None
    if isinstance(p[0], str): return p if p[0] == name else None
    if p[0] == 0: return None
    for c in p[3]:
        r = find_particle(c, name)
        if r: return r
    return None

def model_type(e):
    names = [etree.QName(x).localname for x in reversed([e] + list(e.iterancestors()))]
    g = MODEL['el'].get('0|' + names[0])
    if not g: return None
    tid = g[0]
    for n in names[1:]:
        p = find_particle(MODEL['t'][tid].get('c'), n)
        if p is None: return None
        tid = p[1]
    t = MODEL['t'][tid]
    if t.get('x') == 3: t = MODEL['t'][t['s']]
    return t if 'b' in t else None

def boundary_values(t, rnd):
    v = []
    if 'e' in t: e = t['e']; v += rnd.sample(e, min(len(e), 6)) + [e[0] + 'x', e[0].lower(), e[0].upper(), ' ' + e[0], e[-1] + ' ', e[0] + '\n', e[0].replace(' ', '  '), '0' + e[0], e[0] + '.0', '+' + e[0]]
    for k in ('l', 'nl', 'xl'):
        if k in t:
            for n in (t[k] - 1, t[k], t[k] + 1):
                if n >= 0: v += ['x' * n, '7' * n, '\U0001F600' * n, ('x' * n + ' ') if n else ' ', ('x ' * n)[:n], 'ż' * n]
    if t['b'] in ('decimal', 'integer'):
        td = t.get('td', 20); fd = t.get('fd', 0 if t['b'] == 'integer' else 3)
        for i in (td - fd - 1, td - fd, td - fd + 1):
            for f in (0, fd - 1, fd, fd + 1):
                if i >= 1 and f >= 0: v += ['9' * i + ('.' + '9' * f if f else ''), '-' + '1' * i + ('.' + '1' * f if f else ''), '0' * 3 + '9' * i + ('.' + '9' * f + '000' if f else '')]
        for k in ('mi', 'ma', 'me', 'xe'):
            if k in t:
                b = int(float(t[k])); v += [str(b), str(b - 1), str(b + 1), '%d.0' % b, '%d.000001' % b, '%d.5' % (b - 1), '+%d' % b, '0%d' % b if b >= 0 else '-0%d' % -b]
    if t['b'] == 'date':
        import datetime
        for k in ('mi', 'ma', 'me', 'xe'):
            if k in t:
                d = datetime.date.fromisoformat(t[k]); v += [str(d), str(d - datetime.timedelta(days=1)), str(d + datetime.timedelta(days=1)), str(d) + 'Z', ' ' + str(d) + ' ']
    return v


def classify(text):
    t = (text or '').strip()
    if re.fullmatch(r'\d{4}-\d\d-\d\dT.*', t): return DT
    if re.fullmatch(r'\d{4}-\d\d-\d\d', t): return DATE
    if re.fullmatch(r'[+-]?\d+(\.\d+)?', t): return NUM
    return STR

def size(e): return sum(1 for _ in e.iter())

def mutate(doc, rnd):
    """apply one random change; returns its name or None when it could not be applied"""
    root = doc.getroot()
    els = [e for e in root.iter() if isinstance(e.tag, str)]
    leaves = [e for e in els if len(e) == 0]; parents = [e for e in els if len(e) > 0]; inner = els[1:]
    kind = rnd.choice(['value-model', 'value-model', 'value-model', 'xsi-named', 'delete', 'delete', 'dup', 'dup', 'dupN', 'swap', 'swap', 'move', 'rename', 'insert', 'value-any', 'value-any', 'value-typed', 'value-typed', 'value-typed', 'value-typed', 'value-name', 'value-name',
                       'value-edit', 'value-edit', 'attr-add', 'attr-xsi', 'attr-xsi', 'attr-alter', 'text-in-parent', 'comment', 'child-in-leaf', 'cdata', 'empty', 'root'])
    if kind == 'delete':
        e = rnd.choice(inner); e.getparent().remove(e)
    elif kind == 'dup':
        e = rnd.choice(inner); p = e.getparent(); c = copy.deepcopy(e); c.tail = None; p.insert(p.index(e) + 1, c)
    elif kind == 'dupN':
        small = [e for e in inner if size(e) <= 12]; e = rnd.choice(small); p = e.getparent(); n = rnd.choice([2, 3, 9, 10, 19, 20, 30, 49, 50, 99, 100, 101, 999, 1000])
        if n > 120 and size(e) > 3: n = rnd.choice([99, 100, 101])
        for _ in range(n): c = copy.deepcopy(e); c.tail = None; p.insert(p.index(e) + 1, c)
        kind = 'dupN'
    elif kind == 'swap':
        e = rnd.choice([x for x in parents if len(x) >= 2]); i = rnd.randrange(len(e) - 1); a, b = e[i], e[i + 1]
        if a.tag == b.tag or not isinstance(a.tag, str) or not isinstance(b.tag, str): return None
        e.remove(b); e.insert(i, b)
    elif kind == 'move':
        e = rnd.choice(inner); p = e.getparent()
        if len(p) < 2: return None
        i = p.index(e); j = rnd.randrange(len(p))
        if i == j: return None
        p.remove(e); p.insert(j, e)
    elif kind == 'rename':
        e = rnd.choice(inner); q = etree.QName(e); how = rnd.randrange(5)
        if how == 0: e.tag = '{%s}X%s' % (q.namespace, q.localname)
        elif how == 1: e.tag = q.localname
        elif how == 2: e.tag = '{%s}%s' % (ETD, q.localname)
        elif how == 3: e.tag = '{%s}%s' % (q.namespace, q.localname.lower() if q.localname.lower() != q.localname else q.localname.upper())
        else: e.tag = rnd.choice(inner).tag
    elif kind == 'insert':
        src = copy.deepcopy(rnd.choice(leaves)); src.tail = None; p = rnd.choice(parents); p.insert(rnd.randrange(len(p) + 1), src)
    elif kind in ('value-any', 'value-typed', 'value-name'):
        if kind == 'value-name':
            c = [e for e in leaves if etree.QName(e).localname in BY_NAME]
            if not c: return None
            e = rnd.choice(c); pool = BY_NAME[etree.QName(e).localname]
        else:
            e = rnd.choice(leaves); pool = EVERYTHING if kind == 'value-any' else classify(e.text)
        v = rnd.choice(pool)
        if v == (e.text or ''): return None
        e.text = v
    elif kind == 'value-model':
        e = rnd.choice(leaves); t = model_type(e)
        if t is None: return None
        pool = boundary_values(t, rnd)
        if not pool: return None
        v = rnd.choice(pool)
        if v == (e.text or ''): return None
        e.text = v
    elif kind == 'xsi-named':
        c = [e for e in els if etree.QName(e).localname in XSI_BY_NAME]
        if not c: return None
        e = rnd.choice(c); e.set('{%s}type' % XSI, rnd.choice(XSI_BY_NAME[etree.QName(e).localname]))
        if len(e) == 0 and rnd.random() < 0.3: e.text = rnd.choice(['VAT', '1', '2', '14', '-1', '300', 'x' * 17, 'x' * 300, '2026-01-01', '1995-01-01', '2010-01-01', '12345678901', '1.5', '100.123456', '0000099999', 'PL', 'DE', 'GTU_01', '8', ''])
    elif kind == 'value-edit':
        e = rnd.choice([x for x in leaves if x.text]); t = e.text; mid = len(t) // 2
        e.text = rnd.choice([t + ' ', ' ' + t, t + '\n', '\t' + t, t + 'x', t[:-1], t.upper(), t.lower(), t + t, t[:mid] + '\t' + t[mid:], t[:mid] + '  ' + t[mid:], t + ' ', t + '​', '0' + t, t + '0', '+' + t, '-' + t, t + '.0', t + '.',
                             t.replace('.', ','), t.replace('-', '/'), t[::-1], t * 40, ' ' + t + ' ', t.replace(' ', ''), t.replace(' ', '  ')])
        if e.text == t: return None
    elif kind == 'attr-add':
        e = rnd.choice(els); name, val = rnd.choice([('foo', '1'), ('{%s}lang' % XMLNS, 'pl'), ('{%s}space' % XMLNS, 'preserve'), ('{%s}foo' % NS, 'x'), ('kodSystemowy', 'FA (3)'), ('Typ', 'txt'), ('{%s}foo' % XSI, '1'),
                                                    ('{%s}schemaLocation' % XSI, NS + ' schemat.xsd'), ('{%s}noNamespaceSchemaLocation' % XSI, 'schemat.xsd'), ('type', 't:TZnakowy'), ('nil', 'true'), ('id', 'a1')])
        if e.get(name) is not None: return None
        e.set(name, val)
    elif kind == 'attr-xsi':
        e = rnd.choice(els)
        if rnd.random() < 0.25: e.set('{%s}nil' % XSI, rnd.choice(['true', 'false', '1', '0', 'x', '', ' true ']))
        else: e.set('{%s}type' % XSI, rnd.choice(XSI_TYPES))
    elif kind == 'attr-alter':
        c = [e for e in els if len(e.attrib)]
        if not c: return None
        e = rnd.choice(c); name = rnd.choice(list(e.attrib)); v = e.get(name); how = rnd.randrange(9)
        if how == 0: del e.attrib[name]
        elif name == 'Typ': e.set(name, rnd.choice(['date', 'datetime', 'dec', 'int', 'time', 'txt', 'text', ' txt', 'TXT', 'txt ', '']))
        else: e.set(name, [v + ' ', ' ' + v, v + 'x', '', v.lower(), v.replace(' ', ''), v.replace(' ', '  '), 'FA (2)', v.replace(' ', '\t'), 'dec'][how])
        if e.get(name) == v: return None
    elif kind == 'text-in-parent':
        e = rnd.choice(parents); v = rnd.choice(['x', ' ', '\n\t ', ' ', ' x ', '0', '​', '　', '\u0085'])
        if rnd.random() < 0.5: e.text = (e.text or '') + v
        else: c = rnd.choice(list(e)); c.tail = (c.tail or '') + v
    elif kind == 'comment':
        e = rnd.choice(els); node = etree.Comment(' note ') if rnd.random() < 0.6 else etree.ProcessingInstruction('eos', 'x="1"')
        if len(e) == 0 and e.text and rnd.random() < 0.7: mid = len(e.text) // 2; node.tail = e.text[mid:]; e.text = e.text[:mid]; e.append(node)
        else: e.insert(rnd.randrange(len(e) + 1), node)
    elif kind == 'child-in-leaf':
        e = rnd.choice(leaves); c = etree.SubElement(e, rnd.choice([e.tag, '{%s}P_1' % NS, 'x'])); c.text = rnd.choice(['x', '', '1'])
    elif kind == 'cdata':
        e = rnd.choice(els)
        if len(e) == 0: e.text = etree.CDATA(e.text or rnd.choice(['', ' ']))
        else: e.text = etree.CDATA(rnd.choice([' ', '\n', 'x', '']))
    elif kind == 'empty':
        e = rnd.choice(els)
        for c in list(e): e.remove(c)
        e.text = rnd.choice([None, '', ' ', '\n'])
    elif kind == 'root':
        how = rnd.randrange(5)
        if how == 0: root.tag = '{%s}Faktura' % 'http://crd.gov.pl/wzor/2023/06/29/12648/'
        elif how == 1: root.tag = 'Faktura'
        elif how == 2: root.tag = '{%s}faktura' % NS
        elif how == 3: root.tag = '{%s}Fa' % NS
        else: root.tag = '{%s}Naglowek' % NS
    return kind


# ------------------------------------------------------------------ documented deviations of libxml2 from XML Schema
# W  libxml2 rejects xs:dateTime values with leading white space (and trailing white space when there is no time zone),
#    although whiteSpace is fixed to "collapse" for xs:dateTime. checkXsd follows the specification and accepts them.
# T  an xs:dateTime without a time zone cannot be ordered against a bound with a time zone when the two are within 14 hours
#    (XML Schema Part 2, 3.2.7.4): the value is then neither >= minInclusive nor <= maxInclusive. checkXsd reports it;
#    libxml2 compares such values as if they were UTC.
# Q  libxml2 does not collapse white space in an xsi:type value (" p:Type " is then "not declared"), although xsi:type is an
#    xs:QName, whose whiteSpace is fixed to "collapse". checkXsd follows the specification.
DT_BOUNDS = {'DataWytworzeniaFa': ('2025-09-01T00:00:00', '2050-01-01T23:59:59'), 'DataGodzRozpTransportu': ('2021-10-01T00:00:00', '2050-01-01T23:59:59'), 'DataGodzZakTransportu': ('2021-10-01T00:00:00', '2050-01-01T23:59:59')}

def explain(schema, path, js_valid):
    """If a disagreement is completely explained by W, T and/or Q return the labels, else None. The check is independent of
    checkXsd: the affected values are rewritten (white space removed; undecidable value replaced by one that is clearly out
    of range) and lxml must then give the verdict that checkXsd gave for the original file."""
    import datetime
    doc = etree.parse(path, etree.XMLParser(strip_cdata=False)); why = set()
    for e in doc.iter():
        if not isinstance(e.tag, str): continue
        q = e.get('{%s}type' % XSI)
        if q is not None and q != q.strip(' \t\n\r') and q.strip(' \t\n\r'): why.add('Q'); e.set('{%s}type' % XSI, q.strip(' \t\n\r'))
        if etree.QName(e).localname not in DT_BOUNDS or len(e): continue
        raw = e.text or ''; v = raw.strip(' \t\n\r')
        if raw != v: why.add('W'); e.text = v
        if re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?', v):
            try: t = datetime.datetime.strptime(v[:19], '%Y-%m-%dT%H:%M:%S')
            except ValueError: continue
            for b in DT_BOUNDS[etree.QName(e).localname]:
                if abs((t - datetime.datetime.strptime(b, '%Y-%m-%dT%H:%M:%S')).total_seconds()) <= 14 * 3600 + 1: why.add('T'); e.text = '1999-01-01T00:00:00Z'
    if not why: return None
    return '+'.join(sorted(why)) if schema.validate(doc) == js_valid else None


def prefixed(text):
    """the same document with a namespace prefix on every element instead of a default namespace"""
    text = re.sub(r'<(/?)([A-Za-z_][\w.\-]*)', r'<\1fa:\2', text)
    return text.replace('xmlns="%s"' % NS, 'xmlns:fa="%s"' % NS, 1)

def with_prefixes(text):
    """declare the prefixes that the xsi:type mutations use on the root element"""
    return re.sub(r'<((?:fa:)?Faktura)\b', lambda m: '<%s xmlns:qt="%s" xmlns:qe="%s" xmlns:qx="%s"' % (m.group(1), NS, ETD, XSDNS), text, count=1)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--per-base', type=int, default=160); ap.add_argument('--seed', type=int, default=20261010); ap.add_argument('--keep', action='store_true', help='keep build/pl/mut afterwards')
    a = ap.parse_args()
    os.makedirs(PL, exist_ok=True)
    schema = setup_xsd(); failures = 0
    print('1. schema: build/pl/xsd/ (patched import), lxml %s, libxml2 %s' % (etree.__version__, '.'.join(map(str, etree.LIBXML_VERSION))))

    # ---- 2. generated samples
    shutil.rmtree(os.path.join(PL, 'samples'), ignore_errors=True)
    o = subprocess.run(['node', os.path.join(ROOT, 'tools/plrun.mjs'), 'gen'], capture_output=True, text=True)
    if o.returncode: print(o.stderr); sys.exit('sample generation failed')
    samples = sorted(glob.glob(os.path.join(PL, 'samples/*.xml'))) + [os.path.join(ROOT, 'test/pl-kitchen-sink.xml')]
    J = js(samples); bad = 0
    for f in samples:
        errs, perr = lxml_errors(schema, f); r = J[f]
        ok = not perr and not errs and r.get('xsd') == [] and not r.get('threw') and (r.get('checks') == [] or 'kitchen' in f)
        if not ok: bad += 1; print('   PROBLEM', os.path.basename(f), 'lxml:', (perr or errs)[:2], 'checkXsd:', r.get('xsd', r)[:2], 'fa3Checks:', r.get('checks'))
    print('2. generated samples + kitchen sink: %d files, %d valid for lxml, checkXsd and fa3Checks without findings (fa3Checks not required to be silent on the kitchen sink): %s' % (
        len(samples), sum(1 for f in samples if lxml_errors(schema, f) == ([], None)), 'OK' if not bad else '%d PROBLEMS' % bad))
    failures += bad

    # ---- 3. official examples
    off = official(); J = js([p for p, _ in off]); valid_off = []
    print('3. official examples (placeholders filled): %d files' % len(off))
    for p, rel in off:
        errs, perr = lxml_errors(schema, p); r = J[p]; xv = not perr and not errs; jv = r.get('xsd') == []
        if xv: valid_off.append(p)
        if xv != jv or r.get('threw') or perr: failures += 1
        print('   %-7s lxml=%-7s checkXsd=%-7s fa3Checks=%s  %s' % ('agree' if xv == jv else 'DIFFER', 'valid' if xv else 'INVALID', 'valid' if jv else 'INVALID', [c[0] for c in r.get('checks', [])] or 'none', rel))
        if not xv: print('           lxml:', (perr or errs[0][1])[:230]); print('           checkXsd:', r['xsd'][0][1][:230] if r.get('xsd') else r)
        for c in r.get('checks', []): print('           %s (%s): %s' % (c[0], c[1], c[2]))

    # ---- 4. mutations
    rnd = random.Random(a.seed)
    mut = os.path.join(PL, 'mut'); shutil.rmtree(mut, ignore_errors=True); os.makedirs(mut)
    bases = []
    for f in samples + valid_off:
        text = open(f, encoding='utf-8-sig').read()
        bases.append((os.path.basename(f), with_prefixes(text)))
        if 'kitchen' in f or 'plStandard' in f: bases.append(('prefixed-' + os.path.basename(f), with_prefixes(prefixed(text))))
    muts = []
    parser = etree.XMLParser(strip_cdata=False, resolve_entities=False)
    for name, text in bases:
        base = etree.fromstring(text.encode('utf-8'), parser).getroottree()
        n = a.per_base * (6 if 'kitchen' in name else 1); made = 0; tries = 0
        while made < n and tries < n * 5:
            tries += 1
            doc = copy.deepcopy(base); kinds = []
            for _ in range(2 if rnd.random() < 0.12 else 1):
                try: k = mutate(doc, rnd)
                except (IndexError, ValueError, TypeError): k = None
                if k: kinds.append(k)
            if not kinds: continue
            p = os.path.join(mut, '%05d.xml' % len(muts))
            try: doc.write(p, xml_declaration=True, encoding='UTF-8')
            except Exception: continue
            muts.append((p, '+'.join(kinds), name)); made += 1
    J = js([m[0] for m in muts])
    stat = collections.Counter(); per_kind = collections.defaultdict(collections.Counter); diff = []; explained = []; threw = []; nvalid = 0; unparsable = 0
    for p, kind, name in muts:
        errs, perr = lxml_errors(schema, p); r = J[p]
        if perr or 'parse' in r:
            unparsable += 1
            if bool(perr) != ('parse' in r): diff.append((p, kind, name, 'well-formedness: lxml %r / slimdom %r' % (perr, r.get('parse')), ''))
            continue
        if r.get('threw'): threw.append((p, r['threw'])); continue
        xv = not errs; jv = r['xsd'] == []; nvalid += xv
        key = 'agree' if xv == jv else ('checkXsd false alarm' if xv else 'checkXsd miss')
        stat[key] += 1; per_kind[kind.split('+')[0]][key] += 1
        per_kind[kind.split('+')[0]]['valid' if xv else 'invalid'] += 1
        if xv != jv:
            why = explain(schema, p, jv)
            if why: stat[key] -= 1; per_kind[kind.split('+')[0]][key] -= 1; stat['explained ' + why] += 1; explained.append((p, why, errs[0][1] if errs else 'valid', r['xsd'][0][1] if r['xsd'] else 'valid'))
            else: diff.append((p, kind, name, errs[0][1] if errs else 'valid', r['xsd'][0][1] if r['xsd'] else 'valid'))
    stat = +stat; total = sum(stat.values())
    print('4. mutations: %d files from %d base documents (%d not well-formed, skipped); %d valid / %d invalid for lxml' % (len(muts), len(bases), unparsable, nvalid, total - nvalid))
    print('   verdict agreement: %d of %d (%s)' % (stat['agree'], total, dict(stat)))
    for k in sorted(per_kind): c = per_kind[k]; print('     %-15s valid %4d  invalid %4d  agree %4d%s' % (k, c['valid'], c['invalid'], c['agree'], ''.join('  %s %d' % (x, c[x]) for x in ('checkXsd false alarm', 'checkXsd miss') if c[x] > 0)))
    if explained:
        print('   explained residual (libxml2 deviates from the XML Schema specification, see W, T and Q in this script): %d' % len(explained))
        for e in explained[:6]: print('     %s %s\n        lxml:     %s\n        checkXsd: %s' % (e[1], os.path.basename(e[0]), e[2][:200].replace('\n', ' '), e[3][:200]))
    for d in diff[:40]: print('   DISAGREE', os.path.basename(d[0]), d[1], d[2], '\n      lxml:    ', d[3][:300], '\n      checkXsd:', d[4][:300])
    for t in threw[:10]: print('   THREW', t)
    json.dump([list(d) for d in diff], open(os.path.join(PL, 'disagree.json'), 'w'), indent=1, ensure_ascii=False)
    failures += len(diff) + len(threw)

    # ---- 4b. occurrence limits: exactly maxOccurs and maxOccurs + 1 copies of every repeatable element of the kitchen sink
    occ = os.path.join(PL, 'occ'); shutil.rmtree(occ, ignore_errors=True); os.makedirs(occ)
    base = etree.parse(os.path.join(ROOT, 'test/pl-kitchen-sink.xml')); files = []; seen = set()
    for e in base.getroot().iter():
        if not isinstance(e.tag, str) or e.getparent() is None: continue
        path = base.getpath(e.getparent()) + '/' + etree.QName(e).localname
        if path in seen: continue
        seen.add(path)
        names = [etree.QName(x).localname for x in reversed(list(e.iterancestors()))]; tid = MODEL['el']['0|' + names[0]][0]
        for n in names[1:]: tid = find_particle(MODEL['t'][tid].get('c'), n)[1]
        part = find_particle(MODEL['t'][tid].get('c'), etree.QName(e).localname); mx = part[3]
        if mx in (1, -1) or mx * size(e) > 600000: continue
        have = sum(1 for x in e.getparent() if x.tag == e.tag)
        for total in (mx, mx + 1):
            doc = copy.deepcopy(base); t = doc.xpath(base.getpath(e))[0]; par = t.getparent()
            for _ in range(total - have): c = copy.deepcopy(t); c.tail = None; par.insert(par.index(t) + 1, c)
            f = os.path.join(occ, '%s_%d.xml' % (etree.QName(e).localname + '_' + hashlib.md5(path.encode()).hexdigest()[:4], total)); doc.write(f, xml_declaration=True, encoding='UTF-8'); files.append((f, total == mx))
    J = js([f for f, _ in files]); bad = 0
    for f, expect in files:
        errs, perr = lxml_errors(schema, f); xv = not perr and not errs; jv = J[f].get('xsd') == []
        if xv != jv or J[f].get('threw'): bad += 1; print('   DISAGREE', os.path.basename(f), 'lxml:', (perr or errs[:1]), 'checkXsd:', J[f].get('xsd', J[f])[:1])
        elif xv != expect: print('   note: %s is %s for both (the model said maxOccurs would make it %s)' % (os.path.basename(f), 'valid' if xv else 'invalid', 'valid' if expect else 'invalid'))
    print('4b. occurrence limits: %d files (maxOccurs and maxOccurs + 1 copies of %d repeatable elements): %d agree, %d valid for lxml' % (len(files), len(files) // 2, len(files) - bad, sum(1 for f, _ in files if lxml_errors(schema, f) == ([], None))))
    failures += bad
    if not a.keep: shutil.rmtree(occ, ignore_errors=True)

    # ---- 5. never throw
    extra = os.path.join(PL, 'odd'); shutil.rmtree(extra, ignore_errors=True); os.makedirs(extra)
    odd = {'empty-root.xml': '<a/>', 'no-ns.xml': '<Faktura/>', 'only-root.xml': '<Faktura xmlns="%s"/>' % NS, 'text-root.xml': '<Faktura xmlns="%s">tekst</Faktura>' % NS,
           'deep-known.xml': '<Faktura xmlns="%s">' % NS + '<Fa>' * 400 + '</Fa>' * 400 + '</Faktura>', 'deep-unknown.xml': '<a>' * 400 + '</a>' * 400,
           'doctype.xml': '<!DOCTYPE Faktura [<!ENTITY e "x">]><Faktura xmlns="%s"><Naglowek>&e;</Naglowek></Faktura>' % NS, 'pi.xml': '<?xml version="1.0"?><?p x?><!-- c --><Faktura xmlns="%s"><?p y?></Faktura><!-- d -->' % NS,
           'fa2.xml': '<Faktura xmlns="http://crd.gov.pl/wzor/2023/06/29/12648/"><Naglowek/></Faktura>', 'attrs.xml': '<Faktura xmlns="%s" xmlns:xsi="%s" xsi:type="x:y" xsi:nil="maybe" a="1"><Fa xsi:type=""/><Fa xsi:type=":"/></Faktura>' % (NS, XSI),
           'wide.xml': '<Faktura xmlns="%s"><Fa>%s</Fa></Faktura>' % (NS, '<FaWiersz><NrWierszaFa>1</NrWierszaFa></FaWiersz>' * 10001), 'html.xml': '<html><body><p>Hello</p></body></html>'}
    files = []
    for n, t in odd.items(): p = os.path.join(extra, n); open(p, 'w', encoding='utf-8').write(t); files.append(p)
    files += sorted(glob.glob(os.path.join(ROOT, 'build/samples/*.xml')))[:40]
    J = js(files); t = [(f, r['threw']) for f, r in J.items() if r.get('threw')]
    print('5. never throws: %d other well-formed XML files (odd shapes, CII / UBL invoices): %d threw; %d of the %d mutated files threw' % (len(files), len(t), len(threw), len(muts)))
    for x in t: print('   THREW', x)
    failures += len(t)
    if not a.keep: shutil.rmtree(mut, ignore_errors=True)
    print('RESULT:', 'all checks passed' if not failures else '%d problem(s)' % failures)
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
