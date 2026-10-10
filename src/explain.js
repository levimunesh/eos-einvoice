// Plain-language explanations for official rule identifiers.
// Each entry: [what is wrong, how to fix it, form field it relates to (optional)].
const R = {
  'BR-01': ['The invoice does not say which standard it follows.', 'Every e-invoice must carry a specification identifier (BT-24). This tool adds it for you; a file from another program needs to be exported again.'],
  'BR-02': ['The invoice number is missing.', 'Enter a unique invoice number.', 'number'],
  'BR-03': ['The invoice date is missing.', 'Enter the date the invoice was issued.', 'issueDate'],
  'BR-04': ['The document type is missing.', 'Choose whether this is an invoice, a credit note or a correction.', 'typeCode'],
  'BR-05': ['The currency is missing.', 'Choose the invoice currency, usually EUR.', 'currency'],
  'BR-06': ['Your business name is missing.', 'Enter the seller name exactly as registered.', 'seller.name'],
  'BR-07': ['The customer name is missing.', 'Enter the buyer name.', 'buyer.name'],
  'BR-08': ['Your address is missing.', 'Enter the seller address.', 'seller.street'],
  'BR-09': ['Your address has no country.', 'Choose the seller country.', 'seller.country'],
  'BR-10': ['The customer address is missing.', 'Enter the buyer address.', 'buyer.street'],
  'BR-11': ['The customer address has no country.', 'Choose the buyer country.', 'buyer.country'],
  'BR-12': ['The sum of all line amounts is missing.', 'This total is calculated from the lines. Check that every line has a quantity and a price.', 'lines'],
  'BR-13': ['The total without VAT is missing.', 'This total is calculated from the lines. Check that every line has a quantity and a price.', 'lines'],
  'BR-14': ['The total with VAT is missing.', 'This total is calculated from the lines. Check that every line has a quantity and a price.', 'lines'],
  'BR-15': ['The amount due is missing.', 'This amount is calculated from the lines. Check that every line has a quantity and a price.', 'lines'],
  'BR-16': ['The invoice has no lines.', 'Add at least one line with what you sold.', 'lines'],
  'BR-17': ['A separate payee is named without a name.', 'If someone other than the seller receives the payment, give that payee a name.'],
  'BR-18': ['The tax representative has no name.', 'Give the seller’s tax representative a name, or remove the representative.'],
  'BR-19': ['The tax representative has no address.', 'Add the tax representative’s postal address.'],
  'BR-20': ['The tax representative’s address has no country.', 'Add the country to the tax representative’s address.'],
  'BR-21': ['A line has no line number.', 'Number every line, for example 1, 2, 3.', 'lines'],
  'BR-22': ['A line has no quantity.', 'Enter a quantity on every line.', 'lines'],
  'BR-23': ['A line has no unit.', 'Choose a unit on every line, such as piece or hour.', 'lines'],
  'BR-24': ['A line has no net amount.', 'Enter quantity and unit price so the line amount can be calculated.', 'lines'],
  'BR-25': ['A line has no item name.', 'Describe what was sold on every line.', 'lines'],
  'BR-26': ['A line has no unit price.', 'Enter the net price per unit on every line.', 'lines'],
  'BR-27': ['A unit price is negative.', 'Unit prices may not be negative. For a refund, use a credit note or a negative quantity.', 'lines'],
  'BR-28': ['A gross price is negative.', 'The price before discount may not be negative.', 'lines'],
  'BR-29': ['The service period ends before it starts.', 'Make the period end date the same as or later than the start date.', 'periodStart'],
  'BR-30': ['A line’s period ends before it starts.', 'Make the line period end date the same as or later than its start date.', 'lines'],
  'BR-31': ['A discount has no amount.', 'Enter the amount of every document-level discount.', 'allowances'],
  'BR-32': ['A discount has no VAT category.', 'Choose the VAT category the discount belongs to.', 'allowances'],
  'BR-33': ['A discount has no reason.', 'Say what the discount is for, for example “loyalty discount”.', 'allowances'],
  'BR-36': ['A surcharge has no amount.', 'Enter the amount of every document-level surcharge.', 'allowances'],
  'BR-37': ['A surcharge has no VAT category.', 'Choose the VAT category the surcharge belongs to.', 'allowances'],
  'BR-38': ['A surcharge has no reason.', 'Say what the surcharge is for, for example “delivery”.', 'allowances'],
  'BR-41': ['A line discount has no amount.', 'Enter the amount of the line discount.'],
  'BR-42': ['A line discount has no reason.', 'Say what the line discount is for.'],
  'BR-43': ['A line surcharge has no amount.', 'Enter the amount of the line surcharge.'],
  'BR-44': ['A line surcharge has no reason.', 'Say what the line surcharge is for.'],
  'BR-45': ['A VAT summary row has no taxable amount.', 'Each VAT rate needs the net amount it applies to. Export the invoice again from the program that made it.'],
  'BR-46': ['A VAT summary row has no VAT amount.', 'Each VAT rate needs its VAT amount, even if it is 0.'],
  'BR-47': ['A VAT summary row has no VAT category.', 'Each VAT summary row needs a category such as S (standard) or E (exempt).'],
  'BR-48': ['A VAT summary row has no rate.', 'Give each VAT summary row its percentage. Use 0 for exempt sales.'],
  'BR-49': ['The payment method is missing.', 'Choose how the invoice is to be paid, for example SEPA credit transfer.', 'payment.meansCode'],
  'BR-50': ['Bank transfer is selected but the account is missing.', 'Enter the IBAN the customer should pay to.', 'payment.iban'],
  'BR-51': ['A full card number is shown.', 'Never put a complete card number on an invoice. Show at most the first 6 and last 4 digits.'],
  'BR-52': ['An attached document has no reference.', 'Give every supporting document an identifier or file name.'],
  'BR-53': ['A second currency for VAT is named without its VAT total.', 'If VAT is reported in another currency, add the VAT total in that currency.'],
  'BR-54': ['An item attribute is incomplete.', 'Each item attribute needs both a name and a value, for example “Colour: red”.'],
  'BR-55': ['A reference to an earlier invoice has no invoice number.', 'Enter the number of the invoice this document refers to.', 'precedingNumber'],
  'BR-56': ['The tax representative has no VAT ID.', 'Add the VAT ID of the seller’s tax representative.'],
  'BR-57': ['The delivery address has no country.', 'Add the country to the delivery address.'],
  'BR-61': ['Bank transfer is selected but the account is missing.', 'Enter the IBAN the customer should pay to.', 'payment.iban'],
  'BR-62': ['Your e-invoice address has no type.', 'An electronic address needs a scheme, for example “EM” for email.', 'seller.email'],
  'BR-63': ['The customer’s e-invoice address has no type.', 'An electronic address needs a scheme, for example “EM” for email.', 'buyer.email'],
  'BR-64': ['An item number such as a GTIN has no type.', 'Say which numbering scheme the item identifier uses, for example 0160 for GTIN.'],
  'BR-65': ['An item classification has no type.', 'Say which classification scheme is used.'],
  'BR-CO-03': ['Two ways of stating the VAT date are used at once.', 'Give either a VAT point date or a VAT date code, not both.'],
  'BR-CO-04': ['A line has no VAT category.', 'Choose a VAT category on every line.', 'lines'],
  'BR-CO-05': ['A discount’s reason text and reason code contradict each other.', 'Make the reason text match the reason code, or remove one of them.'],
  'BR-CO-06': ['A surcharge’s reason text and reason code contradict each other.', 'Make the reason text match the reason code, or remove one of them.'],
  'BR-CO-07': ['A line discount’s reason text and code contradict each other.', 'Make the reason text match the reason code, or remove one of them.'],
  'BR-CO-08': ['A line surcharge’s reason text and code contradict each other.', 'Make the reason text match the reason code, or remove one of them.'],
  'BR-CO-09': ['A VAT ID does not start with a country code.', 'VAT IDs must start with two letters for the country, for example DE123456789. A German tax number (Steuernummer) belongs in the tax number field instead.', 'seller.vatId'],
  'BR-CO-10': ['The sum of the lines does not match the stated line total.', 'Add up the net amounts of all lines; the result must equal the “sum of lines” exactly.', 'lines'],
  'BR-CO-11': ['The stated discount total does not match the discounts listed.', 'The discount total must equal the sum of all document-level discounts.', 'allowances'],
  'BR-CO-12': ['The stated surcharge total does not match the surcharges listed.', 'The surcharge total must equal the sum of all document-level surcharges.', 'allowances'],
  'BR-CO-13': ['The total without VAT is calculated wrongly.', 'Total without VAT = sum of lines − discounts + surcharges.'],
  'BR-CO-14': ['The VAT total does not match the VAT summary.', 'The VAT total must equal the sum of the VAT amounts for each rate.'],
  'BR-CO-15': ['The total with VAT is calculated wrongly.', 'Total with VAT = total without VAT + VAT total.'],
  'BR-CO-16': ['The amount due is calculated wrongly.', 'Amount due = total with VAT − amount already paid (+ rounding).', 'prepaid'],
  'BR-CO-17': ['A VAT amount does not match its rate.', 'VAT amount = taxable amount × rate ÷ 100, rounded to two decimals.'],
  'BR-CO-18': ['The VAT summary is missing.', 'An invoice needs at least one VAT summary row, even when no VAT is charged.'],
  'BR-CO-19': ['A service period is given without dates.', 'Enter a start date, an end date, or both.', 'periodStart'],
  'BR-CO-20': ['A line period is given without dates.', 'Enter a start date, an end date, or both for the line period.'],
  'BR-CO-21': ['A discount has no reason.', 'Say what the discount is for.', 'allowances'],
  'BR-CO-22': ['A surcharge has no reason.', 'Say what the surcharge is for.', 'allowances'],
  'BR-CO-23': ['A line discount has no reason.', 'Say what the line discount is for.'],
  'BR-CO-24': ['A line surcharge has no reason.', 'Say what the line surcharge is for.'],
  'BR-CO-25': ['Money is due but there is neither a due date nor payment terms.', 'Enter a due date or write the payment terms.', 'dueDate'],
  'BR-CO-26': ['The seller cannot be identified.', 'Enter your VAT ID, your commercial register number, or a seller ID. A small business without a VAT ID can enter its tax number as the seller ID.', 'seller.id'],
  'BR-DE-1': ['Payment details are missing.', 'XRechnung requires payment instructions. Choose a payment method and enter the bank details.', 'payment.meansCode'],
  'BR-DE-2': ['Your contact details are missing.', 'XRechnung requires a seller contact: a name, a phone number and an email address.', 'seller.contactName'],
  'BR-DE-3': ['Your city is missing.', 'Enter the seller city.', 'seller.city'],
  'BR-DE-4': ['Your postcode is missing.', 'Enter the seller postcode.', 'seller.postcode'],
  'BR-DE-5': ['The contact person is missing.', 'Enter the name of a contact person or department at your business.', 'seller.contactName'],
  'BR-DE-6': ['The contact phone number is missing.', 'Enter a phone number for questions about the invoice.', 'seller.contactPhone'],
  'BR-DE-7': ['The contact email is missing.', 'Enter an email address for questions about the invoice.', 'seller.contactEmail'],
  'BR-DE-8': ['The customer’s city is missing.', 'Enter the buyer city.', 'buyer.city'],
  'BR-DE-9': ['The customer’s postcode is missing.', 'Enter the buyer postcode.', 'buyer.postcode'],
  'BR-DE-10': ['The delivery address has no city.', 'Add the city to the delivery address.'],
  'BR-DE-11': ['The delivery address has no postcode.', 'Add the postcode to the delivery address.'],
  'BR-DE-14': ['A VAT summary row has no rate.', 'Give each VAT summary row its percentage. Use 0 for exempt sales.'],
  'BR-DE-15': ['The buyer reference is missing.', 'XRechnung requires a buyer reference. For public authorities this is the Leitweg-ID they gave you; otherwise use the customer’s order or customer number.', 'buyerReference'],
  'BR-DE-16': ['No tax identification for the seller.', 'Enter your VAT ID or your tax number (Steuernummer).', 'seller.vatId'],
  'BR-DE-17': ['An unusual document type is used.', 'XRechnung expects one of: invoice (380), credit note (381), corrected invoice (384), partial invoice (326), self-billed invoice (389) or the construction invoice types 875–877.', 'typeCode'],
  'BR-DE-18': ['The cash discount (Skonto) line has the wrong format.', 'Write Skonto terms exactly like this, each on its own line: #SKONTO#TAGE=14#PROZENT=2.00#', 'paymentTerms'],
  'BR-DE-19': ['The IBAN looks wrong.', 'Check the IBAN for typing errors. Its check digits do not add up.', 'payment.iban'],
  'BR-DE-20': ['The customer’s IBAN for direct debit looks wrong.', 'Check the debited IBAN for typing errors. Its check digits do not add up.', 'payment.debtorIban'],
  'BR-DE-21': ['The file does not identify itself as XRechnung.', 'The specification identifier should be the XRechnung one. Export the invoice again in XRechnung format.'],
  'BR-DE-22': ['Two attachments have the same file name.', 'Give every attached file a different name.'],
  'BR-DE-23-a': ['Bank transfer is selected but the bank details are missing.', 'Enter the IBAN the customer should pay to.', 'payment.iban'],
  'BR-DE-23-b': ['Bank transfer is selected but card or direct-debit details are also given.', 'Keep only the bank account details for a transfer.', 'payment.meansCode'],
  'BR-DE-24-a': ['Card payment is selected but the card details are missing.', 'Add the (shortened) card number, or choose another payment method.', 'payment.meansCode'],
  'BR-DE-24-b': ['Card payment is selected but bank or direct-debit details are also given.', 'Keep only the card details for a card payment.', 'payment.meansCode'],
  'BR-DE-25-a': ['Direct debit is selected but the mandate details are missing.', 'Enter the mandate reference, your creditor ID and the customer’s IBAN.', 'payment.mandateId'],
  'BR-DE-25-b': ['Direct debit is selected but transfer or card details are also given.', 'Keep only the direct-debit details.', 'payment.meansCode'],
  'BR-DE-26': ['A corrected invoice does not say which invoice it corrects.', 'Enter the number of the original invoice.', 'precedingNumber'],
  'BR-DE-27': ['The phone number looks too short.', 'A phone number should contain at least three digits.', 'seller.contactPhone'],
  'BR-DE-28': ['The contact email address looks wrong.', 'Check the email address: it needs exactly one @ with text on both sides.', 'seller.contactEmail'],
  'BR-DE-30': ['Direct debit is missing your creditor ID.', 'Enter your SEPA creditor identifier (Gläubiger-ID).', 'payment.creditorId'],
  'BR-DE-31': ['Direct debit is missing the customer’s IBAN.', 'Enter the IBAN that will be debited.', 'payment.debtorIban'],
  'BR-DE-TMP-32': ['No delivery date or service period is given.', 'German VAT law expects the delivery or service date on an invoice. Add a delivery date or a service period.', 'deliveryDate'],
  'BR-DEX-02': ['A line total does not match its sub-lines.', 'The net amount of a line should equal the sum of the sub-lines below it.'],
  'PEPPOL-EN16931-R001': ['The business process is missing.', 'XRechnung files must name the business process (BT-23). Export the invoice again in XRechnung format.'],
  'PEPPOL-EN16931-R005': ['The VAT currency is the same as the invoice currency.', 'Only name a separate VAT currency if it differs from the invoice currency.'],
  'PEPPOL-EN16931-R008': ['The file contains an empty field.', 'Empty elements are not allowed. Remove the empty field or fill it in.'],
  'PEPPOL-EN16931-R010': ['The customer’s e-invoice address is missing.', 'XRechnung requires an electronic address for the buyer, usually an email address.', 'buyer.email'],
  'PEPPOL-EN16931-R020': ['Your e-invoice address is missing.', 'XRechnung requires an electronic address for the seller, usually an email address.', 'seller.email'],
  'PEPPOL-EN16931-R040': ['A discount or surcharge does not match its percentage.', 'Amount = base amount × percentage ÷ 100.'],
  'PEPPOL-EN16931-R041': ['A discount or surcharge has a percentage but no base amount.', 'Add the base amount the percentage applies to.'],
  'PEPPOL-EN16931-R042': ['A discount or surcharge has a base amount but no percentage.', 'Add the percentage, or remove the base amount.'],
  'PEPPOL-EN16931-R043': ['A discount or surcharge is marked ambiguously.', 'It must be clearly marked as either a discount (false) or a surcharge (true).'],
  'PEPPOL-EN16931-R044': ['A surcharge is applied at price level.', 'Only discounts are allowed inside a unit price. Put surcharges on the line or the document.'],
  'PEPPOL-EN16931-R046': ['A net price does not equal the gross price minus the discount.', 'Net unit price = gross unit price − price discount.'],
  'PEPPOL-EN16931-R053': ['More than one VAT total in the invoice currency.', 'State the VAT total in the invoice currency only once.'],
  'PEPPOL-EN16931-R054': ['The VAT total in the VAT currency is missing or duplicated.', 'When a separate VAT currency is named, give exactly one VAT total in that currency.'],
  'PEPPOL-EN16931-R055': ['The two VAT totals have opposite signs.', 'The VAT totals in both currencies must both be positive or both be negative.'],
  'PEPPOL-EN16931-R061': ['Direct debit is missing the mandate reference.', 'Enter the SEPA mandate reference.', 'payment.mandateId'],
  'PEPPOL-EN16931-R101': ['A document reference is used in the wrong place.', 'On a line, only an object identifier may be given as additional reference.'],
  'PEPPOL-EN16931-R110': ['A line period lies outside the invoice period.', 'Line period dates must fall within the invoice’s service period.'],
  'PEPPOL-EN16931-R111': ['A line period lies outside the invoice period.', 'Line period dates must fall within the invoice’s service period.'],
  'PEPPOL-EN16931-R120': ['A line amount does not match quantity × price.', 'Line net amount = quantity × unit price, minus line discounts, plus line surcharges.', 'lines'],
  'PEPPOL-EN16931-R121': ['A price base quantity is not positive.', 'The quantity a price refers to must be greater than zero.'],
  'PEPPOL-EN16931-R130': ['A unit differs between quantity and price.', 'The unit of the price base quantity must be the same as the unit of the invoiced quantity.'],
};

