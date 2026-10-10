// Official rule sets, converted to tables at build time (see tools/sch2json.mjs, tools/xsd2json.py, tools/xsd2model.py).
// Each table is its own file, loaded the first time a document needs it.
export default {
  'en16931-cii': () => import('../build/rules/en16931-cii.json'),
  'en16931-ubl': () => import('../build/rules/en16931-ubl.json'),
  'xrechnung-cii': () => import('../build/rules/xrechnung-cii.json'),
  'xrechnung-ubl': () => import('../build/rules/xrechnung-ubl.json'),
  'fr-ctc-cii': () => import('../build/rules/fr-ctc-cii.json'),
  'fr-ctc-ubl': () => import('../build/rules/fr-ctc-ubl.json'),
  'pint-aunz-shared': () => import('../build/rules/pint-aunz-shared.json'),
  'pint-aunz-aligned': () => import('../build/rules/pint-aunz-aligned.json'),
  structure: () => import('../build/rules/structure.json'),
  fa3: () => import('../build/rules/fa3.json'),
};