const CL = {
  'BR-CL-01': 'document type', 'BR-CL-03': 'currency', 'BR-CL-04': 'currency', 'BR-CL-05': 'VAT currency', 'BR-CL-06': 'VAT date code', 'BR-CL-07': 'object identifier scheme', 'BR-CL-08': 'note subject code',
  'BR-CL-10': 'identifier scheme', 'BR-CL-11': 'registration identifier scheme', 'BR-CL-13': 'item classification scheme', 'BR-CL-14': 'country', 'BR-CL-15': 'country', 'BR-CL-16': 'payment method', 'BR-CL-17': 'VAT category', 'BR-CL-18': 'VAT category',
  'BR-CL-19': 'discount reason code', 'BR-CL-20': 'surcharge reason code', 'BR-CL-21': 'item identifier scheme', 'BR-CL-22': 'VAT exemption reason code', 'BR-CL-23': 'unit of measure', 'BR-CL-24': 'attachment file type', 'BR-CL-25': 'electronic address scheme', 'BR-CL-26': 'delivery location scheme',
};
const CAT = { S: ['standard rate', 'S'], Z: ['zero rated', 'Z'], E: ['exempt', 'E'], AE: ['reverse charge', 'AE'], IC: ['intra-EU supply', 'K'], G: ['export', 'G'], O: ['outside the scope of VAT', 'O'], AF: ['Canary Islands tax (IGIC)', 'L'], AG: ['Ceuta/Melilla tax (IPSI)', 'M'] };

function vatFamily(fam, n) {
  const [name, code] = CAT[fam]; const std = fam === 'S' || fam === 'AF' || fam === 'AG';
  const who = `VAT category “${name}” (${code})`;
  switch (n) {
    case 1: return [`The VAT summary has no row for ${who}.`, `Lines, discounts or surcharges use ${who}, so the VAT summary needs ${std ? 'a row for each rate of that category' : 'exactly one row for it'}.`];
    case 2: case 3: case 4: {
      if (fam === 'O') return [`A VAT ID is given although the sale is outside the scope of VAT.`, 'For sales outside the scope of VAT, the invoice must not contain the seller’s or buyer’s VAT ID.', 'seller.vatId'];
      if (fam === 'AE' || fam === 'IC') return [`A tax identification is missing for ${who}.`, 'This kind of sale needs the seller’s VAT ID (or tax number) and the buyer’s VAT ID.', 'buyer.vatId'];
      return [`The seller’s tax identification is missing.`, `With ${who}, the invoice must contain the seller’s VAT ID or tax number.`, 'seller.vatId'];
    }
    case 5: case 6: case 7: {
      if (fam === 'O') return ['A VAT rate is given although the sale is outside the scope of VAT.', 'Remove the VAT rate from lines, discounts and surcharges in this category.', 'lines'];
      return std ? [`A ${name} line has a VAT rate of zero or less.`, 'Enter a VAT rate above 0, for example 19 or 7.', 'lines'] : [`A VAT rate above 0 is used with ${who}.`, 'The VAT rate for this category must be 0.', 'lines'];
    }
    case 8: return [`The taxable amount for ${who} is wrong.`, 'It must equal the sum of the line amounts in this category, minus discounts, plus surcharges.'];
    case 9: return std ? [`The VAT amount for ${who} does not match its rate.`, 'VAT amount = taxable amount × rate ÷ 100.'] : [`VAT is charged although the category is ${name}.`, 'The VAT amount for this category must be 0.'];
    case 10: return std ? ['An exemption reason is given for a taxed sale.', 'Remove the exemption reason: it only belongs to sales without VAT.'] : [`The reason why no VAT is charged is missing.`, fam === 'AE' ? 'Add the note “Reverse charge” (Steuerschuldnerschaft des Leistungsempfängers).' : 'State why no VAT is charged, for example the legal exemption that applies.', 'exemptionReason'];
    case 11: return fam === 'IC' ? ['An intra-EU supply has no delivery date.', 'Enter the delivery date or the service period.', 'deliveryDate'] : ['“Outside the scope of VAT” is mixed with other VAT categories.', 'An invoice outside the scope of VAT may contain only that category.', 'lines'];
    case 12: return fam === 'IC' ? ['An intra-EU supply has no delivery country.', 'Enter the address the goods were delivered to, with its country.'] : ['“Outside the scope of VAT” is mixed with other VAT categories.', 'An invoice outside the scope of VAT may contain only that category.', 'lines'];
    default: return ['“Outside the scope of VAT” is mixed with other VAT categories.', 'An invoice outside the scope of VAT may contain only that category.', 'lines'];
  }
}


// ---------- France: BR-FR rules (FNFE-MPE / AFNOR XP Z12-012, Flux 2). Keyed by the rule number without its field suffix.
const FR = {
  '01': ['An invoice number is longer than 35 characters.', 'French rules limit invoice numbers to 35 characters.', 'number'],
  '02': ['An invoice number contains characters France does not allow.', 'Use only letters, digits and the signs + - _ / , without spaces.', 'number'],
  '03': ['A date has an impossible year.', 'Dates must fall between the years 2000 and 2099.', 'issueDate'],
  '04': ['The document type is not on the French list.', 'Use invoice (380), credit note (381), corrected invoice (384), prepayment invoice (386) or self-billed invoice (389).', 'typeCode'],
  '05': ['A legal mention that every French invoice needs is missing.', 'French invoices must state the fixed €40 recovery fee (note PMT), the late-payment penalties (PMD) and the early-payment discount terms (AAB). This tool writes all three for you.', 'fr.pmt'],
  '06': ['A legal mention appears more than once.', 'Each of the coded notes PMT, PMD, AAB and TXD may appear only once.'],
  '08': ['The billing framework (cadre de facturation) is missing or not allowed.', 'Say what you are invoicing: goods (B1), services (S1) or both (M1). Use B2, S2 or M2 when the invoice is already paid.', 'fr.cadre'],
  '09': ['A SIRET does not match its SIREN.', 'A SIRET has 14 digits and starts with the 9 digits of the SIREN.', 'seller.siteId'],
  '10': ['Your SIREN is missing or is not 9 digits.', 'Enter your 9-digit SIREN.', 'seller.nationalId'],
  '11': ['The customer’s SIREN is missing or is not 9 digits.', 'For a French business customer, enter their 9-digit SIREN.', 'buyer.nationalId'],
  '12': ['The customer’s electronic invoicing address is missing.', 'Enter the address the customer registered in the French directory (annuaire). It usually starts with their SIREN.', 'buyer.email'],
  '13': ['Your electronic invoicing address is missing.', 'Enter the address you registered in the French directory (annuaire). It usually starts with your SIREN.', 'seller.email'],
  '15': ['A VAT category code is not allowed in France.', 'Use one of S, E, AE, K, G, O or Z.', 'lines'],
  '16': ['A VAT rate is not one France uses.', 'Use a French rate such as 20, 10, 5.5 or 2.1, written without the % sign.', 'lines'],
  '17': ['An attachment has a description France does not allow.', 'The attachment description must be one of the codes on the French list.'],
  '18': ['More than one attachment is marked as the readable copy.', 'Only one attached document may carry the description “LISIBLE”.'],
  '20': ['The invoice-routing note (BAR) has a value France does not allow.', 'The BAR note must be one of the listed values, for example B2B, B2BINT or B2C.'],
  '21': ['The customer’s electronic address has the wrong type for a French B2B invoice.', 'For invoices between French businesses the customer’s electronic address must use scheme 0225 (the French directory).', 'buyer.email'],
  '22': ['Your electronic address has the wrong type for a self-billed French invoice.', 'For self-billed invoices between French businesses the seller’s electronic address must use scheme 0225.', 'seller.email'],
  '23': ['An electronic address contains characters France does not allow.', 'Use only letters, digits and the signs - _ . in the electronic invoicing address.', 'buyer.email'],
  '24': ['A party identifier contains characters France does not allow.', 'Use only letters, digits and the signs - _ . in identifiers.'],
  '25': ['An electronic address is longer than 125 characters.', 'Shorten the electronic invoicing address.'],
  '26': ['A party identifier is longer than 100 characters.', 'Shorten the identifier.'],
  '27': ['An item attribute has no name.', 'Give each item attribute a name or a code.'],
  '28': ['An item attribute has no value, or two values.', 'Give each item attribute exactly one value.'],
  '29': ['An invoiced-object identifier type is used twice.', 'The identifier types AFL and AVV may each appear only once on the invoice.'],
  '30': ['An invoiced-object identifier type is used twice on a line.', 'The identifier types AFL and AVV may each appear only once on a line.'],
  '31': ['The invoice-routing note (BAR) appears with different values.', 'Keep a single BAR value on the invoice.'],
  '32': ['A SIREN is not 9 digits.', 'A SIREN has exactly 9 digits, without spaces.', 'seller.nationalId'],
  'CO-03': ['A global-discount credit note is missing its contract or period.', 'A credit note of type 262 needs a contract number and the billing period it covers.'],
  'CO-04': ['A corrected invoice does not point to exactly one earlier invoice.', 'Enter the number and date of the one invoice this document corrects.', 'precedingNumber'],
  'CO-05': ['A credit note does not say which invoice it refers to.', 'Enter the number and date of the original invoice, or the billing period the credit covers.', 'precedingNumber'],
  'CO-07': ['The due date is before the invoice date.', 'Choose a due date on or after the invoice date.', 'dueDate'],
  'CO-08': ['The billing framework and the document type contradict each other.', 'A final invoice after a deposit (B4, S4, M4) cannot itself be a deposit invoice.', 'fr.cadre'],
  'CO-09': ['The invoice is marked “already paid” but the paid amount differs from the total.', 'With framework B2, S2 or M2 the amount already paid must equal the total with VAT.', 'fr.cadre'],
  'CO-10': ['An identifier is given without saying what kind it is.', 'Every party identifier needs its scheme, for example 0009 for a SIRET.'],
  'CO-12': ['An invoice in a foreign currency lacks the VAT amount in euros.', 'French invoices not in EUR must also give the VAT total in EUR. This tool creates French invoices in EUR.', 'currency'],
  'CO-14': ['A member of a VAT group is missing its group note.', 'A seller identified with scheme 0231 needs the note that names the VAT group.'],
  'CO-15': ['A member of a VAT group is missing its tax representative.', 'Add the VAT group as tax representative with its VAT number.'],
  'DEC-01': ['An amount is not written the way France requires.', 'Amounts need a dot as decimal separator, at most 2 decimals and at most 19 digits.'],
  'DEC-02': ['A quantity is not written the way France requires.', 'Quantities may have at most 4 decimals and 19 digits.', 'lines'],
  'DEC-03': ['A unit price is negative or has too many decimals.', 'Unit prices must be positive, with at most 6 decimals. For a refund, issue a credit note.', 'lines'],
  'DEC-04': ['A VAT rate is not written the way France requires.', 'VAT rates must be positive numbers with at most 2 decimals, for example 20 or 5.5.', 'lines'],
};

// ---------- Peppol PINT (Australia / New Zealand). Shared rules ibr-0NN mirror the European BR-NN; national ones carry "aunz".
const PINT = {
  'ibr-066': ['More than one payment card is given.', 'Keep a single payment card entry.'],
  'ibr-067': ['More than one direct-debit mandate is given.', 'Keep a single mandate.'],
  'ibr-073': ['A date is not written as YYYY-MM-DD.', 'Write dates like 2026-10-08.'],
  'ibr-076': ['The business process is missing.', 'Peppol invoices must name the process “urn:peppol:bis:billing”. Export the invoice again.'],
  'ibr-079': ['The file contains an empty field.', 'Empty elements are not allowed. Remove the empty field or fill it in.'],
  'ibr-080': ['The customer’s Peppol address is missing.', 'Enter the customer’s business number (ABN in Australia, NZBN in New Zealand). Peppol uses it to deliver the invoice.', 'buyer.nationalId'],
  'ibr-081': ['Your Peppol address is missing.', 'Enter your business number (ABN). Peppol uses it as your sending address.', 'seller.nationalId'],
  'ibr-062': ['Your Peppol address has no type.', 'An electronic address needs a scheme, for example 0151 for an ABN.', 'seller.nationalId'],
  'ibr-063': ['The customer’s Peppol address has no type.', 'An electronic address needs a scheme, for example 0151 for an ABN.', 'buyer.nationalId'],
  'ibr-068': ['A GLN or NZBN has a wrong check digit.', 'Check the 13-digit number for typing errors.', 'buyer.nationalId'],
  'ibr-120': ['An ABN is not valid.', 'An ABN has 11 digits and a built-in check. Compare it with the ABN Lookup entry.', 'seller.nationalId'],
  'ibr-126': ['An amount is in a different currency from the invoice.', 'All amounts must use the invoice currency.', 'currency'],
  'ibr-cl-25': ['An electronic address uses a type Peppol does not know.', 'Use a registered scheme such as 0151 (ABN) or 0088 (NZBN / GLN). An email address cannot be a Peppol address.', 'buyer.nationalId'],
  'aligned-ibr-001-aunz': ['Your ABN is missing.', 'An Australian seller must give its ABN.', 'seller.nationalId'],
  'aligned-ibr-002-aunz': ['Your NZBN is missing.', 'A New Zealand seller must give its NZBN.', 'seller.nationalId'],
  'aligned-ibr-004-aunz': ['The customer’s ABN is missing.', 'For an Australian customer, enter their ABN.', 'buyer.nationalId'],
  'aligned-ibr-005-aunz': ['The customer’s NZBN is missing.', 'For a New Zealand customer, enter their 13-digit NZBN.', 'buyer.nationalId'],
  'aligned-ibrp-001-aunz': ['The file does not identify itself as a PINT A-NZ invoice.', 'The specification identifier must be “urn:peppol:pint:billing-1@aunz-1”. Export the invoice again.'],
  'aligned-ibrp-002': ['The business process is not the Peppol billing process.', 'It must read “urn:peppol:bis:billing”. Export the invoice again.'],
  'aligned-ibrp-003': ['Neither a buyer reference nor a purchase order number is given.', 'Enter the reference your customer asked for, or their purchase order number.', 'buyerReference'],
  'aligned-ibrp-016': ['Bank transfer is selected but the account is missing.', 'Enter the BSB and account number the customer should pay to.', 'payment.account'],
  'aligned-ibrp-018': ['Bank transfer is selected but the account is missing.', 'Enter the BSB and account number the customer should pay to.', 'payment.account'],
};
const PINT_ALIAS = { 'aligned-ibrp-004': 'PEPPOL-EN16931-R046', 'aligned-ibrp-054': 'PEPPOL-EN16931-R040', 'aligned-ibrp-055': 'PEPPOL-EN16931-R040', 'aligned-ibrp-057': 'PEPPOL-EN16931-R041', 'aligned-ibrp-058': 'PEPPOL-EN16931-R041',
  'aligned-ibrp-053': 'PEPPOL-EN16931-R120', 'aligned-ibrp-032-aunz': 'BR-32', 'aligned-ibrp-037-aunz': 'BR-37', 'aligned-ibrp-045': 'BR-45', 'aligned-ibrp-046': 'BR-46', 'aligned-ibrp-047-aunz': 'BR-47', 'aligned-ibrp-048-aunz': 'BR-48',
  'aligned-ibrp-051-aunz': 'BR-CO-17', 'aligned-ibrp-050-aunz': 'BR-CO-04', 'aligned-ibrp-061': 'BR-CO-25', 'aligned-ibrp-006': 'BR-CO-03', 'aligned-ibrp-005': 'BR-DEC-01', 'ibr-083': 'PEPPOL-EN16931-R044', 'ibr-082': 'PEPPOL-EN16931-R043',
  'ibr-084': 'PEPPOL-EN16931-R055', 'ibr-085': 'PEPPOL-EN16931-R110', 'ibr-086': 'PEPPOL-EN16931-R111', 'ibr-087': 'PEPPOL-EN16931-R121', 'ibr-088': 'PEPPOL-EN16931-R130', 'ibr-077': 'PEPPOL-EN16931-R005' };
// the European id that carries the same meaning as a PINT id, if any
function pintAlias(id) {
  if (PINT_ALIAS[id]) return PINT_ALIAS[id];
  let m;
  if ((m = /^ibr-0(\d\d)$/.exec(id)) && Number(m[1]) <= 65) return 'BR-' + m[1];
  if ((m = /^ibr-(co|cl|dec)-(\d+)$/.exec(id))) return `BR-${m[1].toUpperCase()}-${m[2]}`;
  if ((m = /^aligned-ibrp-(s|z|e|g|o)-(\d+)-aunz$/.exec(id))) return `BR-${m[1].toUpperCase()}-${m[2]}`;
  return null;
}
const gst = e => ({ ...e, title: e.title.replace(/\bVAT\b/g, 'GST'), fix: e.fix.replace(/\bVAT ID\b/g, 'ABN').replace(/\bVAT\b/g, 'GST').replace(/, for example 19 or 7/, ', for example 10').replace(/IBAN/g, 'account number') });

export function explain(id, officialText = '') {
  if (/^(ibr-|aligned-ibr)/.test(id)) {
    if (PINT[id]) return { title: PINT[id][0], fix: PINT[id][1], field: PINT[id][2] || null };
    const alias = pintAlias(id);
    if (alias) { const e = explain(alias, officialText); if (e.fix || R[alias]) return gst(e); }
    const text = officialText.replace(/^\s*\[[^\]]+\]\s*-?\s*/, '').replace(/\s*\(ib[tg]-[0-9-]+(, ?ib[tg]-[0-9-]+)*\)/g, '').trim();
    return { title: text || 'A rule of the Peppol invoice standard is not met.', fix: '', field: null };
  }
  if (/^BR-FR-/.test(id)) {
    const k = (/^BR-FR-((?:CO|DEC|MV|BD)-\d+|\d+)/.exec(id) || [])[1];
    if (k && FR[k]) return { title: FR[k][0], fix: FR[k][1], field: FR[k][2] || null };
    if (k && /^(MV|BD)-/.test(k)) return { title: 'A rule for multi-vendor or two-way invoices is not met.', fix: 'These rules apply only to the special billing frameworks S8, B8, M8 and S9, B9, M9. For an ordinary sale choose B1, S1 or M1.', field: 'fr.cadre' };
    return { title: 'A French e-invoicing rule is not met.', fix: 'See the official rule text below.', field: null };
  }
  const key = R[id] ? id : id.replace(/(R\d{3})-\d+$/, '$1'); // Peppol rules that appear twice carry a "-1" / "-2" suffix
  if (R[key]) return { title: R[key][0], fix: R[key][1], field: R[key][2] || null };
  let m;
  if (CL[id]) return { title: `A ${CL[id]} code is not on the official list.`, fix: `Use a valid ${CL[id]} code. ${id === 'BR-CL-23' ? 'Common units: C62 or H87 (piece), HUR (hour), DAY, KGM, MTR, LTR.' : id === 'BR-CL-14' || id === 'BR-CL-15' ? 'Countries use two letters, for example DE, AT or FR.' : ''}`.trim(), field: id === 'BR-CL-23' ? 'lines' : null };
  if ((m = /^BR-DEC-(\d+)$/.exec(id))) return { title: 'An amount has more than two decimal places.', fix: 'Round all amounts and totals to two decimals. Unit prices and quantities may keep more.', field: null };
  if ((m = /^BR-(S|Z|E|AE|IC|G|O|AF|AG)-(\d+)$/.exec(id))) { const [title, fix, field] = vatFamily(m[1], Number(m[2])); return { title, fix, field: field || null }; }
  if (/^BR-B-/.test(id)) return { title: 'Italian “split payment” VAT is used incorrectly.', fix: 'Split payment applies only to domestic Italian invoices and cannot be mixed with standard-rated lines.', field: null };
  const official = officialText.replace(/^\s*\[[^\]]+\]\s*-?\s*/, '').trim();
  if (/^(CII-SR|UBL-CR|UBL-SR)-/.test(id)) return { title: official || 'The file uses a field in a way the European standard does not allow.', fix: 'This rule is about how the data is written into the file, not about the invoice content. The program that created the file needs to export it differently.', field: null };
  if (/^(CII-DT|UBL-DT)-/.test(id)) return { title: official || 'A field carries an attribute the European standard does not allow.', fix: 'The program that created the file needs to leave this attribute out.', field: null };
  if (/^BR-DE-CVD/.test(id)) return { title: 'A requirement for clean-vehicle invoices (CVD) is not met.', fix: 'See the official rule text below.', field: null };
  if (/^BR-DEX/.test(id)) return { title: 'A requirement of the XRechnung extension is not met.', fix: 'See the official rule text below.', field: null };
  if (/^BR-TMP|^BR-DE-TMP/.test(id)) return { title: 'A temporary XRechnung check was triggered.', fix: 'See the official rule text below.', field: null };
  // fall back to the official wording with the rule number stripped
  const clean = officialText.replace(/^\s*\[[^\]]+\]\s*-?\s*/, '').trim();
  return { title: clean || 'A rule of the invoice standard is not met.', fix: '', field: null };
}

export const FIELD_LABEL = {
  number: 'Invoice number', issueDate: 'Invoice date', typeCode: 'Document type', currency: 'Currency', dueDate: 'Due date', buyerReference: 'Buyer reference', paymentTerms: 'Payment terms',
  'seller.name': 'Your business name', 'seller.id': 'Seller ID', 'seller.street': 'Your street', 'seller.postcode': 'Your postcode', 'seller.city': 'Your city', 'seller.country': 'Your country', 'seller.vatId': 'Your VAT ID', 'seller.taxNumber': 'Your tax number', 'seller.email': 'Your e-invoice email',
  'seller.contactName': 'Contact person', 'seller.contactPhone': 'Contact phone', 'seller.contactEmail': 'Contact email',
  'buyer.name': 'Customer name', 'buyer.street': 'Customer street', 'buyer.postcode': 'Customer postcode', 'buyer.city': 'Customer city', 'buyer.country': 'Customer country', 'buyer.vatId': 'Customer VAT ID', 'buyer.email': 'Customer e-invoice email',
  'payment.meansCode': 'Payment method', 'payment.iban': 'IBAN', 'payment.mandateId': 'Mandate reference', 'payment.creditorId': 'Creditor ID', 'payment.debtorIban': 'Customer IBAN',
  'seller.nationalId': 'Your business number', 'seller.siteId': 'Your SIRET', 'buyer.nationalId': 'Customer business number', 'buyer.siteId': 'Customer SIRET', 'fr.cadre': 'What you are invoicing', 'fr.pmt': 'Legal mentions', 'payment.account': 'Account number', 'payment.bsb': 'BSB',
  deliveryDate: 'Delivery date', periodStart: 'Service period', precedingNumber: 'Original invoice number', exemptionReason: 'Reason for no VAT', prepaid: 'Already paid', lines: 'Invoice lines', allowances: 'Discounts and surcharges',
};
